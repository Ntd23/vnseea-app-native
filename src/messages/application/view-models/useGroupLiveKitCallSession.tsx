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
import { AppState } from 'react-native';
import {
  AudioSession,
  isTrackReference,
  RoomContext,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import {
  MediaStream,
  type MediaStreamTrack,
} from '@livekit/react-native-webrtc';
import {
  ConnectionState,
  MediaDeviceFailure,
  ParticipantEvent,
  Room,
  RoomEvent,
  Track,
  TrackEvent,
  type DisconnectReason,
  type Participant,
} from 'livekit-client';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';
import type { LiveKitCallType } from '../../domain/types/call.types';
import type {
  GroupLiveKitCallRouteParams,
  GroupLiveKitGroup,
  GroupLiveKitJoinPayload,
  GroupLiveKitParticipant,
  IncomingGroupLiveKitCall,
} from '../../domain/types/groupCall.types';
import {
  createNativeGroupCallUuid,
  endNativeCall,
  markNativeCallConnected,
} from '../../infrastructure/calls/nativeCallService';
import { createGroupLiveKitCallRepository } from '../../infrastructure/repositories/ApiGroupLiveKitCallRepository';

type GroupCallPhase =
  | 'initializing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';
type AudioOutputId = 'speaker' | 'earpiece' | 'default' | 'force_speaker';

type GroupLiveKitCallSession = {
  callId: string;
  groupId: string;
  callType: LiveKitCallType;
  direction: GroupLiveKitCallRouteParams['direction'];
  group: GroupLiveKitGroup;
  nativeCallUuid: string;
  phase: GroupCallPhase;
  payload: GroupLiveKitJoinPayload | null;
  participants: GroupLiveKitParticipant[];
  error: string;
  mediaErrorText: string;
  isMinimized: boolean;
  hasMediaPermissions: boolean | null;
  startedAt: number;
  elapsedSeconds: number;
  isLocalMicrophoneEnabled: boolean;
  isLocalCameraEnabled: boolean;
  isSpeakerEnabled: boolean;
};

type GroupLiveKitMediaController = {
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
};

type StartGroupCallParams = {
  groupId: string;
  callType: LiveKitCallType;
  groupName?: string;
  groupAvatar?: string;
};

type GroupLiveKitCallSessionContextValue = {
  session: GroupLiveKitCallSession | null;
  statusText: string;
  isActive: boolean;
  startGroupCall: (params: StartGroupCallParams) => void;
  answerIncomingGroupCall: (call: IncomingGroupLiveKitCall) => void;
  ensureSessionFromRoute: (params: GroupLiveKitCallRouteParams) => void;
  minimizeCall: () => void;
  restoreCallRoom: () => void;
  leaveCall: () => Promise<void>;
  declineIncomingGroupCall: (call: IncomingGroupLiveKitCall) => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;
  getCandidates: () => Promise<GroupLiveKitParticipant[]>;
  addMembers: (userIds: string[]) => Promise<string[]>;
};

const GROUP_SYNC_INTERVAL_MS = 3_000;
const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: { pixelDensity: 'screen' },
} as const;

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

function resolveTrackStreamUrl(track?: {
  mediaStream?: unknown;
  mediaStreamTrack?: unknown;
}) {
  const existingStreamUrl = (
    track?.mediaStream as { toURL?: () => string } | undefined
  )?.toURL?.();
  if (existingStreamUrl) return existingStreamUrl;

  const mediaStreamTrack = track?.mediaStreamTrack as
    | MediaStreamTrack
    | undefined;
  if (!mediaStreamTrack) return '';

  return new MediaStream([mediaStreamTrack]).toURL?.() ?? '';
}

function isFinalPhase(phase: GroupCallPhase) {
  return phase === 'ended' || phase === 'error';
}

function localStartedAtFromElapsed(elapsedSeconds: number) {
  return Date.now() - Math.max(0, elapsedSeconds) * 1000;
}

function durationSeconds(startedAt: number) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function formatPermissionError(callType: LiveKitCallType) {
  return callType === 'video'
    ? 'Bạn cần cấp quyền mic và camera để tham gia cuộc gọi nhóm.'
    : 'Bạn cần cấp quyền mic để tham gia cuộc gọi nhóm.';
}

function resolveAudioOutput(
  outputs: string[],
  nextIsSpeakerEnabled: boolean,
): AudioOutputId | undefined {
  if (nextIsSpeakerEnabled) {
    if (outputs.includes('force_speaker')) return 'force_speaker';
    if (outputs.includes('speaker')) return 'speaker';
    return undefined;
  }

  if (outputs.includes('earpiece')) return 'earpiece';
  if (outputs.includes('default')) return 'default';
  return undefined;
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
    callType: params.callType,
    direction: params.direction,
    group,
    nativeCallUuid: params.callId
      ? createNativeGroupCallUuid(params.callId, params.callType)
      : '',
    phase: 'initializing',
    payload: null,
    participants: [],
    error: '',
    mediaErrorText: '',
    isMinimized: false,
    hasMediaPermissions: null,
    startedAt: 0,
    elapsedSeconds: 0,
    isLocalMicrophoneEnabled: true,
    isLocalCameraEnabled: params.callType === 'video',
    isSpeakerEnabled: true,
  };
}

function GroupLiveKitMediaBridge({
  callType,
  currentUserId,
  onParticipants,
  onMediaState,
  onController,
}: {
  callType: LiveKitCallType;
  currentUserId: string;
  onParticipants: (items: GroupLiveKitParticipant[]) => void;
  onMediaState: (state: Partial<GroupLiveKitCallSession>) => void;
  onController: (controller: GroupLiveKitMediaController | null) => void;
}) {
  const cameraFacingModeRef = useRef<'user' | 'environment'>('user');
  const {
    localParticipant,
    cameraTrack: localCameraPublication,
    isMicrophoneEnabled,
    isCameraEnabled,
  } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera]);
  const cameraTracks = useMemo(() => tracks.filter(isTrackReference), [tracks]);

  const publishParticipantMedia = useCallback(() => {
    const items: GroupLiveKitParticipant[] = [];
    const localVideoUrl = resolveTrackStreamUrl(localCameraPublication?.track);
    const localMeta = parseParticipantMetadata(localParticipant);
    items.push({
      id: currentUserId || localMeta.id,
      name: localMeta.name,
      avatar: localMeta.avatar,
      username: localMeta.username,
      joinedAt: 0,
      isLocal: true,
      isMicrophoneMuted: !isMicrophoneEnabled,
      isCameraMuted: callType === 'video' ? !isCameraEnabled : true,
      videoStreamUrl: localVideoUrl,
      videoRenderKey: Date.now(),
    });

    remoteParticipants.forEach(participant => {
      const meta = parseParticipantMetadata(participant);
      const microphonePublication = participant.getTrackPublication(
        Track.Source.Microphone,
      );
      const cameraPublication = participant.getTrackPublication(
        Track.Source.Camera,
      );
      const cameraTrackRef = cameraTracks.find(
        trackRef =>
          (trackRef as TrackReferenceOrPlaceholder).participant?.sid ===
          participant.sid,
      );
      const videoTrack = isTrackReference(cameraTrackRef)
        ? cameraTrackRef.publication.track
        : cameraPublication?.track;
      items.push({
        id: meta.id,
        name: meta.name,
        avatar: meta.avatar,
        username: meta.username,
        joinedAt: 0,
        isMicrophoneMuted:
          !microphonePublication || microphonePublication.isMuted,
        isCameraMuted: !cameraPublication || cameraPublication.isMuted,
        videoStreamUrl: resolveTrackStreamUrl(videoTrack),
        videoRenderKey: Date.now(),
      });
    });

    onParticipants(items);
    onMediaState({
      isLocalMicrophoneEnabled: isMicrophoneEnabled,
      isLocalCameraEnabled: isCameraEnabled,
    });
  }, [
    callType,
    cameraTracks,
    currentUserId,
    isCameraEnabled,
    isMicrophoneEnabled,
    localCameraPublication,
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
    const localCameraTrack = localCameraPublication?.track;
    localCameraTrack?.on(TrackEvent.Restarted, publishParticipantMedia);
    localCameraTrack?.on(TrackEvent.Unmuted, publishParticipantMedia);

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
      localCameraTrack?.off(TrackEvent.Restarted, publishParticipantMedia);
      localCameraTrack?.off(TrackEvent.Unmuted, publishParticipantMedia);
    };
  }, [
    localCameraPublication,
    localParticipant,
    publishParticipantMedia,
    remoteParticipants,
  ]);

  useEffect(() => {
    onController({
      toggleMic: async () => {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      },
      toggleCamera: async () => {
        if (callType !== 'video') return;
        await localParticipant.setCameraEnabled(!isCameraEnabled);
      },
      switchCamera: async () => {
        if (callType !== 'video') return;
        if (!isCameraEnabled) {
          await localParticipant.setCameraEnabled(true);
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
        publishParticipantMedia();
        setTimeout(publishParticipantMedia, 250);
        setTimeout(publishParticipantMedia, 900);
      },
    });
    return () => onController(null);
  }, [
    callType,
    isCameraEnabled,
    isMicrophoneEnabled,
    localParticipant,
    onController,
    publishParticipantMedia,
  ]);

  return null;
}

const ActiveGroupLiveKitRoom = React.memo(function ActiveGroupLiveKitRoom({
  room,
  callType,
  currentUserId,
  onParticipants,
  onMediaState,
  onController,
}: {
  room: Room;
  callType: LiveKitCallType;
  currentUserId: string;
  onParticipants: (items: GroupLiveKitParticipant[]) => void;
  onMediaState: (state: Partial<GroupLiveKitCallSession>) => void;
  onController: (controller: GroupLiveKitMediaController | null) => void;
}) {
  return (
    <RoomContext.Provider value={room}>
      <GroupLiveKitMediaBridge
        callType={callType}
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
  const mediaControllerRef = useRef<GroupLiveKitMediaController | null>(null);
  const leaveSentRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  const patchSession = useCallback(
    (patch: Partial<GroupLiveKitCallSession>) => {
      setSession(current => {
        const next = current ? { ...current, ...patch } : current;
        sessionRef.current = next;
        return next;
      });
    },
    [],
  );

  const patchParticipants = useCallback(
    (participants: GroupLiveKitParticipant[]) => {
      setSession(current => {
        const next = current
          ? {
              ...current,
              participants: mergeParticipants(
                current.participants,
                participants,
              ),
            }
          : current;
        sessionRef.current = next;
        return next;
      });
    },
    [],
  );

  const replaceServerParticipants = useCallback(
    (participants: GroupLiveKitParticipant[]) => {
      setSession(current => {
        if (!current) {
          sessionRef.current = current;
          return current;
        }
        const currentById = new Map(
          current.participants.map(item => [item.id, item]),
        );
        const next = {
          ...current,
          participants: participants.map(item => {
            const currentItem = currentById.get(item.id);
            return {
              ...item,
              isLocal: currentItem?.isLocal,
              isMicrophoneMuted: currentItem?.isMicrophoneMuted,
              isCameraMuted: currentItem?.isCameraMuted,
              videoStreamUrl: currentItem?.videoStreamUrl,
              videoRenderKey: currentItem?.videoRenderKey,
            };
          }),
        };
        sessionRef.current = next;
        return next;
      });
    },
    [],
  );

  const disconnectActiveRoom = useCallback(() => {
    roomEventCleanupRef.current?.();
    roomEventCleanupRef.current = null;
    const room = activeRoomRef.current;
    activeRoomRef.current = null;
    setActiveRoom(null);
    disconnectRoomSafely(room);
  }, []);

  const finishSession = useCallback(
    (patch?: Partial<GroupLiveKitCallSession>) => {
      const current = sessionRef.current;
      disconnectActiveRoom();
      AudioSession.stopAudioSession().catch(() => undefined);
      if (current?.nativeCallUuid) endNativeCall(current.nativeCallUuid);
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

  const connectPayload = useCallback(
    async (callId: string, callType: LiveKitCallType, callUuid: string) => {
      patchSession({ phase: 'connecting' });
      await repository.joinCall({ callId }).catch(() => undefined);
      await AudioSession.startAudioSession().catch(() => undefined);
      const payload = await repository.getJoinPayload({ callId });
      disconnectActiveRoom();

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
      roomEventCleanupRef.current = () => {
        nextRoom
          .off(RoomEvent.Disconnected, handleDisconnected)
          .off(RoomEvent.MediaDevicesError, handleMediaDeviceError);
      };

      activeRoomRef.current = nextRoom;
      setActiveRoom(nextRoom);
      const elapsedSeconds = payload.elapsedSeconds;
      setSession(current => {
        const next: GroupLiveKitCallSession | null = current
          ? {
              ...current,
              callId,
              callType,
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
              startedAt: localStartedAtFromElapsed(elapsedSeconds),
              elapsedSeconds,
              phase: 'connecting',
              isMinimized: false,
            }
          : current;
        sessionRef.current = next;
        return next;
      });
      try {
        await nextRoom.connect(payload.wsUrl, payload.token);
        await Promise.all([
          nextRoom.localParticipant.setMicrophoneEnabled(true),
          callType === 'video'
            ? nextRoom.localParticipant.setCameraEnabled(true)
            : Promise.resolve(),
        ]);
      } catch (caught) {
        disconnectActiveRoom();
        throw caught;
      }
      patchSession({
        phase: 'connected',
        isLocalMicrophoneEnabled: true,
        isLocalCameraEnabled: callType === 'video',
      });
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
        const granted = await requestCallMediaPermissions(params.callType);
        if (!granted) {
          throw new Error(formatPermissionError(params.callType));
        }
        patchSession({ hasMediaPermissions: true });
        const created = await repository.createCall({
          groupId: params.groupId,
          callType: params.callType,
        });
        const callUuid = createNativeGroupCallUuid(
          created.call.id,
          created.call.callType,
        );
        patchSession({
          callId: created.call.id,
          group: created.group,
          nativeCallUuid: callUuid,
        });
        await connectPayload(created.call.id, created.call.callType, callUuid);
      }

      boot().catch(caught => {
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
    [connectPayload, patchSession, repository],
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
          callType: call.callType,
          direction: 'incoming',
          groupName: call.group.name,
          groupAvatar: call.group.avatar,
        }),
        phase: 'initializing',
      } satisfies GroupLiveKitCallSession;
      sessionRef.current = initialSession;
      setSession(initialSession);

      async function boot() {
        const granted = await requestCallMediaPermissions(call.callType);
        if (!granted) {
          throw new Error(formatPermissionError(call.callType));
        }
        patchSession({ hasMediaPermissions: true });
        const callUuid = createNativeGroupCallUuid(call.callId, call.callType);
        patchSession({ nativeCallUuid: callUuid });
        await connectPayload(call.callId, call.callType, callUuid);
      }

      boot().catch(caught => {
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
    [connectPayload, patchSession],
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
        callType: params.callType,
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
      callType: current.callType,
      direction: current.direction,
      groupName: current.group.name,
      groupAvatar: current.group.avatar,
    });
  }, [patchSession]);

  const leaveCall = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      finishSession();
      return;
    }
    if (!leaveSentRef.current && current.callId) {
      leaveSentRef.current = true;
      await repository
        .leaveCall({ callId: current.callId })
        .catch(() => undefined);
    }
    finishSession();
  }, [finishSession, repository]);

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

  const toggleSpeaker = useCallback(async () => {
    const current = sessionRef.current;
    const nextIsSpeakerEnabled = !current?.isSpeakerEnabled;
    const outputs = await AudioSession.getAudioOutputs().catch(() => []);
    const audioOutput = resolveAudioOutput(outputs, nextIsSpeakerEnabled);
    if (audioOutput) {
      await AudioSession.selectAudioOutput(audioOutput).catch(() => undefined);
    }
    patchSession({ isSpeakerEnabled: nextIsSpeakerEnabled });
  }, [patchSession]);

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
        finishSession();
        return;
      }
      patchSession({
        group: result.group,
      });
      replaceServerParticipants(result.participants);
    }, GROUP_SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [finishSession, patchSession, replaceServerParticipants, repository]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') return;
      const current = sessionRef.current;
      if (!current || current.phase !== 'connected') return;
      AudioSession.startAudioSession().catch(() => undefined);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      disconnectActiveRoom();
      AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, [disconnectActiveRoom]);

  const value = useMemo<GroupLiveKitCallSessionContextValue>(
    () => ({
      session,
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
      toggleSpeaker,
      getCandidates,
      addMembers,
    }),
    [
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
      toggleSpeaker,
    ],
  );

  return (
    <GroupLiveKitCallSessionContext.Provider value={value}>
      {children}
      {session?.payload && session.hasMediaPermissions && activeRoom ? (
        <ActiveGroupLiveKitRoom
          room={activeRoom}
          callType={session.callType}
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

export type { GroupCallPhase, GroupLiveKitCallSession };
