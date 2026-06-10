// Description: Owns the app-level LiveKit call session so calls survive navigation changes.
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
} from 'livekit-client';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';
import type {
  IncomingLiveKitCall,
  LiveKitCallPeer,
  LiveKitCallRouteParams,
  LiveKitCallType,
  LiveKitJoinPayload,
} from '../../domain/types/call.types';
import {
  createNativeCallUuid,
  endNativeCall,
  markNativeCallConnected,
  startNativeOutgoingCall,
} from '../../infrastructure/calls/nativeCallService';
import {
  connectLiveKitCallRealtime,
  emitLiveKitCallAnswered,
  emitLiveKitCallClosed,
  emitLiveKitCallCreated,
  onLiveKitCallAnswered,
  onLiveKitCallClosed,
  onLiveKitCallDeclined,
  type LiveKitCallRealtimeTiming,
} from '../../infrastructure/realtime/liveKitCallRealtime';
import { createLiveKitCallRepository } from '../../infrastructure/repositories/ApiLiveKitCallRepository';

type CallPhase =
  | 'initializing'
  | 'ringing'
  | 'answering'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';

type CloseReason = 'ended' | 'cancelled' | 'declined' | 'no_answer' | 'missed';
type AudioOutputId = 'speaker' | 'earpiece' | 'default' | 'force_speaker';

type LiveKitCallSession = {
  callId: string;
  recipientId: string;
  callType: LiveKitCallType;
  direction: LiveKitCallRouteParams['direction'];
  peer?: LiveKitCallPeer;
  nativeCallUuid: string;
  phase: CallPhase;
  payload: LiveKitJoinPayload | null;
  error: string;
  isMinimized: boolean;
  hasMediaPermissions: boolean | null;
  mediaErrorText: string;
  startedAt: number;
  elapsedSeconds: number;
  localVideoStreamUrl: string;
  localVideoRenderKey: number;
  remoteVideoStreamUrl: string;
  hasRemoteParticipant: boolean;
  isLocalMicrophoneEnabled: boolean;
  isLocalCameraEnabled: boolean;
  isSpeakerEnabled: boolean;
  isRemoteMicrophoneMuted: boolean;
  isRemoteCameraMuted: boolean;
};

type LiveKitMediaController = {
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
};

type LiveKitRoomDataEvent =
  | {
      type: 'media_state';
      callId: string;
      microphoneMuted?: boolean;
      cameraMuted?: boolean;
    }
  | {
      type: 'call_closed';
      callId: string;
      status: CloseReason;
    };

type StartOutgoingCallParams = LiveKitCallRouteParams & {
  direction: 'outgoing';
};

type LiveKitCallSessionContextValue = {
  session: LiveKitCallSession | null;
  statusText: string;
  isActive: boolean;
  startOutgoingCall: (params: StartOutgoingCallParams) => void;
  answerIncomingCall: (call: IncomingLiveKitCall) => void;
  ensureSessionFromRoute: (params: LiveKitCallRouteParams) => void;
  minimizeCall: () => void;
  restoreCallRoom: () => void;
  endCall: (status?: CloseReason) => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;
};

const OUTGOING_RING_TIMEOUT_MS = 43_000;
const OUTGOING_ANSWER_WATCHDOG_INTERVAL_MS = 650;
const CONNECTED_CALL_SYNC_INTERVAL_MS = 2_000;
const LIVEKIT_CALL_DATA_TOPIC = 'vnseea-call-event';
const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: { pixelDensity: 'screen' },
} as const;

const LiveKitCallSessionContext =
  createContext<LiveKitCallSessionContextValue | null>(null);

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

function formatPermissionError(callType: LiveKitCallType) {
  return callType === 'video'
    ? 'Bạn cần cấp quyền mic và camera để tham gia cuộc gọi.'
    : 'Bạn cần cấp quyền mic để tham gia cuộc gọi.';
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

function isFinalPhase(phase: CallPhase) {
  return phase === 'ended' || phase === 'error';
}

function canRunCallTimer(phase: CallPhase) {
  return phase === 'connecting' || phase === 'connected';
}

function resolveStatusText(session: LiveKitCallSession | null) {
  if (!session) return '';

  const statusMap: Record<CallPhase, string> = {
    initializing: 'Đang chuẩn bị cuộc gọi...',
    ringing: 'Đang gọi...',
    answering: 'Đang trả lời...',
    connecting: '',
    connected: 'Đã kết nối',
    ended: 'Cuộc gọi đã kết thúc',
    error: session.error || 'Không thể thực hiện cuộc gọi.',
  };
  return statusMap[session.phase];
}

function buildInitialSession(
  params: LiveKitCallRouteParams,
): LiveKitCallSession {
  const callId = params.callId ?? '';
  return {
    callId,
    recipientId: params.recipientId ?? params.peer?.id ?? '',
    callType: params.callType,
    direction: params.direction,
    peer: params.peer,
    nativeCallUuid: callId ? createNativeCallUuid(callId, params.callType) : '',
    phase: 'initializing',
    payload: null,
    error: '',
    isMinimized: false,
    hasMediaPermissions: null,
    mediaErrorText: '',
    startedAt: 0,
    elapsedSeconds: 0,
    localVideoStreamUrl: '',
    localVideoRenderKey: 0,
    remoteVideoStreamUrl: '',
    hasRemoteParticipant: false,
    isLocalMicrophoneEnabled: true,
    isLocalCameraEnabled: params.callType === 'video',
    isSpeakerEnabled: true,
    isRemoteMicrophoneMuted: true,
    isRemoteCameraMuted: true,
  };
}

function resolveServerElapsedSeconds(
  timing: {
    elapsedSeconds?: number;
    elapsedMs?: number;
    serverNow?: number;
    serverNowMs?: number;
    call?: { startedAtMs?: number };
    startedAtMs?: number;
  },
  startedAt = 0,
  measuredAt = Date.now(),
) {
  const localElapsedSinceMeasurementMs = Math.max(0, Date.now() - measuredAt);

  if (
    typeof timing.elapsedMs === 'number' &&
    Number.isFinite(timing.elapsedMs) &&
    timing.elapsedMs >= 0
  ) {
    return Math.floor((timing.elapsedMs + localElapsedSinceMeasurementMs) / 1000);
  }

  const startedAtMs = resolveServerStartedAtMs(timing, startedAt);
  if (
    startedAtMs > 0 &&
    typeof timing.serverNowMs === 'number' &&
    Number.isFinite(timing.serverNowMs) &&
    timing.serverNowMs > 0
  ) {
    return Math.floor(
      Math.max(0, timing.serverNowMs - startedAtMs + localElapsedSinceMeasurementMs) /
        1000,
    );
  }

  const localElapsedSinceMeasurement = Math.floor(
    localElapsedSinceMeasurementMs / 1000,
  );

  if (
    typeof timing.elapsedSeconds === 'number' &&
    Number.isFinite(timing.elapsedSeconds) &&
    timing.elapsedSeconds > 0
  ) {
    return Math.floor(timing.elapsedSeconds) + localElapsedSinceMeasurement;
  }

  if (
    startedAt > 0 &&
    typeof timing.serverNow === 'number' &&
    Number.isFinite(timing.serverNow) &&
    timing.serverNow > 0
  ) {
    return (
      Math.max(0, Math.floor(timing.serverNow - startedAt)) +
      localElapsedSinceMeasurement
    );
  }

  return localElapsedSinceMeasurement;
}

function hasUsableTimerTiming(
  timing: {
    elapsedSeconds?: number;
    elapsedMs?: number;
    serverNow?: number;
    serverNowMs?: number;
    call?: { startedAtMs?: number };
    startedAtMs?: number;
  },
  startedAt = 0,
) {
  const startedAtMs = resolveServerStartedAtMs(timing, startedAt);
  return Boolean(
    (startedAtMs > 0 &&
      typeof timing.serverNowMs === 'number' &&
      Number.isFinite(timing.serverNowMs) &&
      timing.serverNowMs > 0) ||
      (typeof timing.elapsedMs === 'number' &&
        Number.isFinite(timing.elapsedMs) &&
        timing.elapsedMs >= 0) ||
    (startedAt > 0 &&
      typeof timing.serverNow === 'number' &&
      Number.isFinite(timing.serverNow) &&
      timing.serverNow > 0) ||
      (typeof timing.elapsedSeconds === 'number' &&
        Number.isFinite(timing.elapsedSeconds) &&
        timing.elapsedSeconds >= 0),
  );
}

function resolveServerStartedAtMs(
  timing: { call?: { startedAtMs?: number }; startedAtMs?: number },
  startedAt = 0,
) {
  if (
    typeof timing.startedAtMs === 'number' &&
    Number.isFinite(timing.startedAtMs) &&
    timing.startedAtMs > 0
  ) {
    return timing.startedAtMs;
  }
  if (
    typeof timing.call?.startedAtMs === 'number' &&
    Number.isFinite(timing.call.startedAtMs) &&
    timing.call.startedAtMs > 0
  ) {
    return timing.call.startedAtMs;
  }
  return startedAt > 0 ? startedAt * 1000 : 0;
}

function localStartedAtFromElapsed(elapsedSeconds: number) {
  return Date.now() - Math.max(0, elapsedSeconds) * 1000;
}

function resolveLocalStartedAtFromServer(
  timing: {
    elapsedSeconds?: number;
    elapsedMs?: number;
    serverNow?: number;
    serverNowMs?: number;
    call?: { startedAtMs?: number };
    startedAtMs?: number;
  },
  startedAt = 0,
  measuredAt = Date.now(),
  fallbackStartedAt = 0,
) {
  const startedAtMs = resolveServerStartedAtMs(timing, startedAt);
  if (
    startedAtMs > 0 &&
    typeof timing.serverNowMs === 'number' &&
    Number.isFinite(timing.serverNowMs) &&
    timing.serverNowMs > 0
  ) {
    return measuredAt - Math.max(0, timing.serverNowMs - startedAtMs);
  }

  if (
    typeof timing.elapsedMs === 'number' &&
    Number.isFinite(timing.elapsedMs) &&
    timing.elapsedMs >= 0
  ) {
    return measuredAt - timing.elapsedMs;
  }

  if (
    startedAt > 0 &&
    typeof timing.serverNow === 'number' &&
    Number.isFinite(timing.serverNow) &&
    timing.serverNow > 0
  ) {
    return (
      measuredAt -
      Math.max(0, Math.floor(timing.serverNow - startedAt)) * 1000
    );
  }

  if (
    typeof timing.elapsedSeconds === 'number' &&
    Number.isFinite(timing.elapsedSeconds) &&
    timing.elapsedSeconds >= 0
  ) {
    return measuredAt - Math.floor(timing.elapsedSeconds) * 1000;
  }

  return fallbackStartedAt || measuredAt;
}

function encodeLiveKitRoomData(event: LiveKitRoomDataEvent) {
  return Uint8Array.from(JSON.stringify(event), char => char.charCodeAt(0));
}

function decodeLiveKitRoomData(payload: Uint8Array) {
  try {
    return JSON.parse(String.fromCharCode(...payload)) as LiveKitRoomDataEvent;
  } catch {
    return null;
  }
}

function exitCallRoomIfFocused() {
  if (!navigationRef.isReady()) return;
  if (navigationRef.getCurrentRoute()?.name !== ROUTES.CALL_ROOM) return;
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

function isSameOutgoingTarget(
  current: LiveKitCallSession,
  params: StartOutgoingCallParams,
) {
  if (current.callId && params.callId && current.callId === params.callId) {
    return true;
  }

  return Boolean(
    current.direction === 'outgoing' &&
      params.recipientId &&
      current.recipientId === params.recipientId &&
      current.callType === params.callType,
  );
}

function LiveKitMediaBridge({
  callType,
  onMediaState,
  onController,
}: {
  callType: LiveKitCallType;
  onMediaState: (state: Partial<LiveKitCallSession>) => void;
  onController: (controller: LiveKitMediaController | null) => void;
}) {
  const cameraFacingModeRef = useRef<'user' | 'environment'>('user');
  const {
    localParticipant,
    cameraTrack: localCameraPublication,
    isMicrophoneEnabled,
    isCameraEnabled,
  } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants[0];
  const tracks = useTracks([Track.Source.Camera]);
  const cameraTracks = useMemo(() => tracks.filter(isTrackReference), [tracks]);
  const remoteTrack = cameraTracks.find(
    trackRef =>
      !(
        trackRef as TrackReferenceOrPlaceholder & {
          participant?: { isLocal?: boolean };
        }
      ).participant?.isLocal,
  );

  useEffect(() => {
    onMediaState({
      isLocalMicrophoneEnabled: isMicrophoneEnabled,
      isLocalCameraEnabled: isCameraEnabled,
    });
  }, [isCameraEnabled, isMicrophoneEnabled, onMediaState]);

  useEffect(() => {
    const localCameraTrack = localCameraPublication?.track;
    onMediaState({
      localVideoStreamUrl: resolveTrackStreamUrl(localCameraTrack),
      localVideoRenderKey: Date.now(),
    });
    if (!localCameraTrack) return;

    const handleRestarted = (nextTrack?: { mediaStream?: unknown }) => {
      onMediaState({
        localVideoStreamUrl: resolveTrackStreamUrl(
          nextTrack ?? localCameraTrack,
        ),
        localVideoRenderKey: Date.now(),
      });
    };

    localCameraTrack.on(TrackEvent.Restarted, handleRestarted);
    localCameraTrack.on(TrackEvent.Unmuted, handleRestarted);
    return () => {
      localCameraTrack.off(TrackEvent.Restarted, handleRestarted);
      localCameraTrack.off(TrackEvent.Unmuted, handleRestarted);
    };
  }, [localCameraPublication, onMediaState]);

  useEffect(() => {
    const publication = isTrackReference(remoteTrack)
      ? remoteTrack.publication
      : undefined;
    onMediaState({
      remoteVideoStreamUrl: resolveTrackStreamUrl(publication?.track),
    });
  }, [onMediaState, remoteTrack]);

  useEffect(() => {
    if (!remoteParticipant) {
      onMediaState({
        hasRemoteParticipant: false,
        isRemoteMicrophoneMuted: true,
        isRemoteCameraMuted: true,
      });
      return;
    }

    const updateRemoteMediaState = () => {
      const microphonePublication = remoteParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      const cameraPublication = remoteParticipant.getTrackPublication(
        Track.Source.Camera,
      );

      onMediaState({
        hasRemoteParticipant: true,
        isRemoteMicrophoneMuted:
          !microphonePublication || microphonePublication.isMuted,
        isRemoteCameraMuted: !cameraPublication || cameraPublication.isMuted,
      });
    };

    updateRemoteMediaState();
    remoteParticipant
      .on(ParticipantEvent.TrackMuted, updateRemoteMediaState)
      .on(ParticipantEvent.TrackUnmuted, updateRemoteMediaState)
      .on(ParticipantEvent.TrackPublished, updateRemoteMediaState)
      .on(ParticipantEvent.TrackUnpublished, updateRemoteMediaState)
      .on(ParticipantEvent.TrackSubscribed, updateRemoteMediaState)
      .on(ParticipantEvent.TrackUnsubscribed, updateRemoteMediaState);

    return () => {
      remoteParticipant
        .off(ParticipantEvent.TrackMuted, updateRemoteMediaState)
        .off(ParticipantEvent.TrackUnmuted, updateRemoteMediaState)
        .off(ParticipantEvent.TrackPublished, updateRemoteMediaState)
        .off(ParticipantEvent.TrackUnpublished, updateRemoteMediaState)
        .off(ParticipantEvent.TrackSubscribed, updateRemoteMediaState)
        .off(ParticipantEvent.TrackUnsubscribed, updateRemoteMediaState);
    };
  }, [onMediaState, remoteParticipant]);

  useEffect(() => {
    onController({
      toggleMic: async () => {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      },
      toggleCamera: async () => {
        await localParticipant.setCameraEnabled(!isCameraEnabled);
      },
      switchCamera: async () => {
        if (callType !== 'video') return;
        if (!isCameraEnabled) {
          await localParticipant.setCameraEnabled(true);
        }

        const nextFacingMode =
          cameraFacingModeRef.current === 'user' ? 'environment' : 'user';
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

        let didRestartTrack = false;
        if (localCameraTrack.restartTrack) {
          await localCameraTrack
            .restartTrack({ facingMode: nextFacingMode })
            .then(() => {
              didRestartTrack = true;
            })
            .catch(() => undefined);
        }

        if (!didRestartTrack) {
          localCameraTrack.mediaStreamTrack?._switchCamera?.();
        }
        cameraFacingModeRef.current = nextFacingMode;

        const refreshLocalPreview = () => {
          const nextPublication = localParticipant.getTrackPublication(
            Track.Source.Camera,
          );
          onMediaState({
            localVideoStreamUrl: resolveTrackStreamUrl(nextPublication?.track),
            localVideoRenderKey: Date.now(),
          });
        };

        refreshLocalPreview();
        setTimeout(refreshLocalPreview, 250);
        setTimeout(refreshLocalPreview, 900);
      },
    });

    return () => onController(null);
  }, [
    callType,
    isCameraEnabled,
    isMicrophoneEnabled,
    localParticipant,
    onController,
    onMediaState,
  ]);

  return null;
}

const ActiveLiveKitRoom = React.memo(function ActiveLiveKitRoom({
  room,
  callType,
  onMediaState,
  onController,
}: {
  room: Room;
  callType: LiveKitCallType;
  onMediaState: (state: Partial<LiveKitCallSession>) => void;
  onController: (controller: LiveKitMediaController | null) => void;
}) {
  return (
    <RoomContext.Provider value={room}>
      <LiveKitMediaBridge
        callType={callType}
        onMediaState={onMediaState}
        onController={onController}
      />
    </RoomContext.Provider>
  );
});

export function LiveKitCallSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useMemo(() => createLiveKitCallRepository(), []);
  const [session, setSession] = useState<LiveKitCallSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const sessionRef = useRef<LiveKitCallSession | null>(null);
  const activeRoomRef = useRef<Room | null>(null);
  const roomEventCleanupRef = useRef<(() => void) | null>(null);
  const mediaControllerRef = useRef<LiveKitMediaController | null>(null);
  const closeSentRef = useRef(false);
  const isJoiningAnsweredCallRef = useRef(false);
  const isAnswerWatchdogCheckingRef = useRef(false);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  const patchSession = useCallback((patch: Partial<LiveKitCallSession>) => {
    if (patch.hasRemoteParticipant === true) {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      if (answerWatchdogRef.current) clearInterval(answerWatchdogRef.current);
      answerWatchdogRef.current = null;
    }

    setSession(current => {
      if (!current) {
        sessionRef.current = current;
        return current;
      }

      const hasChanged = Object.entries(patch).some(
        ([key, value]) => current[key as keyof LiveKitCallSession] !== value,
      );
      const next = hasChanged ? { ...current, ...patch } : current;
      sessionRef.current = next;
      return next;
    });
  }, []);

  const clearRingTimers = useCallback(() => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
    if (answerWatchdogRef.current) clearInterval(answerWatchdogRef.current);
    answerWatchdogRef.current = null;
    isAnswerWatchdogCheckingRef.current = false;
  }, []);

  const disconnectActiveRoom = useCallback(() => {
    roomEventCleanupRef.current?.();
    roomEventCleanupRef.current = null;
    const room = activeRoomRef.current;
    activeRoomRef.current = null;
    setActiveRoom(null);
    disconnectRoomSafely(room);
  }, []);

  const durationSeconds = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000));
  }, []);

  const publishRoomData = useCallback(async (event: LiveKitRoomDataEvent) => {
    const room = activeRoomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    await room.localParticipant
      .publishData(encodeLiveKitRoomData(event), {
        reliable: true,
        topic: LIVEKIT_CALL_DATA_TOPIC,
      })
      .catch(() => undefined);
  }, []);

  const resetMediaState = useCallback(() => {
    mediaControllerRef.current = null;
    disconnectActiveRoom();
    AudioSession.stopAudioSession().catch(() => undefined);
  }, [disconnectActiveRoom]);

  const finishSession = useCallback(
    (patch?: Partial<LiveKitCallSession>) => {
      const current = sessionRef.current;
      clearRingTimers();
      resetMediaState();
      if (current?.nativeCallUuid) endNativeCall(current.nativeCallUuid);
      setSession(currentSession => {
        const next = currentSession
          ? {
              ...currentSession,
              ...patch,
              phase: patch?.phase ?? 'ended',
              payload: null,
              isMinimized: false,
              localVideoStreamUrl: '',
              localVideoRenderKey: Date.now(),
              remoteVideoStreamUrl: '',
            }
          : null;
        sessionRef.current = next;
        return next;
      });
      exitCallRoomIfFocused();
    },
    [clearRingTimers, resetMediaState],
  );

  const endCall = useCallback(
    async (status: CloseReason = 'ended') => {
      const current = sessionRef.current;
      if (!current || closeSentRef.current) {
        finishSession();
        return;
      }

      closeSentRef.current = true;
      if (current.callId) {
        await publishRoomData({
          type: 'call_closed',
          callId: current.callId,
          status,
        });
        const recipientId = current.peer?.id || current.recipientId;
        if (recipientId) {
          emitLiveKitCallClosed({
            callId: current.callId,
            callType: current.callType,
            recipientId,
            status,
            duration: durationSeconds(),
          });
        }
      }
      if (current.callId) {
        await repository
          .closeCall({
            callId: current.callId,
            callType: current.callType,
            status,
            duration: durationSeconds(),
          })
          .catch(() => undefined);
      }
      finishSession();
    },
    [durationSeconds, finishSession, publishRoomData, repository],
  );

  const connectPayload = useCallback(
    async (
      callId: string,
      callType: LiveKitCallType,
      callUuid: string,
      timingOverride?: LiveKitCallRealtimeTiming,
    ) => {
      patchSession({ phase: 'connecting' });
      await AudioSession.startAudioSession().catch(() => undefined);
      const nextPayload = await repository.getJoinPayload({ callId, callType });
      const payloadStartedAt = nextPayload.call.startedAt;
      const overrideStartedAt = timingOverride?.startedAt ?? 0;
      const shouldUsePayloadTiming = hasUsableTimerTiming(
        nextPayload,
        payloadStartedAt,
      );
      const shouldUseOverrideTiming = hasUsableTimerTiming(
        timingOverride ?? {},
        overrideStartedAt,
      );
      const timerTiming = shouldUsePayloadTiming
        ? nextPayload
        : shouldUseOverrideTiming
          ? timingOverride ?? nextPayload
          : nextPayload;
      const timerStartedAt = shouldUsePayloadTiming
        ? payloadStartedAt || overrideStartedAt
        : overrideStartedAt || payloadStartedAt;
      const timerMeasuredAt = Date.now();

      const initialElapsedSeconds = resolveServerElapsedSeconds(
        timerTiming,
        timerStartedAt,
        timerMeasuredAt,
      );
      const initialStartedAt = resolveLocalStartedAtFromServer(
        timerTiming,
        timerStartedAt,
        timerMeasuredAt,
        sessionRef.current?.startedAt ?? 0,
      );
      disconnectActiveRoom();

      const nextRoom = new Room(LIVEKIT_ROOM_OPTIONS);
      const handleDisconnected = (reason?: DisconnectReason) => {
        if (closeSentRef.current) return;
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
      const handleEncryptionError = () => {
        patchSession({
          mediaErrorText: 'Không thể mã hóa kết nối media.',
        });
      };
      const handleParticipantDisconnected = () => {
        const current = sessionRef.current;
        if (!current || closeSentRef.current) return;
        closeSentRef.current = true;
        finishSession();
      };
      const handleDataReceived = (
        payload: Uint8Array,
        _participant?: unknown,
        _kind?: unknown,
        topic?: string,
      ) => {
        if (topic !== LIVEKIT_CALL_DATA_TOPIC) return;
        const event = decodeLiveKitRoomData(payload);
        if (!event || event.callId !== callId) return;

        if (event.type === 'call_closed') {
          if (closeSentRef.current) return;
          closeSentRef.current = true;
          finishSession();
          return;
        }

        if (event.type === 'media_state') {
          patchSession({
            isRemoteMicrophoneMuted:
              typeof event.microphoneMuted === 'boolean'
                ? event.microphoneMuted
                : sessionRef.current?.isRemoteMicrophoneMuted,
            isRemoteCameraMuted:
              typeof event.cameraMuted === 'boolean'
                ? event.cameraMuted
                : sessionRef.current?.isRemoteCameraMuted,
          });
        }
      };

      nextRoom
        .on(RoomEvent.Disconnected, handleDisconnected)
        .on(RoomEvent.MediaDevicesError, handleMediaDeviceError)
        .on(RoomEvent.EncryptionError, handleEncryptionError)
        .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .on(RoomEvent.DataReceived, handleDataReceived);
      roomEventCleanupRef.current = () => {
        nextRoom
          .off(RoomEvent.Disconnected, handleDisconnected)
          .off(RoomEvent.MediaDevicesError, handleMediaDeviceError)
          .off(RoomEvent.EncryptionError, handleEncryptionError)
          .off(
            RoomEvent.ParticipantDisconnected,
            handleParticipantDisconnected,
          )
          .off(RoomEvent.DataReceived, handleDataReceived);
      };

      activeRoomRef.current = nextRoom;
      setActiveRoom(nextRoom);
      setSession(current => {
        const next: LiveKitCallSession | null = current
          ? {
              ...current,
              callId,
              callType,
              payload: nextPayload,
              peer: nextPayload.peer || current.peer,
              nativeCallUuid: callUuid,
              startedAt: initialStartedAt,
              elapsedSeconds: initialElapsedSeconds,
              phase: 'connecting',
              isMinimized: false,
            }
          : current;
        sessionRef.current = next;
        return next;
      });
      try {
        await nextRoom.connect(nextPayload.wsUrl, nextPayload.token);
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
      const elapsedSeconds = resolveServerElapsedSeconds(
        timerTiming,
        timerStartedAt,
        timerMeasuredAt,
      );
      const currentStartedAt = sessionRef.current?.startedAt ?? 0;
      patchSession({
        startedAt: resolveLocalStartedAtFromServer(
          timerTiming,
          timerStartedAt,
          timerMeasuredAt,
          currentStartedAt,
        ),
        elapsedSeconds,
        phase: 'connected',
        isLocalMicrophoneEnabled: true,
        isLocalCameraEnabled: callType === 'video',
      });
      if (callUuid) markNativeCallConnected(callUuid);
    },
    [disconnectActiveRoom, finishSession, patchSession, repository],
  );

  const joinAnsweredOutgoingCall = useCallback(
    async (
      callId: string,
      callType: LiveKitCallType,
      callUuid: string,
      timing?: LiveKitCallRealtimeTiming,
    ): Promise<boolean> => {
      const current = sessionRef.current;
      if (current?.phase === 'connected' && current.payload) return true;
      if (isJoiningAnsweredCallRef.current) return true;

      isJoiningAnsweredCallRef.current = true;
      clearRingTimers();
      try {
        await connectPayload(callId, callType, callUuid, timing);
        return true;
      } catch (caught) {
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Không thể kết nối cuộc gọi.',
        });
        return false;
      } finally {
        isJoiningAnsweredCallRef.current = false;
      }
    },
    [clearRingTimers, connectPayload, patchSession],
  );

  useEffect(() => {
    connectLiveKitCallRealtime();
    const cleanupAnswered = onLiveKitCallAnswered(event => {
      const current = sessionRef.current;
      if (!current || current.direction !== 'outgoing') return;
      if (current.callId !== event.callId) return;
      if (isFinalPhase(current.phase)) return;
      joinAnsweredOutgoingCall(
        event.callId,
        event.callType,
        current.nativeCallUuid,
        event,
      ).catch(() => undefined);
    });
    const handleFinished = () => {
      const current = sessionRef.current;
      if (!current || isFinalPhase(current.phase)) return;
      closeSentRef.current = true;
      finishSession();
    };
    const cleanupDeclined = onLiveKitCallDeclined(event => {
      const current = sessionRef.current;
      if (!current || current.callId !== event.callId) return;
      handleFinished();
    });
    const cleanupClosed = onLiveKitCallClosed(event => {
      const current = sessionRef.current;
      if (!current || current.callId !== event.callId) return;
      handleFinished();
    });

    return () => {
      cleanupAnswered();
      cleanupDeclined();
      cleanupClosed();
    };
  }, [finishSession, joinAnsweredOutgoingCall]);

  const startOutgoingCall = useCallback(
    (params: StartOutgoingCallParams) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        const isConnectedCall =
          current.phase === 'connected' ||
          current.phase === 'connecting' ||
          Boolean(current.payload);

        if (isConnectedCall || isSameOutgoingTarget(current, params)) {
          patchSession({ isMinimized: false });
          return;
        }

        clearRingTimers();
        disconnectActiveRoom();
        resetMediaState();
        if (current.nativeCallUuid) endNativeCall(current.nativeCallUuid);
        if (current.callId) {
          repository
            .closeCall({
              callId: current.callId,
              callType: current.callType,
              status: 'cancelled',
              duration: 0,
            })
            .catch(() => undefined);
        }
      }

      closeSentRef.current = false;
      clearRingTimers();
      const initialSession = buildInitialSession(params);
      sessionRef.current = initialSession;
      setSession(initialSession);

      async function boot() {
        const isGranted = await requestCallMediaPermissions(params.callType);
        if (!isGranted) {
          throw new Error(formatPermissionError(params.callType));
        }
        patchSession({ hasMediaPermissions: true });

        if (!params.recipientId) {
          throw new Error('Thiếu người nhận cuộc gọi.');
        }
        const recipientId = params.recipientId;

        const created = await repository.createCall({
          recipientId,
          callType: params.callType,
        });

        if (created.busy) {
          setSession(currentSession => {
            const next: LiveKitCallSession | null = currentSession
              ? {
                  ...currentSession,
                  callId: created.callId,
                  peer: params.peer ?? created.peer,
                  phase: 'error',
                  error: 'Người nhận đang bận.',
                }
              : currentSession;
            sessionRef.current = next;
            return next;
          });
          return;
        }

        const nextCallId = created.callId;
        if (!nextCallId || nextCallId === '0') {
          throw new Error('Không tạo được cuộc gọi.');
        }

        const nextUuid = createNativeCallUuid(nextCallId, params.callType);
        setSession(currentSession => {
          const next: LiveKitCallSession | null = currentSession
            ? {
                ...currentSession,
                callId: nextCallId,
                nativeCallUuid: nextUuid,
                peer: params.peer ?? created.peer,
                phase: 'ringing',
              }
            : currentSession;
          sessionRef.current = next;
          return next;
        });
        emitLiveKitCallCreated({
          callId: nextCallId,
          callType: params.callType,
          recipientId,
          roomName: created.roomName,
          peer: params.peer ?? created.peer,
        });

        const checkAnsweredAndJoin = async () => {
          const current = sessionRef.current;
          const roomState = activeRoomRef.current?.state;
          const isAlreadyJoiningOrConnected =
            current?.phase === 'connecting' ||
            current?.phase === 'connected' ||
            Boolean(current?.payload) ||
            (roomState !== undefined &&
              roomState !== ConnectionState.Disconnected);

          if (isAlreadyJoiningOrConnected) return true;
          if (
            !current ||
            current.direction !== 'outgoing' ||
            current.callId !== nextCallId ||
            current.phase !== 'ringing'
          ) {
            return true;
          }

          const status = await repository
            .checkCall({
              callId: nextCallId,
              callType: params.callType,
            })
            .catch(() => null);
          if (status?.active && status.status === 'answered') {
            await joinAnsweredOutgoingCall(
              nextCallId,
              params.callType,
              nextUuid,
              status,
            );
            return true;
          }
          return false;
        };

        answerWatchdogRef.current = setInterval(() => {
          if (isAnswerWatchdogCheckingRef.current) return;
          isAnswerWatchdogCheckingRef.current = true;
          checkAnsweredAndJoin()
            .then(joinedOrDone => {
              if (joinedOrDone) clearRingTimers();
            })
            .catch(() => undefined)
            .finally(() => {
              isAnswerWatchdogCheckingRef.current = false;
            });
        }, OUTGOING_ANSWER_WATCHDOG_INTERVAL_MS);

        ringTimeoutRef.current = setTimeout(() => {
          async function closeIfStillUnanswered() {
            if (await checkAnsweredAndJoin()) return;

            emitLiveKitCallClosed({
              callId: nextCallId,
              callType: params.callType,
              recipientId,
              status: 'no_answer',
              duration: 0,
            });
            await repository
              .closeCall({
                callId: nextCallId,
                callType: params.callType,
                status: 'no_answer',
                duration: 0,
              })
              .catch(() => undefined);
            closeSentRef.current = true;
            finishSession({ error: 'Không có phản hồi.' });
          }

          closeIfStillUnanswered().catch(() => undefined);
        }, OUTGOING_RING_TIMEOUT_MS);

        startNativeOutgoingCall({
          callUuid: nextUuid,
          callType: params.callType,
          peer: params.peer ?? created.peer,
        }).catch(() => undefined);
      }

      boot().catch(caught => {
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Không thể bắt đầu cuộc gọi.',
          hasMediaPermissions: false,
        });
      });
    },
    [
      clearRingTimers,
      disconnectActiveRoom,
      finishSession,
      joinAnsweredOutgoingCall,
      patchSession,
      repository,
      resetMediaState,
    ],
  );

  const answerIncomingCall = useCallback(
    (call: IncomingLiveKitCall) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        patchSession({ isMinimized: false });
        return;
      }

      closeSentRef.current = false;
      clearRingTimers();
      const params: LiveKitCallRouteParams = {
        callId: call.callId,
        callType: call.callType,
        direction: 'incoming',
        peer: call.peer,
      };
      const initialSession = {
        ...buildInitialSession(params),
        phase: 'answering',
      } satisfies LiveKitCallSession;
      sessionRef.current = initialSession;
      setSession(initialSession);

      async function boot() {
        const isGranted = await requestCallMediaPermissions(call.callType);
        if (!isGranted) {
          throw new Error(formatPermissionError(call.callType));
        }
        patchSession({ hasMediaPermissions: true });

        const nextUuid = createNativeCallUuid(call.callId, call.callType);
        patchSession({ nativeCallUuid: nextUuid });
        const answerTiming = await repository.answerCall({
          callId: call.callId,
          callType: call.callType,
        });
        if (call.peer.id) {
          emitLiveKitCallAnswered({
            callId: call.callId,
            callType: call.callType,
            recipientId: call.peer.id,
            startedAt: answerTiming.startedAt,
            startedAtMs: answerTiming.startedAtMs,
            serverNow: answerTiming.serverNow,
            serverNowMs: answerTiming.serverNowMs,
            elapsedSeconds: answerTiming.elapsedSeconds,
            elapsedMs: answerTiming.elapsedMs,
          });
        }
        await connectPayload(
          call.callId,
          call.callType,
          nextUuid,
          answerTiming,
        );
      }

      boot().catch(caught => {
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Không thể trả lời cuộc gọi.',
          hasMediaPermissions: false,
        });
      });
    },
    [clearRingTimers, connectPayload, patchSession, repository],
  );

  const ensureSessionFromRoute = useCallback(
    (params: LiveKitCallRouteParams) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        patchSession({ isMinimized: false });
        return;
      }

      if (params.direction === 'outgoing') {
        startOutgoingCall({ ...params, direction: 'outgoing' });
        return;
      }

      if (!params.callId) return;
      answerIncomingCall({
        callId: params.callId,
        callType: params.callType,
        provider: 'livekit',
        roomName: '',
        peer: params.peer ?? {
          id: '',
          name: 'Người dùng',
          avatar: '',
        },
      });
    },
    [answerIncomingCall, patchSession, startOutgoingCall],
  );

  const minimizeCall = useCallback(() => {
    const current = sessionRef.current;
    if (!current || isFinalPhase(current.phase)) return;
    patchSession({ isMinimized: true });
    exitCallRoomIfFocused();
  }, [patchSession]);

  const restoreCallRoom = useCallback(() => {
    const current = sessionRef.current;
    if (!current || isFinalPhase(current.phase) || !navigationRef.isReady()) {
      return;
    }

    patchSession({ isMinimized: false });
    navigationRef.navigate(ROUTES.CALL_ROOM, {
      callId: current.callId,
      callType: current.callType,
      direction: current.direction,
      peer: current.peer,
      recipientId: current.direction === 'outgoing' ? current.peer?.id : '',
    });
  }, [patchSession]);

  const toggleMic = useCallback(async () => {
    const current = sessionRef.current;
    const nextIsMicrophoneEnabled = !current?.isLocalMicrophoneEnabled;
    await mediaControllerRef.current?.toggleMic().catch(() => undefined);
    if (!current?.callId) return;
    publishRoomData({
      type: 'media_state',
      callId: current.callId,
      microphoneMuted: !nextIsMicrophoneEnabled,
      cameraMuted: !current.isLocalCameraEnabled,
    }).catch(() => undefined);
  }, [publishRoomData]);

  const toggleCamera = useCallback(async () => {
    const current = sessionRef.current;
    const nextIsCameraEnabled = !current?.isLocalCameraEnabled;
    await mediaControllerRef.current?.toggleCamera().catch(() => undefined);
    if (!current?.callId) return;
    publishRoomData({
      type: 'media_state',
      callId: current.callId,
      microphoneMuted: !current.isLocalMicrophoneEnabled,
      cameraMuted: !nextIsCameraEnabled,
    }).catch(() => undefined);
  }, [publishRoomData]);

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

  const handleLiveKitMediaController = useCallback(
    (controller: LiveKitMediaController | null) => {
      mediaControllerRef.current = controller;
    },
    [],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const current = sessionRef.current;
      if (!current?.startedAt || !canRunCallTimer(current.phase)) return;
      patchSession({ elapsedSeconds: durationSeconds() });
    }, 1000);

    return () => clearInterval(interval);
  }, [durationSeconds, patchSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      async function syncConnectedCall() {
        const current = sessionRef.current;
        if (!current || current.phase !== 'connected' || !current.callId) {
          return;
        }

        const status = await repository
          .checkCall({
            callId: current.callId,
            callType: current.callType,
          })
          .catch(() => null);
        if (!status) return;

        if (status.finished || !status.active) {
          closeSentRef.current = true;
          finishSession();
          return;
        }

        if (status.status === 'answered') {
          const measuredAt = Date.now();
          const startedAt = resolveLocalStartedAtFromServer(
            status,
            status.startedAt,
            measuredAt,
            current.startedAt,
          );
          if (Math.abs(startedAt - current.startedAt) < 1200) {
            return;
          }
          patchSession({
            startedAt,
            elapsedSeconds: Math.max(
              0,
              Math.floor((Date.now() - startedAt) / 1000),
            ),
          });
        }
      }

      syncConnectedCall().catch(() => undefined);
    }, CONNECTED_CALL_SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [finishSession, patchSession, repository]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') return;
      const current = sessionRef.current;
      connectLiveKitCallRealtime();
      if (!current) return;
      if (current.phase === 'connected') {
        AudioSession.startAudioSession().catch(() => undefined);
        return;
      }
      if (current.direction !== 'outgoing' || current.phase !== 'ringing') {
        return;
      }
      repository
        .checkCall({
          callId: current.callId,
          callType: current.callType,
        })
        .then(status => {
          if (status.active && status.status === 'answered') {
            return joinAnsweredOutgoingCall(
              current.callId,
              current.callType,
              current.nativeCallUuid,
              status,
            );
          }
          return false;
        })
        .catch(() => undefined);
    });

    return () => subscription.remove();
  }, [joinAnsweredOutgoingCall, repository]);

  useEffect(() => {
    return () => {
      clearRingTimers();
      resetMediaState();
    };
  }, [clearRingTimers, resetMediaState]);

  const statusText = resolveStatusText(session);
  const value = useMemo<LiveKitCallSessionContextValue>(
    () => ({
      session,
      statusText,
      isActive: Boolean(session && !isFinalPhase(session.phase)),
      startOutgoingCall,
      answerIncomingCall,
      ensureSessionFromRoute,
      minimizeCall,
      restoreCallRoom,
      endCall,
      toggleMic,
      toggleCamera,
      switchCamera,
      toggleSpeaker,
    }),
    [
      answerIncomingCall,
      endCall,
      ensureSessionFromRoute,
      minimizeCall,
      restoreCallRoom,
      session,
      startOutgoingCall,
      statusText,
      switchCamera,
      toggleCamera,
      toggleMic,
      toggleSpeaker,
    ],
  );

  return (
    <LiveKitCallSessionContext.Provider value={value}>
      {children}
      {session?.payload && session.hasMediaPermissions && activeRoom ? (
        <ActiveLiveKitRoom
          room={activeRoom}
          callType={session.callType}
          onMediaState={patchSession}
          onController={handleLiveKitMediaController}
        />
      ) : null}
    </LiveKitCallSessionContext.Provider>
  );
}

export function useLiveKitCallSession() {
  const context = useContext(LiveKitCallSessionContext);
  if (!context) {
    throw new Error(
      'useLiveKitCallSession must be used inside LiveKitCallSessionProvider.',
    );
  }
  return context;
}

export type { CallPhase, CloseReason, LiveKitCallSession };
