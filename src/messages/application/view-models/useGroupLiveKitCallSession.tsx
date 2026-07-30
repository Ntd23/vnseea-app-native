// Description: Owns app-level LiveKit group call sessions so group calls survive navigation changes.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  AudioSession,
  RoomContext,
  useLocalParticipant,
  useRemoteParticipants,
} from '@livekit/react-native';
import {
  ConnectionState,
  MediaDeviceFailure,
  ParticipantEvent,
  Room,
  RoomEvent,
  Track,
  type DisconnectReason,
  type Participant,
} from 'livekit-client';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import {
  requestCameraPermission,
  requestGroupVideoCallPermissions,
} from '../../../shared-kernel/application/utils/microphonePermission';
import type {
  GroupLiveKitCallType,
  GroupLiveKitCallRouteParams,
  GroupLiveKitGroup,
  GroupLiveKitJoinPayload,
  GroupLiveKitParticipant,
  IncomingGroupLiveKitCall,
} from '../../domain/types/groupCall.types';
import {
  createNativeGroupCallUuid,
  displayNativeIncomingGroupCall,
  endNativeCall,
  markNativeCallConnected,
  startNativeOutgoingGroupCall,
  usesNativeCallUi,
} from '../../infrastructure/calls/nativeCallService';
import {
  onLiveKitGroupCallClosed,
  onLiveKitGroupCallSync,
  type GroupLiveKitCallRealtimeEvent,
} from '../../infrastructure/realtime/liveKitCallRealtime';
import { createGroupLiveKitCallRepository } from '../../infrastructure/repositories/ApiGroupLiveKitCallRepository';
import {
  prepareIosCallAudioGate,
  releaseIosCallAudio,
} from '../livekit/iosCallAudioLifecycle';
import {
  applyCallAudioOutputMode,
  CALL_AUDIO_CAPTURE_DEFAULTS,
  configureCallAudioSession,
  defaultCallAudioOutputMode,
  resetCallRemoteAudioVolume,
  setRemoteAudioTrackOutputMode,
  type CallAudioOutputMode,
} from '../livekit/callAudioRouting';
import {
  areGroupParticipantListsEqual,
  mergeGroupParticipantMetadata,
  reconcileLiveKitParticipants,
} from '../livekit/groupCallParticipantState';
import { createRemoteTrackSubscriptionCoordinator } from '../livekit/remoteTrackSubscriptionCoordinator';

type GroupCallPhase =
  | 'initializing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';
type GroupCallFinishReason =
  | 'local_control'
  | 'native_end'
  | 'realtime_closed'
  | 'sync_inactive'
  | 'connect_failure'
  | 'provider_unmount';
type GroupLiveKitCallSession = {
  callId: string;
  groupId: string;
  callType: GroupLiveKitCallType;
  direction: GroupLiveKitCallRouteParams['direction'];
  group: GroupLiveKitGroup;
  nativeCallUuid: string;
  phase: GroupCallPhase;
  payload: GroupLiveKitJoinPayload | null;
  participants: GroupLiveKitParticipant[];
  error: string;
  mediaErrorText: string;
  deliveryWarningText: string;
  isMinimized: boolean;
  hasMediaPermissions: boolean | null;
  hasCameraPermission: boolean;
  startedAt: number;
  elapsedSeconds: number;
  isLocalMicrophoneEnabled: boolean;
  isLocalCameraEnabled: boolean;
  localCameraFacingMode: 'user' | 'environment';
  audioOutputMode: CallAudioOutputMode;
};

type GroupLiveKitMediaController = {
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
};

type StartGroupCallParams = {
  groupId: string;
  groupName?: string;
  groupAvatar?: string;
};

type GroupLiveKitCallSessionContextValue = {
  session: GroupLiveKitCallSession | null;
  activeRoom: Room | null;
  statusText: string;
  isActive: boolean;
  startGroupCall: (params: StartGroupCallParams) => void;
  answerIncomingGroupCall: (call: IncomingGroupLiveKitCall) => void;
  ensureSessionFromRoute: (params: GroupLiveKitCallRouteParams) => void;
  minimizeCall: () => void;
  restoreCallRoom: () => void;
  leaveCall: (reason?: GroupCallFinishReason) => Promise<void>;
  declineIncomingGroupCall: (call: IncomingGroupLiveKitCall) => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
  setAudioOutputMode: (mode: CallAudioOutputMode) => Promise<void>;
  getCandidates: () => Promise<GroupLiveKitParticipant[]>;
  addMembers: (userIds: string[]) => Promise<string[]>;
};

const GROUP_SYNC_INTERVAL_MS = 3_000;
const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: { pixelDensity: 'screen' },
  dynacast: true,
  singlePeerConnection: false,
  audioCaptureDefaults: CALL_AUDIO_CAPTURE_DEFAULTS,
} as const;
const LIVEKIT_CONNECT_OPTIONS = { autoSubscribe: true } as const;
const CALL_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';

const GroupLiveKitCallSessionContext =
  createContext<GroupLiveKitCallSessionContextValue | null>(null);

function disconnectRoomSafely(room: Room | null) {
  if (!room || room.state === ConnectionState.Disconnected) return;
  try {
    room.disconnect(true).catch(() => undefined);
  } catch {
    // Ignore disconnect races while LiveKit is still connecting.
  }
}

function isFinalPhase(phase: GroupCallPhase) {
  return phase === 'ended' || phase === 'error';
}

function resolveGroupElapsedSeconds(timing: {
  elapsedSeconds?: number;
  elapsedMs?: number;
  serverNow?: number;
  serverNowMs?: number;
  startedAt?: number;
  startedAtMs?: number;
}) {
  if (
    typeof timing.elapsedMs === 'number' &&
    Number.isFinite(timing.elapsedMs) &&
    timing.elapsedMs >= 0
  ) {
    return Math.floor(timing.elapsedMs / 1000);
  }
  if (
    typeof timing.startedAtMs === 'number' &&
    timing.startedAtMs > 0 &&
    typeof timing.serverNowMs === 'number' &&
    timing.serverNowMs > 0
  ) {
    return Math.floor(
      Math.max(0, timing.serverNowMs - timing.startedAtMs) / 1000,
    );
  }
  if (
    typeof timing.elapsedSeconds === 'number' &&
    Number.isFinite(timing.elapsedSeconds) &&
    timing.elapsedSeconds >= 0
  ) {
    return Math.floor(timing.elapsedSeconds);
  }
  if (
    typeof timing.startedAt === 'number' &&
    timing.startedAt > 0 &&
    typeof timing.serverNow === 'number' &&
    timing.serverNow > 0
  ) {
    return Math.max(0, Math.floor(timing.serverNow - timing.startedAt));
  }
  return 0;
}

function localStartedAtFromTiming(timing: {
  elapsedSeconds?: number;
  elapsedMs?: number;
  serverNow?: number;
  serverNowMs?: number;
  startedAt?: number;
  startedAtMs?: number;
}) {
  return Date.now() - resolveGroupElapsedSeconds(timing) * 1000;
}

function durationSeconds(startedAt: number) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function formatPermissionError() {
  return 'Bạn cần cấp quyền mic để tham gia cuộc gọi nhóm.';
}

function logGroupCallDebug(event: string, data: Record<string, unknown> = {}) {
  console.log(
    CALL_DEBUG_PREFIX,
    JSON.stringify({ event, at: new Date().toISOString(), ...data }),
  );
}

type GroupCameraMediaTrack = {
  mediaStream?: {
    toURL?: () => string;
  };
};

function getGroupLocalCameraState(room: Room | null) {
  const publication = room?.localParticipant.getTrackPublication(
    Track.Source.Camera,
  );
  const track = publication?.track as GroupCameraMediaTrack | undefined;
  let mediaStreamUrl = '';
  try {
    mediaStreamUrl = track?.mediaStream?.toURL?.() ?? '';
  } catch {
    mediaStreamUrl = '';
  }

  return {
    trackSid: publication?.trackSid ?? '',
    hasTrack: Boolean(track),
    hasMediaStream: Boolean(mediaStreamUrl),
    isMuted: publication?.isMuted ?? true,
  };
}

function logGroupSessionFinishRequested(
  reason: GroupCallFinishReason,
  session: GroupLiveKitCallSession | null,
  room: Room | null,
) {
  const localCamera = getGroupLocalCameraState(room);
  logGroupCallDebug('group_session_finish_requested', {
    reason,
    callId: session?.callId ?? '',
    callUuid: session?.nativeCallUuid ?? '',
    phase: session?.phase ?? 'none',
    roomConnectionState: room?.state ?? ConnectionState.Disconnected,
    localParticipantCount: room ? 1 : 0,
    remoteParticipantCount: room?.remoteParticipants.size ?? 0,
    localCameraTrackSid: localCamera.trackSid,
    localCameraHasTrack: localCamera.hasTrack,
    localCameraHasMediaStream: localCamera.hasMediaStream,
    localCameraMuted: localCamera.isMuted,
  });
}

type GroupStatsTrack = {
  getRTCStatsReport?: () => Promise<unknown>;
};

type GroupMediaStats = {
  packets: number;
  bytes: number;
  audioLevel: number;
  totalAudioEnergy: number;
  frames: number;
};

function groupStatsEntries(report: unknown) {
  const entries: Record<string, unknown>[] = [];
  const iterable = report as
    | { forEach?: (handler: (value: unknown) => void) => void }
    | undefined;
  if (typeof iterable?.forEach === 'function') {
    iterable.forEach(value => {
      if (value && typeof value === 'object') {
        entries.push(value as Record<string, unknown>);
      }
    });
    return entries;
  }
  if (Array.isArray(report)) {
    return report.filter(value => value && typeof value === 'object') as Record<
      string,
      unknown
    >[];
  }
  return entries;
}

function groupStatsNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function summarizeGroupTrackStats(
  report: unknown,
  kind: 'audio' | 'video',
  direction: 'local_outbound' | 'remote_inbound',
): GroupMediaStats {
  const summary: GroupMediaStats = {
    packets: 0,
    bytes: 0,
    audioLevel: 0,
    totalAudioEnergy: 0,
    frames: 0,
  };
  const rtpType =
    direction === 'local_outbound' ? 'outbound-rtp' : 'inbound-rtp';

  groupStatsEntries(report).forEach(record => {
    const recordKind = String(record.kind ?? record.mediaType ?? '');
    if (recordKind !== kind) return;
    if (record.type === rtpType) {
      summary.packets += groupStatsNumber(
        record,
        direction === 'local_outbound' ? 'packetsSent' : 'packetsReceived',
      );
      summary.bytes += groupStatsNumber(
        record,
        direction === 'local_outbound' ? 'bytesSent' : 'bytesReceived',
      );
      summary.frames += groupStatsNumber(
        record,
        direction === 'local_outbound' ? 'framesEncoded' : 'framesDecoded',
      );
      summary.frames += groupStatsNumber(
        record,
        direction === 'local_outbound' ? 'framesSent' : 'framesReceived',
      );
    }
    summary.audioLevel = Math.max(
      summary.audioLevel,
      groupStatsNumber(record, 'audioLevel'),
    );
    summary.totalAudioEnergy += groupStatsNumber(record, 'totalAudioEnergy');
  });
  return summary;
}

function startGroupMediaStatsProbe(room: Room, callId: string) {
  let sample = 0;
  let stopped = false;

  const collectTrack = async (
    track: GroupStatsTrack | undefined,
    kind: 'audio' | 'video',
    direction: 'local_outbound' | 'remote_inbound',
    participantIdentity: string,
    trackSid: string,
  ) => {
    const report = await track?.getRTCStatsReport?.().catch(() => undefined);
    const stats = summarizeGroupTrackStats(report, kind, direction);
    logGroupCallDebug(
      kind === 'audio'
        ? 'group_audio_stats_compact'
        : 'group_video_stats_compact',
      {
        callId,
        sample,
        direction,
        participantIdentity,
        trackSid,
        packets: stats.packets,
        bytes: stats.bytes,
        audioLevel: stats.audioLevel,
        totalAudioEnergy: stats.totalAudioEnergy,
        frames: stats.frames,
      },
    );
  };

  const collect = async () => {
    if (stopped || room.state === ConnectionState.Disconnected) return;
    sample += 1;
    const localIdentity = room.localParticipant.identity || 'local';
    const localMicrophone = room.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    const localCamera = room.localParticipant.getTrackPublication(
      Track.Source.Camera,
    );
    await collectTrack(
      localMicrophone?.track as GroupStatsTrack | undefined,
      'audio',
      'local_outbound',
      localIdentity,
      localMicrophone?.trackSid ?? '',
    );
    await collectTrack(
      localCamera?.track as GroupStatsTrack | undefined,
      'video',
      'local_outbound',
      localIdentity,
      localCamera?.trackSid ?? '',
    );
    for (const participant of room.remoteParticipants.values()) {
      const microphone = participant.getTrackPublication(
        Track.Source.Microphone,
      );
      const camera = participant.getTrackPublication(Track.Source.Camera);
      await collectTrack(
        microphone?.track as GroupStatsTrack | undefined,
        'audio',
        'remote_inbound',
        participant.identity,
        microphone?.trackSid ?? '',
      );
      await collectTrack(
        camera?.track as GroupStatsTrack | undefined,
        'video',
        'remote_inbound',
        participant.identity,
        camera?.trackSid ?? '',
      );
    }
  };

  collect().catch(() => undefined);
  const interval = setInterval(() => {
    collect().catch(() => undefined);
  }, 2_000);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

function exitGroupCallRoomIfFocused() {
  if (!navigationRef.isReady()) return;
  if (navigationRef.getCurrentRoute()?.name !== ROUTES.GROUP_CALL_ROOM) return;
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

function resolveStatusText(session: GroupLiveKitCallSession | null) {
  if (!session) return '';
  const statusMap: Record<GroupCallPhase, string> = {
    initializing: 'Đang chuẩn bị cuộc gọi nhóm...',
    connecting: '',
    connected: 'Đang trong cuộc gọi nhóm',
    ended: 'Cuộc gọi nhóm đã kết thúc',
    error: session.error || 'Không thể thực hiện cuộc gọi nhóm.',
  };
  return statusMap[session.phase];
}

function parseParticipantMetadata(participant: Participant) {
  try {
    const raw = JSON.parse(participant.metadata || '{}') as Record<
      string,
      unknown
    >;
    return {
      id: String(raw.user_id ?? participant.identity ?? ''),
      name: String(raw.name ?? participant.name ?? 'Người dùng'),
      avatar: String(raw.avatar ?? ''),
      username: String(raw.username ?? ''),
    };
  } catch {
    return {
      id: String(participant.identity ?? ''),
      name: String(participant.name ?? 'Người dùng'),
      avatar: '',
      username: '',
    };
  }
}

function buildLiveKitRoomParticipants(
  localParticipant: Participant,
  remoteParticipants: readonly Participant[],
  currentUserId: string,
  localMediaState?: {
    isMicrophoneEnabled: boolean;
    isCameraEnabled: boolean;
  },
): GroupLiveKitParticipant[] {
  const toGroupParticipant = (
    participant: Participant,
    isLocal: boolean,
  ): GroupLiveKitParticipant => {
    const metadata = parseParticipantMetadata(participant);
    const microphonePublication = participant.getTrackPublication(
      Track.Source.Microphone,
    );
    const cameraPublication = participant.getTrackPublication(
      Track.Source.Camera,
    );

    return {
      id: isLocal ? currentUserId || metadata.id : metadata.id,
      name: metadata.name,
      avatar: metadata.avatar,
      username: metadata.username,
      joinedAt: 0,
      isLocal,
      isMicrophoneMuted:
        isLocal && localMediaState
          ? !localMediaState.isMicrophoneEnabled
          : !microphonePublication || microphonePublication.isMuted,
      isCameraMuted:
        isLocal && localMediaState
          ? !localMediaState.isCameraEnabled
          : !cameraPublication || cameraPublication.isMuted,
    };
  };

  return [
    toGroupParticipant(localParticipant, true),
    ...remoteParticipants.map(participant =>
      toGroupParticipant(participant, false),
    ),
  ];
}

function mergeParticipants(
  current: GroupLiveKitParticipant[],
  patches: GroupLiveKitParticipant[],
) {
  const map = new Map(current.map(item => [item.id, item]));
  patches.forEach(item => {
    if (!item.id) return;
    map.set(item.id, {
      ...(map.get(item.id) ?? {}),
      ...item,
    });
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.isLocal) return -1;
    if (b.isLocal) return 1;
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });
}

function buildInitialSession(
  params: GroupLiveKitCallRouteParams,
): GroupLiveKitCallSession {
  const group = {
    id: params.groupId,
    name: params.groupName || 'Nhóm',
    avatar: params.groupAvatar || '',
  };
  return {
    callId: params.callId ?? '',
    groupId: params.groupId,
    callType: 'video',
    direction: params.direction,
    group,
    nativeCallUuid: params.callId
      ? createNativeGroupCallUuid(params.callId)
      : '',
    phase: 'initializing',
    payload: null,
    participants: [],
    error: '',
    mediaErrorText: '',
    deliveryWarningText: '',
    isMinimized: false,
    hasMediaPermissions: null,
    hasCameraPermission: false,
    startedAt: 0,
    elapsedSeconds: 0,
    isLocalMicrophoneEnabled: true,
    isLocalCameraEnabled: false,
    localCameraFacingMode: 'user',
    audioOutputMode: defaultCallAudioOutputMode('video'),
  };
}

function GroupLiveKitMediaBridge({
  currentUserId,
  onParticipants,
  onMediaState,
  onController,
}: {
  currentUserId: string;
  onParticipants: (items: GroupLiveKitParticipant[]) => void;
  onMediaState: (state: Partial<GroupLiveKitCallSession>) => void;
  onController: (controller: GroupLiveKitMediaController | null) => void;
}) {
  const cameraFacingModeRef = useRef<'user' | 'environment'>('user');
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const publishParticipantMedia = useCallback(() => {
    const items = buildLiveKitRoomParticipants(
      localParticipant,
      remoteParticipants,
      currentUserId,
      { isMicrophoneEnabled, isCameraEnabled },
    );

    onParticipants(items);
    onMediaState({
      isLocalMicrophoneEnabled: isMicrophoneEnabled,
      isLocalCameraEnabled: isCameraEnabled,
    });
  }, [
    currentUserId,
    isCameraEnabled,
    isMicrophoneEnabled,
    localParticipant,
    onMediaState,
    onParticipants,
    remoteParticipants,
  ]);

  useEffect(() => {
    publishParticipantMedia();
  }, [publishParticipantMedia]);

  useEffect(() => {
    const participants = [localParticipant, ...remoteParticipants];
    participants.forEach(participant => {
      participant
        .on(ParticipantEvent.TrackMuted, publishParticipantMedia)
        .on(ParticipantEvent.TrackUnmuted, publishParticipantMedia)
        .on(ParticipantEvent.TrackPublished, publishParticipantMedia)
        .on(ParticipantEvent.TrackUnpublished, publishParticipantMedia)
        .on(ParticipantEvent.TrackSubscribed, publishParticipantMedia)
        .on(ParticipantEvent.TrackUnsubscribed, publishParticipantMedia);
    });
    return () => {
      participants.forEach(participant => {
        participant
          .off(ParticipantEvent.TrackMuted, publishParticipantMedia)
          .off(ParticipantEvent.TrackUnmuted, publishParticipantMedia)
          .off(ParticipantEvent.TrackPublished, publishParticipantMedia)
          .off(ParticipantEvent.TrackUnpublished, publishParticipantMedia)
          .off(ParticipantEvent.TrackSubscribed, publishParticipantMedia)
          .off(ParticipantEvent.TrackUnsubscribed, publishParticipantMedia);
      });
    };
  }, [localParticipant, publishParticipantMedia, remoteParticipants]);

  useEffect(() => {
    onController({
      toggleMic: async () => {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      },
      toggleCamera: async () => {
        const nextEnabled = !isCameraEnabled;
        if (nextEnabled) {
          const cameraGranted = await requestCameraPermission();
          onMediaState({
            hasCameraPermission: cameraGranted,
            mediaErrorText: cameraGranted
              ? ''
              : 'Bạn cần cấp quyền camera để bật video.',
          });
          if (!cameraGranted) return;
        }
        await localParticipant.setCameraEnabled(
          nextEnabled,
          nextEnabled ? { facingMode: cameraFacingModeRef.current } : undefined,
        );
      },
      switchCamera: async () => {
        if (!isCameraEnabled) {
          const cameraGranted = await requestCameraPermission();
          onMediaState({
            hasCameraPermission: cameraGranted,
            mediaErrorText: cameraGranted
              ? ''
              : 'Bạn cần cấp quyền camera để bật video.',
          });
          if (!cameraGranted) return;
          await localParticipant.setCameraEnabled(true, {
            facingMode: cameraFacingModeRef.current,
          });
        }
        const publication = localParticipant.getTrackPublication(
          Track.Source.Camera,
        );
        const localCameraTrack = publication?.track as
          | {
              restartTrack?: (options?: {
                facingMode?: 'user' | 'environment';
              }) => Promise<void>;
              mediaStreamTrack?: { _switchCamera?: () => void };
            }
          | undefined;
        if (!localCameraTrack) return;

        const nextFacingMode =
          cameraFacingModeRef.current === 'user' ? 'environment' : 'user';
        let restarted = false;
        if (localCameraTrack.restartTrack) {
          await localCameraTrack
            .restartTrack({ facingMode: nextFacingMode })
            .then(() => {
              restarted = true;
            })
            .catch(() => undefined);
        }
        if (!restarted) {
          localCameraTrack.mediaStreamTrack?._switchCamera?.();
        }
        cameraFacingModeRef.current = nextFacingMode;
        onMediaState({ localCameraFacingMode: nextFacingMode });
        publishParticipantMedia();
      },
    });
    return () => onController(null);
  }, [
    isCameraEnabled,
    isMicrophoneEnabled,
    localParticipant,
    onController,
    onMediaState,
    publishParticipantMedia,
  ]);

  return null;
}

const ActiveGroupLiveKitRoom = React.memo(function ActiveGroupLiveKitRoom({
  room,
  currentUserId,
  onParticipants,
  onMediaState,
  onController,
}: {
  room: Room;
  currentUserId: string;
  onParticipants: (items: GroupLiveKitParticipant[]) => void;
  onMediaState: (state: Partial<GroupLiveKitCallSession>) => void;
  onController: (controller: GroupLiveKitMediaController | null) => void;
}) {
  return (
    <RoomContext.Provider value={room}>
      <GroupLiveKitMediaBridge
        currentUserId={currentUserId}
        onParticipants={onParticipants}
        onMediaState={onMediaState}
        onController={onController}
      />
    </RoomContext.Provider>
  );
});

export function GroupLiveKitCallSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useMemo(() => createGroupLiveKitCallRepository(), []);
  const [session, setSession] = useState<GroupLiveKitCallSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const sessionRef = useRef<GroupLiveKitCallSession | null>(null);
  const activeRoomRef = useRef<Room | null>(null);
  const roomEventCleanupRef = useRef<(() => void) | null>(null);
  const subscriptionCoordinatorRef = useRef<ReturnType<
    typeof createRemoteTrackSubscriptionCoordinator
  > | null>(null);
  const mediaControllerRef = useRef<GroupLiveKitMediaController | null>(null);
  const audioOutputRequestIdRef = useRef(0);
  const audioOutputConfirmedModeRef = useRef<CallAudioOutputMode | null>(null);
  const audioOutputConfirmedCallIdRef = useRef('');
  const leaveSentRef = useRef(false);
  const joinedCallIdRef = useRef('');

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  const patchSession = useCallback(
    (patch: Partial<GroupLiveKitCallSession>) => {
      setSession(current => {
        if (!current) {
          sessionRef.current = current;
          return current;
        }
        const hasChanges = Object.entries(patch).some(
          ([key, value]) =>
            current[key as keyof GroupLiveKitCallSession] !== value,
        );
        if (!hasChanges) return current;

        const next = { ...current, ...patch };
        sessionRef.current = next;
        return next;
      });
    },
    [],
  );

  const patchParticipants = useCallback(
    (participants: GroupLiveKitParticipant[]) => {
      setSession(current => {
        if (!current) {
          sessionRef.current = current;
          return current;
        }
        const reconciledParticipants = reconcileLiveKitParticipants(
          current.participants,
          participants,
        );
        const hasRemoteParticipant = reconciledParticipants.some(
          participant => !participant.isLocal,
        );
        const nextDeliveryWarningText = hasRemoteParticipant
          ? ''
          : current.deliveryWarningText;
        if (
          areGroupParticipantListsEqual(
            current.participants,
            reconciledParticipants,
          ) &&
          nextDeliveryWarningText === current.deliveryWarningText
        ) {
          return current;
        }
        const next = {
          ...current,
          participants: reconciledParticipants,
          deliveryWarningText: nextDeliveryWarningText,
        };
        sessionRef.current = next;
        logGroupCallDebug('group_participant_media_state_changed', {
          callId: current.callId,
          participants: reconciledParticipants.map(item => ({
            id: item.id,
            isLocal: Boolean(item.isLocal),
            microphoneMuted: Boolean(item.isMicrophoneMuted),
            cameraMuted: Boolean(item.isCameraMuted),
          })),
        });
        return next;
      });
    },
    [],
  );

  const mergeServerParticipantMetadata = useCallback(
    (participants: GroupLiveKitParticipant[]) => {
      setSession(current => {
        if (!current) {
          sessionRef.current = current;
          return current;
        }
        const mergedParticipants = mergeGroupParticipantMetadata(
          current.participants,
          participants,
        );
        if (
          areGroupParticipantListsEqual(
            current.participants,
            mergedParticipants,
          )
        ) {
          return current;
        }
        const next = {
          ...current,
          participants: mergedParticipants,
        };
        sessionRef.current = next;
        logGroupCallDebug('group_server_metadata_merged', {
          callId: current.callId,
          participantIds: mergedParticipants.map(item => item.id),
        });
        return next;
      });
    },
    [],
  );

  const disconnectActiveRoom = useCallback(() => {
    subscriptionCoordinatorRef.current?.dispose();
    subscriptionCoordinatorRef.current = null;
    roomEventCleanupRef.current?.();
    roomEventCleanupRef.current = null;
    const room = activeRoomRef.current;
    activeRoomRef.current = null;
    setActiveRoom(null);
    disconnectRoomSafely(room);
  }, []);

  const finishSession = useCallback(
    (
      reason: GroupCallFinishReason,
      patch?: Partial<GroupLiveKitCallSession>,
    ) => {
      const current = sessionRef.current;
      logGroupSessionFinishRequested(reason, current, activeRoomRef.current);
      const isIosNativeCall =
        Platform.OS === 'ios' && usesNativeCallUi(current?.nativeCallUuid);
      if (isIosNativeCall && current?.nativeCallUuid) {
        endNativeCall(current.nativeCallUuid);
      }
      disconnectActiveRoom();
      resetCallRemoteAudioVolume();
      if (current) {
        releaseIosCallAudio(
          {
            owner: 'group-call',
            callId: current.callId,
            callType: 'video',
            callUuid: current.nativeCallUuid,
            roomName: current.payload?.call.roomName ?? '',
          },
          logGroupCallDebug,
        );
      }
      const stopAudioSession = !isIosNativeCall;
      if (stopAudioSession) {
        AudioSession.stopAudioSession().catch(() => undefined);
      }
      if (!isIosNativeCall && current?.nativeCallUuid) {
        endNativeCall(current.nativeCallUuid);
      }
      joinedCallIdRef.current = '';
      setSession(currentSession => {
        const next = currentSession
          ? {
              ...currentSession,
              ...patch,
              phase: patch?.phase ?? 'ended',
              payload: null,
              isMinimized: false,
            }
          : null;
        sessionRef.current = next;
        return next;
      });
      exitGroupCallRoomIfFocused();
    },
    [disconnectActiveRoom],
  );

  const cleanupFailedGroupCallStart = useCallback(() => {
    const current = sessionRef.current;
    logGroupSessionFinishRequested(
      'connect_failure',
      current,
      activeRoomRef.current,
    );
    const isIosCall = Platform.OS === 'ios';
    if (isIosCall && current?.nativeCallUuid) {
      endNativeCall(current.nativeCallUuid);
    }
    disconnectActiveRoom();
    resetCallRemoteAudioVolume();
    if (current) {
      releaseIosCallAudio(
        {
          owner: 'group-call',
          callId: current.callId,
          callType: 'video',
          callUuid: current.nativeCallUuid,
          roomName: current.payload?.call.roomName ?? '',
        },
        logGroupCallDebug,
      );
    }
    if (!isIosCall) {
      AudioSession.stopAudioSession().catch(() => undefined);
      if (current?.nativeCallUuid) endNativeCall(current.nativeCallUuid);
    }
    const joinedCallId = joinedCallIdRef.current;
    joinedCallIdRef.current = '';
    if (joinedCallId) {
      leaveSentRef.current = true;
      repository.leaveCall({ callId: joinedCallId }).catch(() => undefined);
    }
  }, [disconnectActiveRoom, repository]);

  const connectPayload = useCallback(
    async (callId: string, callUuid: string, cameraGranted: boolean) => {
      patchSession({ phase: 'connecting' });
      const payload = await repository.getJoinPayload({ callId });
      disconnectActiveRoom();
      const initialAudioOutputMode = defaultCallAudioOutputMode('video');
      await configureCallAudioSession(initialAudioOutputMode).catch(
        () => undefined,
      );

      try {
        await prepareIosCallAudioGate(
          {
            owner: 'group-call',
            callId,
            callType: 'video',
            callUuid,
            roomName: payload.call.roomName,
          },
          (event, data) => {
            const groupEvent = event.endsWith('_failed')
              ? 'group_native_audio_gate_failed'
              : event.endsWith('_pass')
              ? 'group_native_audio_gate_pass'
              : event;
            logGroupCallDebug(groupEvent, data);
          },
        );
      } catch (error) {
        if (callUuid) endNativeCall(callUuid);
        throw error;
      }

      if (Platform.OS !== 'ios' || !usesNativeCallUi(callUuid)) {
        await AudioSession.startAudioSession().catch(() => undefined);
      }

      await repository.joinCall({ callId });
      joinedCallIdRef.current = callId;

      const nextRoom = new Room(LIVEKIT_ROOM_OPTIONS);
      const handleDisconnected = (reason?: DisconnectReason) => {
        if (leaveSentRef.current) return;
        patchSession({
          mediaErrorText: reason
            ? `Kết nối media bị ngắt: ${String(reason)}.`
            : 'Kết nối media bị ngắt.',
        });
      };
      const handleMediaDeviceError = (error: Error) => {
        const failure = MediaDeviceFailure.getFailure(error);
        patchSession({
          mediaErrorText: failure
            ? `Không mở được thiết bị media: ${String(failure)}.`
            : 'Không mở được camera hoặc micro.',
        });
      };

      nextRoom
        .on(RoomEvent.Disconnected, handleDisconnected)
        .on(RoomEvent.MediaDevicesError, handleMediaDeviceError);
      let stopMediaStatsProbe: () => void = () => undefined;

      const subscriptionCoordinator = createRemoteTrackSubscriptionCoordinator({
        room: nextRoom,
        autoSubscribe: LIVEKIT_CONNECT_OPTIONS.autoSubscribe,
        sources: [Track.Source.Microphone, Track.Source.Camera],
        timeoutMs: 3_000,
        log: (event, context) => {
          logGroupCallDebug(event, {
            callId,
            callUuid,
            participantIdentity: context.participant.identity,
            participantSid: context.participant.sid,
            trackSid: context.publication.trackSid,
            source: context.publication.source,
            isSubscribed: context.publication.isSubscribed,
            retryAttempt: context.retryAttempt,
          });
        },
        onSubscribed: context => {
          setRemoteAudioTrackOutputMode(
            context.publication.track,
            sessionRef.current?.audioOutputMode ?? initialAudioOutputMode,
          );
          logGroupCallDebug('group_remote_track_subscribed', {
            callId,
            participantIdentity: context.participant.identity,
            trackSid: context.publication.trackSid,
            source: context.publication.source,
          });
          patchSession({ mediaErrorText: '' });
        },
        onTerminalFailure: context => {
          const mediaName =
            context.publication.source === Track.Source.Microphone
              ? 'âm thanh'
              : 'video';
          patchSession({
            mediaErrorText: `Chưa nhận được ${mediaName} từ ${
              context.participant.name || 'một thành viên'
            }.`,
          });
        },
      });
      subscriptionCoordinator.start();
      subscriptionCoordinatorRef.current = subscriptionCoordinator;
      roomEventCleanupRef.current = () => {
        stopMediaStatsProbe();
        nextRoom
          .off(RoomEvent.Disconnected, handleDisconnected)
          .off(RoomEvent.MediaDevicesError, handleMediaDeviceError);
      };

      activeRoomRef.current = nextRoom;
      const elapsedSeconds = resolveGroupElapsedSeconds({
        elapsedSeconds: payload.elapsedSeconds,
        elapsedMs: payload.elapsedMs,
        serverNow: payload.call.serverNow,
        serverNowMs: payload.call.serverNowMs,
        startedAt: payload.call.startedAt,
        startedAtMs: payload.call.startedAtMs,
      });
      setSession(current => {
        const next: GroupLiveKitCallSession | null = current
          ? {
              ...current,
              callId,
              callType: 'video',
              groupId: payload.group.id || current.groupId,
              group: payload.group,
              payload,
              nativeCallUuid: callUuid,
              participants: mergeParticipants(payload.participants, [
                {
                  ...payload.currentUser,
                  joinedAt: 0,
                  isLocal: true,
                },
              ]),
              startedAt: localStartedAtFromTiming({
                elapsedSeconds,
                elapsedMs: payload.elapsedMs,
                serverNow: payload.call.serverNow,
                serverNowMs: payload.call.serverNowMs,
                startedAt: payload.call.startedAt,
                startedAtMs: payload.call.startedAtMs,
              }),
              elapsedSeconds,
              phase: 'connecting',
              isMinimized: false,
            }
          : current;
        sessionRef.current = next;
        return next;
      });
      try {
        logGroupCallDebug('group_room_connect_start', {
          callId,
          callUuid,
          roomName: payload.call.roomName,
          autoSubscribe: LIVEKIT_CONNECT_OPTIONS.autoSubscribe,
          adaptiveStream: LIVEKIT_ROOM_OPTIONS.adaptiveStream,
          dynacast: LIVEKIT_ROOM_OPTIONS.dynacast,
          singlePeerConnection: LIVEKIT_ROOM_OPTIONS.singlePeerConnection,
        });
        await nextRoom.connect(
          payload.wsUrl,
          payload.token,
          LIVEKIT_CONNECT_OPTIONS,
        );
        await applyCallAudioOutputMode(
          nextRoom,
          sessionRef.current?.audioOutputMode ?? initialAudioOutputMode,
        );
        subscriptionCoordinator.requestExisting();
        await nextRoom.localParticipant.setMicrophoneEnabled(true);
        let cameraEnabled = false;
        if (cameraGranted) {
          await nextRoom.localParticipant
            .setCameraEnabled(true, { facingMode: 'user' })
            .then(() => {
              cameraEnabled = true;
            })
            .catch(error => {
              logGroupCallDebug('group_local_camera_enable_error', {
                callId,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }
        const localCameraState = getGroupLocalCameraState(nextRoom);
        logGroupCallDebug(
          cameraEnabled && localCameraState.hasMediaStream
            ? 'group_local_camera_ready'
            : 'group_local_camera_not_ready',
          {
            callId,
            cameraPermissionGranted: cameraGranted,
            cameraEnabled,
            trackSid: localCameraState.trackSid,
            hasTrack: localCameraState.hasTrack,
            hasMediaStream: localCameraState.hasMediaStream,
            isMuted: localCameraState.isMuted,
          },
        );
        stopMediaStatsProbe = startGroupMediaStatsProbe(nextRoom, callId);
        patchSession({
          phase: 'connected',
          participants: buildLiveKitRoomParticipants(
            nextRoom.localParticipant,
            Array.from(nextRoom.remoteParticipants.values()),
            payload.currentUser.id,
            {
              isMicrophoneEnabled: true,
              isCameraEnabled: cameraEnabled,
            },
          ),
          isLocalMicrophoneEnabled: true,
          isLocalCameraEnabled: cameraEnabled,
          hasCameraPermission: cameraGranted,
        });
        setActiveRoom(nextRoom);
      } catch (caught) {
        disconnectActiveRoom();
        throw caught;
      }
      if (callUuid) markNativeCallConnected(callUuid);
    },
    [disconnectActiveRoom, patchSession, repository],
  );

  const startGroupCall = useCallback(
    (params: StartGroupCallParams) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        patchSession({ isMinimized: false });
        return;
      }

      leaveSentRef.current = false;
      const initialSession = buildInitialSession({
        ...params,
        direction: 'outgoing',
      });
      sessionRef.current = initialSession;
      setSession(initialSession);

      async function boot() {
        const permissions = await requestGroupVideoCallPermissions();
        if (!permissions.microphoneGranted) {
          throw new Error(formatPermissionError());
        }
        patchSession({
          hasMediaPermissions: true,
          hasCameraPermission: permissions.cameraGranted,
        });
        const created = await repository.createCall({
          groupId: params.groupId,
        });
        const callUuid = createNativeGroupCallUuid(created.call.id);
        const deliveryWarningText =
          !created.isExisting && created.delivery.state === 'failed'
            ? 'Không thể gửi thông báo cuộc gọi tới thiết bị của thành viên. Cuộc gọi vẫn đang chờ.'
            : '';
        patchSession({
          callId: created.call.id,
          group: created.group,
          nativeCallUuid: callUuid,
          deliveryWarningText,
        });
        await startNativeOutgoingGroupCall({
          callUuid,
          callId: created.call.id,
          groupId: created.group.id || params.groupId,
          group: created.group,
        });
        await connectPayload(
          created.call.id,
          callUuid,
          permissions.cameraGranted,
        );
      }

      boot().catch(caught => {
        cleanupFailedGroupCallStart();
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Không thể bắt đầu cuộc gọi nhóm.',
          hasMediaPermissions: false,
        });
      });
    },
    [cleanupFailedGroupCallStart, connectPayload, patchSession, repository],
  );

  const answerIncomingGroupCall = useCallback(
    (call: IncomingGroupLiveKitCall) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        patchSession({ isMinimized: false });
        return;
      }

      leaveSentRef.current = false;
      const initialSession = {
        ...buildInitialSession({
          groupId: call.groupId,
          callId: call.callId,
          direction: 'incoming',
          groupName: call.group.name,
          groupAvatar: call.group.avatar,
        }),
        phase: 'initializing',
      } satisfies GroupLiveKitCallSession;
      sessionRef.current = initialSession;
      setSession(initialSession);

      async function boot() {
        const permissions = await requestGroupVideoCallPermissions();
        if (!permissions.microphoneGranted) {
          throw new Error(formatPermissionError());
        }
        patchSession({
          hasMediaPermissions: true,
          hasCameraPermission: permissions.cameraGranted,
        });
        const displayedUuid = await displayNativeIncomingGroupCall({
          ...call,
          callType: 'video',
        });
        const callUuid =
          displayedUuid || createNativeGroupCallUuid(call.callId);
        patchSession({ nativeCallUuid: callUuid });
        await connectPayload(call.callId, callUuid, permissions.cameraGranted);
      }

      boot().catch(caught => {
        cleanupFailedGroupCallStart();
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Không thể trả lời cuộc gọi nhóm.',
          hasMediaPermissions: false,
        });
      });
    },
    [cleanupFailedGroupCallStart, connectPayload, patchSession],
  );

  const ensureSessionFromRoute = useCallback(
    (params: GroupLiveKitCallRouteParams) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        patchSession({ isMinimized: false });
        return;
      }
      if (params.direction === 'outgoing') {
        startGroupCall(params);
        return;
      }
      if (!params.callId) return;
      answerIncomingGroupCall({
        callId: params.callId,
        groupId: params.groupId,
        callType: 'video',
        provider: 'livekit',
        roomName: '',
        group: {
          id: params.groupId,
          name: params.groupName || 'Nhóm',
          avatar: params.groupAvatar || '',
        },
        caller: {
          id: '',
          name: 'Người dùng',
          avatar: '',
        },
        participantCount: 0,
      });
    },
    [answerIncomingGroupCall, patchSession, startGroupCall],
  );

  const minimizeCall = useCallback(() => {
    const current = sessionRef.current;
    if (!current || isFinalPhase(current.phase)) return;
    patchSession({ isMinimized: true });
    exitGroupCallRoomIfFocused();
  }, [patchSession]);

  const restoreCallRoom = useCallback(() => {
    const current = sessionRef.current;
    if (!current || isFinalPhase(current.phase) || !navigationRef.isReady()) {
      return;
    }
    patchSession({ isMinimized: false });
    navigationRef.navigate(ROUTES.GROUP_CALL_ROOM, {
      groupId: current.groupId,
      callId: current.callId,
      direction: current.direction,
      groupName: current.group.name,
      groupAvatar: current.group.avatar,
    });
  }, [patchSession]);

  const leaveCall = useCallback(
    async (reason: GroupCallFinishReason = 'local_control') => {
      const current = sessionRef.current;
      if (!current) {
        finishSession(reason);
        return;
      }
      if (!leaveSentRef.current && current.callId) {
        leaveSentRef.current = true;
        await repository
          .leaveCall({ callId: current.callId })
          .catch(() => undefined);
        joinedCallIdRef.current = '';
      }
      finishSession(reason);
    },
    [finishSession, repository],
  );

  const declineIncomingGroupCall = useCallback(
    async (call: IncomingGroupLiveKitCall) => {
      await repository
        .declineCall({ callId: call.callId })
        .catch(() => undefined);
    },
    [repository],
  );

  const toggleMic = useCallback(async () => {
    await mediaControllerRef.current?.toggleMic().catch(() => undefined);
  }, []);

  const toggleCamera = useCallback(async () => {
    await mediaControllerRef.current?.toggleCamera().catch(() => undefined);
  }, []);

  const switchCamera = useCallback(async () => {
    await mediaControllerRef.current?.switchCamera().catch(() => undefined);
  }, []);

  const setAudioOutputMode = useCallback(
    async (mode: CallAudioOutputMode) => {
      const requestId = ++audioOutputRequestIdRef.current;
      const currentSession = sessionRef.current;
      const currentCallId = currentSession?.callId ?? '';
      if (audioOutputConfirmedCallIdRef.current !== currentCallId) {
        audioOutputConfirmedCallIdRef.current = currentCallId;
        audioOutputConfirmedModeRef.current =
          currentSession?.audioOutputMode ?? 'speaker';
      }
      const previousMode =
        audioOutputConfirmedModeRef.current ??
        currentSession?.audioOutputMode ??
        'speaker';

      patchSession({ audioOutputMode: mode });

      try {
        const result = await applyCallAudioOutputMode(
          activeRoomRef.current,
          mode,
        );
        if (requestId !== audioOutputRequestIdRef.current) return;
        if (!result.applied) {
          throw new Error(`Không thể chuyển âm thanh sang ${mode}.`);
        }
        audioOutputConfirmedModeRef.current = mode;
      } catch (error) {
        if (requestId === audioOutputRequestIdRef.current) {
          const rollbackMode =
            audioOutputConfirmedModeRef.current ?? previousMode;
          patchSession({ audioOutputMode: rollbackMode });
          const rollbackResult = await applyCallAudioOutputMode(
            activeRoomRef.current,
            rollbackMode,
          ).catch(() => null);
          if (rollbackResult?.applied) {
            audioOutputConfirmedModeRef.current = rollbackMode;
          }
        }
        throw error;
      }
    },
    [patchSession],
  );

  const getCandidates = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.callId || !current.groupId) return [];
    return repository.getCandidates({
      callId: current.callId,
      groupId: current.groupId,
    });
  }, [repository]);

  const addMembers = useCallback(
    async (userIds: string[]) => {
      const current = sessionRef.current;
      if (!current?.callId || !current.groupId || userIds.length === 0) {
        return [];
      }
      return repository.addMembers({
        callId: current.callId,
        groupId: current.groupId,
        userIds,
      });
    },
    [repository],
  );

  useEffect(() => {
    const applyRealtimeSync = (event: GroupLiveKitCallRealtimeEvent) => {
      const current = sessionRef.current;
      if (!current || current.callId !== event.callId) return;
      if (event.group) {
        patchSession({ group: event.group });
      }
      if (event.participants.length > 0) {
        mergeServerParticipantMetadata(event.participants);
      }
      const elapsedSeconds = resolveGroupElapsedSeconds(event);
      if (elapsedSeconds >= 0) {
        patchSession({
          startedAt: localStartedAtFromTiming(event),
          elapsedSeconds,
        });
      }
    };

    const cleanupSync = onLiveKitGroupCallSync(applyRealtimeSync);
    const cleanupClosed = onLiveKitGroupCallClosed(event => {
      const current = sessionRef.current;
      if (!current || current.callId !== event.callId) return;
      finishSession('realtime_closed');
    });

    return () => {
      cleanupSync();
      cleanupClosed();
    };
  }, [finishSession, mergeServerParticipantMetadata, patchSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = sessionRef.current;
      if (!current?.startedAt || current.phase !== 'connected') return;
      patchSession({
        elapsedSeconds: durationSeconds(current.startedAt),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [patchSession]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const current = sessionRef.current;
      if (!current?.callId || current.phase !== 'connected') return;
      const result = await repository
        .syncCall({ callId: current.callId })
        .catch(() => null);
      if (!result) return;
      if (result.call.status !== 'active') {
        finishSession('sync_inactive');
        return;
      }
      patchSession({
        group: result.group,
      });
      mergeServerParticipantMetadata(result.participants);
    }, GROUP_SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [finishSession, mergeServerParticipantMetadata, patchSession, repository]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') return;
      const current = sessionRef.current;
      if (!current || current.phase !== 'connected') return;
      if (Platform.OS === 'ios' && usesNativeCallUi(current.nativeCallUuid)) {
        return;
      }
      AudioSession.startAudioSession()
        .then(() => {
          const latest = sessionRef.current;
          if (
            !latest ||
            latest.callId !== current.callId ||
            latest.phase !== 'connected'
          ) {
            return undefined;
          }
          return applyCallAudioOutputMode(
            activeRoomRef.current,
            latest.audioOutputMode,
          );
        })
        .catch(() => undefined);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      const current = sessionRef.current;
      logGroupSessionFinishRequested(
        'provider_unmount',
        current,
        activeRoomRef.current,
      );
      const isIosNativeCall =
        Platform.OS === 'ios' && usesNativeCallUi(current?.nativeCallUuid);
      if (isIosNativeCall && current?.nativeCallUuid) {
        endNativeCall(current.nativeCallUuid);
      }
      disconnectActiveRoom();
      resetCallRemoteAudioVolume();
      if (current) {
        releaseIosCallAudio({
          owner: 'group-call',
          callId: current.callId,
          callType: 'video',
          callUuid: current.nativeCallUuid,
          roomName: current.payload?.call.roomName ?? '',
        });
      }
      if (!isIosNativeCall) {
        AudioSession.stopAudioSession().catch(() => undefined);
      }
    };
  }, [disconnectActiveRoom]);

  const value = useMemo<GroupLiveKitCallSessionContextValue>(
    () => ({
      session,
      activeRoom,
      statusText: resolveStatusText(session),
      isActive: Boolean(session && !isFinalPhase(session.phase)),
      startGroupCall,
      answerIncomingGroupCall,
      ensureSessionFromRoute,
      minimizeCall,
      restoreCallRoom,
      leaveCall,
      declineIncomingGroupCall,
      toggleMic,
      toggleCamera,
      switchCamera,
      setAudioOutputMode,
      getCandidates,
      addMembers,
    }),
    [
      activeRoom,
      addMembers,
      answerIncomingGroupCall,
      declineIncomingGroupCall,
      ensureSessionFromRoute,
      getCandidates,
      leaveCall,
      minimizeCall,
      restoreCallRoom,
      session,
      startGroupCall,
      switchCamera,
      toggleCamera,
      toggleMic,
      setAudioOutputMode,
    ],
  );

  return (
    <GroupLiveKitCallSessionContext.Provider value={value}>
      {children}
      {session?.payload && session.hasMediaPermissions && activeRoom ? (
        <ActiveGroupLiveKitRoom
          room={activeRoom}
          currentUserId={session.payload.currentUser.id}
          onParticipants={patchParticipants}
          onMediaState={patchSession}
          onController={controller => {
            mediaControllerRef.current = controller;
          }}
        />
      ) : null}
    </GroupLiveKitCallSessionContext.Provider>
  );
}

export function useGroupLiveKitCallSession() {
  const context = useContext(GroupLiveKitCallSessionContext);
  if (!context) {
    throw new Error(
      'useGroupLiveKitCallSession must be used inside GroupLiveKitCallSessionProvider.',
    );
  }
  return context;
}

export type { GroupCallFinishReason, GroupCallPhase, GroupLiveKitCallSession };
