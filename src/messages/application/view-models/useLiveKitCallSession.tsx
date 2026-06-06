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
const OUTGOING_POLL_INTERVAL_MS = 750;
const CONNECTED_POLL_INTERVAL_MS = 2_000;
const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: { pixelDensity: 'screen' },
} as const;

const LiveKitCallSessionContext =
  createContext<LiveKitCallSessionContextValue | null>(null);

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
    ? 'Báº¡n cáº§n cáº¥p quyá»n mic vÃ  camera Ä‘á»ƒ tham gia cuá»™c gá»i.'
    : 'Báº¡n cáº§n cáº¥p quyá»n mic Ä‘á»ƒ tham gia cuá»™c gá»i.';
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

function resolveStatusText(session: LiveKitCallSession | null) {
  if (!session) return '';

  const statusMap: Record<CallPhase, string> = {
    initializing: 'Äang chuáº©n bá»‹ cuá»™c gá»i...',
    ringing: 'Äang gá»i...',
    answering: 'Äang tráº£ lá»i...',
    connecting: 'Äang káº¿t ná»‘i LiveKit...',
    connected: 'ÄÃ£ káº¿t ná»‘i',
    ended: 'Cuá»™c gá»i Ä‘Ã£ káº¿t thÃºc',
    error: session.error || 'KhÃ´ng thá»ƒ thá»±c hiá»‡n cuá»™c gá»i.',
  };
  return statusMap[session.phase];
}

function buildInitialSession(
  params: LiveKitCallRouteParams,
): LiveKitCallSession {
  const callId = params.callId ?? '';
  return {
    callId,
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
    isLocalMicrophoneEnabled: true,
    isLocalCameraEnabled: params.callType === 'video',
    isSpeakerEnabled: true,
    isRemoteMicrophoneMuted: true,
    isRemoteCameraMuted: true,
  };
}

function resolveServerElapsedSeconds(
  timing: { elapsedSeconds?: number; serverNow?: number },
  startedAt = 0,
) {
  if (
    typeof timing.elapsedSeconds === 'number' &&
    Number.isFinite(timing.elapsedSeconds) &&
    timing.elapsedSeconds > 0
  ) {
    return Math.floor(timing.elapsedSeconds);
  }

  if (
    startedAt > 0 &&
    typeof timing.serverNow === 'number' &&
    Number.isFinite(timing.serverNow) &&
    timing.serverNow > 0
  ) {
    return Math.max(0, Math.floor(timing.serverNow - startedAt));
  }

  return 0;
}

function localStartedAtFromElapsed(elapsedSeconds: number) {
  return Date.now() - Math.max(0, elapsedSeconds) * 1000;
}

function exitCallRoomIfFocused() {
  if (!navigationRef.isReady()) return;
  if (navigationRef.getCurrentRoute()?.name !== ROUTES.CALL_ROOM) return;
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
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
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  const patchSession = useCallback((patch: Partial<LiveKitCallSession>) => {
    setSession(current => {
      if (!current) return current;

      const hasChanged = Object.entries(patch).some(
        ([key, value]) => current[key as keyof LiveKitCallSession] !== value,
      );
      return hasChanged ? { ...current, ...patch } : current;
    });
  }, []);

  const clearRingTimers = useCallback(() => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    if (ringPollRef.current) clearInterval(ringPollRef.current);
    ringTimeoutRef.current = null;
    ringPollRef.current = null;
  }, []);

  const disconnectActiveRoom = useCallback(() => {
    roomEventCleanupRef.current?.();
    roomEventCleanupRef.current = null;
    const room = activeRoomRef.current;
    activeRoomRef.current = null;
    setActiveRoom(null);
    room?.disconnect(true).catch(() => undefined);
  }, []);

  const durationSeconds = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000));
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
      setSession(currentSession =>
        currentSession
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
          : null,
      );
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
    [durationSeconds, finishSession, repository],
  );

  const connectPayload = useCallback(
    async (callId: string, callType: LiveKitCallType, callUuid: string) => {
      patchSession({ phase: 'connecting' });
      await AudioSession.startAudioSession().catch(() => undefined);
      const nextPayload = await repository.getJoinPayload({ callId, callType });
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

      nextRoom
        .on(RoomEvent.Disconnected, handleDisconnected)
        .on(RoomEvent.MediaDevicesError, handleMediaDeviceError)
        .on(RoomEvent.EncryptionError, handleEncryptionError);
      roomEventCleanupRef.current = () => {
        nextRoom
          .off(RoomEvent.Disconnected, handleDisconnected)
          .off(RoomEvent.MediaDevicesError, handleMediaDeviceError)
          .off(RoomEvent.EncryptionError, handleEncryptionError);
      };

      activeRoomRef.current = nextRoom;
      setActiveRoom(nextRoom);
      setSession(current =>
        current
          ? {
              ...current,
              callId,
              callType,
              payload: nextPayload,
              peer: nextPayload.peer || current.peer,
              nativeCallUuid: callUuid,
              phase: 'connecting',
              isMinimized: false,
            }
          : current,
      );
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
        nextPayload,
        nextPayload.call.startedAt,
      );
      patchSession({
        startedAt: localStartedAtFromElapsed(elapsedSeconds),
        elapsedSeconds,
        phase: 'connected',
        isLocalMicrophoneEnabled: true,
        isLocalCameraEnabled: callType === 'video',
      });
      if (callUuid) markNativeCallConnected(callUuid);
    },
    [disconnectActiveRoom, patchSession, repository],
  );

  const startOutgoingCall = useCallback(
    (params: StartOutgoingCallParams) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        patchSession({ isMinimized: false });
        return;
      }

      closeSentRef.current = false;
      clearRingTimers();
      const initialSession = buildInitialSession(params);
      setSession(initialSession);

      async function boot() {
        const isGranted = await requestCallMediaPermissions(params.callType);
        if (!isGranted) {
          throw new Error(formatPermissionError(params.callType));
        }
        patchSession({ hasMediaPermissions: true });

        if (!params.recipientId) {
          throw new Error('Thiáº¿u ngÆ°á»i nháº­n cuá»™c gá»i.');
        }

        const created = await repository.createCall({
          recipientId: params.recipientId,
          callType: params.callType,
        });

        if (created.busy) {
          setSession(currentSession =>
            currentSession
              ? {
                  ...currentSession,
                  callId: created.callId,
                  peer: params.peer ?? created.peer,
                  phase: 'error',
                  error: 'NgÆ°á»i nháº­n Ä‘ang báº­n.',
                }
              : currentSession,
          );
          return;
        }

        const nextCallId = created.callId;
        if (!nextCallId || nextCallId === '0') {
          throw new Error('KhÃ´ng táº¡o Ä‘Æ°á»£c cuá»™c gá»i.');
        }

        const nextUuid = createNativeCallUuid(nextCallId, params.callType);
        setSession(currentSession =>
          currentSession
            ? {
                ...currentSession,
                callId: nextCallId,
                nativeCallUuid: nextUuid,
                peer: params.peer ?? created.peer,
                phase: 'ringing',
              }
            : currentSession,
        );
        await startNativeOutgoingCall({
          callUuid: nextUuid,
          callType: params.callType,
          peer: params.peer ?? created.peer,
        });

        ringTimeoutRef.current = setTimeout(() => {
          repository
            .closeCall({
              callId: nextCallId,
              callType: params.callType,
              status: 'no_answer',
              duration: 0,
            })
            .catch(() => undefined);
          closeSentRef.current = true;
          finishSession({ error: 'KhÃ´ng cÃ³ pháº£n há»“i.' });
        }, OUTGOING_RING_TIMEOUT_MS);

        ringPollRef.current = setInterval(async () => {
          const result = await repository
            .checkCall({
              callId: nextCallId,
              callType: params.callType,
            })
            .catch(() => null);
          if (!result) return;

          if (result.status === 'answered' && result.active) {
            clearRingTimers();
            await connectPayload(nextCallId, params.callType, nextUuid).catch(
              caught => {
                patchSession({
                  phase: 'error',
                  error:
                    caught instanceof Error
                      ? caught.message
                      : 'KhÃ´ng thá»ƒ káº¿t ná»‘i LiveKit.',
                });
              },
            );
          } else if (result.finished) {
            closeSentRef.current = true;
            finishSession();
          }
        }, OUTGOING_POLL_INTERVAL_MS);
      }

      boot().catch(caught => {
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'KhÃ´ng thá»ƒ báº¯t Ä‘áº§u cuá»™c gá»i.',
          hasMediaPermissions: false,
        });
      });
    },
    [clearRingTimers, connectPayload, finishSession, patchSession, repository],
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
      setSession({
        ...buildInitialSession(params),
        phase: 'answering',
      });

      async function boot() {
        const isGranted = await requestCallMediaPermissions(call.callType);
        if (!isGranted) {
          throw new Error(formatPermissionError(call.callType));
        }
        patchSession({ hasMediaPermissions: true });

        const nextUuid = createNativeCallUuid(call.callId, call.callType);
        patchSession({ nativeCallUuid: nextUuid });
        await repository.answerCall({
          callId: call.callId,
          callType: call.callType,
        });
        await connectPayload(call.callId, call.callType, nextUuid);
      }

      boot().catch(caught => {
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'KhÃ´ng thá»ƒ tráº£ lá»i cuá»™c gá»i.',
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
          name: 'NgÆ°á»i dÃ¹ng',
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

  const handleLiveKitMediaController = useCallback(
    (controller: LiveKitMediaController | null) => {
      mediaControllerRef.current = controller;
    },
    [],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const current = sessionRef.current;
      if (!current?.startedAt || current.phase !== 'connected') return;
      patchSession({ elapsedSeconds: durationSeconds() });
    }, 1000);

    return () => clearInterval(interval);
  }, [durationSeconds, patchSession]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const current = sessionRef.current;
      if (!current || current.phase !== 'connected' || !current.callId) return;

      const result = await repository
        .checkCall({
          callId: current.callId,
          callType: current.callType,
        })
        .catch(() => null);

      if (!result) return;
      if (result.finished) {
        closeSentRef.current = true;
        finishSession();
        return;
      }

      if (result.active && result.status === 'answered') {
        const elapsedSeconds = resolveServerElapsedSeconds(
          result,
          result.startedAt,
        );
        if (elapsedSeconds > 0) {
          patchSession({
            startedAt: localStartedAtFromElapsed(elapsedSeconds),
            elapsedSeconds,
          });
        }
      }
    }, CONNECTED_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [finishSession, patchSession, repository]);

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
