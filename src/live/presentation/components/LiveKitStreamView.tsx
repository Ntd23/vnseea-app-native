import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useTrackVolume,
  useTracks,
} from '@livekit/react-native';
import {
  ConnectionState,
  RoomEvent,
  Track,
  type RemoteTrackPublication,
  type VideoCaptureOptions,
} from 'livekit-client';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';
import type { LiveSession } from '../../domain/types/live.types';

type PermissionState = 'checking' | 'granted' | 'denied';
type RtcStatsSummary = {
  audioBytes: number;
  audioPackets: number;
  audioLevel: number;
  videoBytes: number;
  videoPackets: number;
  videoFrames: number;
};

type LiveTrackPublicationDebug = {
  kind?: unknown;
  source?: unknown;
  trackSid?: unknown;
  sid?: unknown;
  isMuted?: unknown;
  isSubscribed?: unknown;
  isDesired?: unknown;
  subscriptionStatus?: unknown;
  permissionStatus?: unknown;
  track?: {
    kind?: unknown;
    source?: unknown;
    sid?: unknown;
    isMuted?: unknown;
    mediaStreamTrack?: {
      id?: unknown;
      enabled?: unknown;
      muted?: unknown;
      readyState?: unknown;
    };
    getRTCStatsReport?: () => Promise<unknown>;
  };
};

type LiveParticipantDebug = {
  identity?: unknown;
  sid?: unknown;
  name?: unknown;
  isLocal?: unknown;
  getTrackPublication?: (source: Track.Source) => unknown;
  trackPublications?: {
    forEach?: (callback: (publication: unknown) => void) => void;
  };
};

type LiveRemoteAudioTrackDebug = {
  setVolume?: (volume: number) => void;
  mediaStreamTrack?: {
    _setVolume?: (volume: number) => void;
  };
};

const LIVE_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';
const LIVE_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
} as const;
const LIVE_CONNECT_OPTIONS = {
  autoSubscribe: true,
} as const;
const LIVE_VIDEO_ONLY_CONNECT_OPTIONS = {
  autoSubscribe: false,
} as const;
const LIVE_MEDIA_STATS_INTERVAL_MS = 1_000;
const LIVE_MEDIA_STATS_SAMPLES = 12;
const LIVE_AUDIO_VOLUME_INTERVAL_MS = 1_000;
const LIVE_AUDIO_VOLUME_SAMPLES = 12;

const absoluteFillStyle = {
  bottom: 0,
  left: 0,
  position: 'absolute' as const,
  right: 0,
  top: 0,
  width: '100%' as const,
  height: '100%' as const,
};

async function requestAndroidHostPermissions() {
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  return (
    result[PermissionsAndroid.PERMISSIONS.CAMERA] ===
      PermissionsAndroid.RESULTS.GRANTED &&
    result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

function logLiveDebug(event: string, data: Record<string, unknown> = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...data,
  };

  try {
    console.log(LIVE_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(LIVE_DEBUG_PREFIX, event, data);
  }
}

function readDebugString(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function readStatsEntries(report: unknown) {
  const entries: Array<Record<string, unknown>> = [];
  if (!report || typeof report !== 'object') return entries;

  const maybeForEach = report as {
    forEach?: (callback: (value: Record<string, unknown>) => void) => void;
  };
  if (typeof maybeForEach.forEach === 'function') {
    maybeForEach.forEach(value => entries.push(value));
    return entries;
  }

  if (Array.isArray(report)) {
    report.forEach(value => {
      if (value && typeof value === 'object') {
        entries.push(value as Record<string, unknown>);
      }
    });
  }

  return entries;
}

function getTrackPublicationBySource(
  participant: unknown,
  source: Track.Source,
) {
  const participantLike = participant as LiveParticipantDebug | undefined;
  const directPublication = participantLike?.getTrackPublication?.(source);
  if (directPublication) return directPublication as LiveTrackPublicationDebug;

  let matchedPublication: LiveTrackPublicationDebug | undefined;
  participantLike?.trackPublications?.forEach?.(publication => {
    const publicationLike = publication as LiveTrackPublicationDebug;
    if (publicationLike.source === source) {
      matchedPublication = publicationLike;
    }
  });

  return matchedPublication;
}

function getFirstRemoteTrackPublicationBySource(
  room: ReturnType<typeof useRoomContext>,
  source: Track.Source,
) {
  let matched:
    | {
        publication: LiveTrackPublicationDebug;
        participant: LiveParticipantDebug;
      }
    | undefined;

  room.remoteParticipants.forEach(participant => {
    if (matched) return;
    const publication = getTrackPublicationBySource(participant, source);
    if (publication) {
      matched = {
        publication,
        participant: participant as LiveParticipantDebug,
      };
    }
  });

  return matched;
}

async function summarizePublicationRtcStats(
  publication: LiveTrackPublicationDebug | undefined,
  type: 'outbound-rtp' | 'inbound-rtp',
) {
  const report = await publication?.track?.getRTCStatsReport?.();
  return summarizeRtcStats(report, type);
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function summarizeRtcStats(report: unknown, type: 'outbound-rtp' | 'inbound-rtp') {
  const summary: RtcStatsSummary = {
    audioBytes: 0,
    audioPackets: 0,
    audioLevel: 0,
    videoBytes: 0,
    videoPackets: 0,
    videoFrames: 0,
  };

  readStatsEntries(report).forEach(stat => {
    if (stat.type !== type) return;
    const kind = String(stat.kind ?? stat.mediaType ?? '').toLowerCase();
    const bytes = readNumber(stat.bytesSent ?? stat.bytesReceived);
    const packets = readNumber(stat.packetsSent ?? stat.packetsReceived);

    if (kind === 'audio') {
      summary.audioBytes += bytes;
      summary.audioPackets += packets;
      summary.audioLevel = Math.max(
        summary.audioLevel,
        readNumber(stat.audioLevel) || readNumber(stat.totalAudioEnergy),
      );
    }

    if (kind === 'video') {
      summary.videoBytes += bytes;
      summary.videoPackets += packets;
      summary.videoFrames += readNumber(
        stat.framesEncoded ?? stat.framesDecoded,
      );
    }
  });

  return summary;
}

function trackPublicationDebugPayload(
  publication?: LiveTrackPublicationDebug,
  participant?: LiveParticipantDebug,
) {
  const mediaStreamTrack = publication?.track?.mediaStreamTrack;

  return {
    trackKind: publication?.kind ?? publication?.track?.kind,
    trackSource: publication?.source ?? publication?.track?.source,
    trackSid: publication?.trackSid ?? publication?.sid ?? publication?.track?.sid,
    muted: publication?.isMuted ?? publication?.track?.isMuted,
    isSubscribed: publication?.isSubscribed,
    isDesired: publication?.isDesired,
    subscriptionStatus: readDebugString(publication?.subscriptionStatus),
    permissionStatus: readDebugString(publication?.permissionStatus),
    mediaStreamTrackId: mediaStreamTrack?.id,
    mediaStreamTrackEnabled: mediaStreamTrack?.enabled,
    mediaStreamTrackMuted: mediaStreamTrack?.muted,
    mediaStreamTrackReadyState: mediaStreamTrack?.readyState,
    participantIdentity: participant?.identity,
    participantSid: participant?.sid,
    participantName: participant?.name,
    participantIsLocal: participant?.isLocal,
  };
}

function setRemoteTrackVolume(track: unknown, volume: number) {
  const remoteAudioTrack = track as LiveRemoteAudioTrackDebug | undefined;
  if (typeof remoteAudioTrack?.setVolume === 'function') {
    remoteAudioTrack.setVolume(volume);
    return true;
  }

  const mediaStreamTrack = remoteAudioTrack?.mediaStreamTrack;
  if (typeof mediaStreamTrack?._setVolume === 'function') {
    mediaStreamTrack._setVolume(volume);
    return true;
  }

  return false;
}

function LiveAudioSessionBoundary({
  enabled,
  role,
  roomName,
  streamName,
  traceId,
  onReadyChange,
}: {
  enabled: boolean;
  role: 'host' | 'viewer';
  roomName: string;
  streamName: string;
  traceId: string;
  onReadyChange: (ready: boolean) => void;
}) {
  useEffect(() => {
    if (!enabled) {
      onReadyChange(false);
      return undefined;
    }

    let disposed = false;
    let started = false;
    onReadyChange(false);

    const start = async () => {
      try {
        await AudioSession.setDefaultRemoteAudioTrackVolume(1);
        await AudioSession.startAudioSession();
        started = true;

        if (disposed) {
          await AudioSession.stopAudioSession().catch(() => undefined);
          return;
        }

        logLiveDebug('live_audio_session_start_success', {
          role,
          roomName,
          streamName,
          traceId,
        });
        onReadyChange(true);
      } catch (error) {
        if (disposed) return;
        logLiveDebug('live_audio_session_start_error', {
          role,
          roomName,
          streamName,
          traceId,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
        onReadyChange(true);
      }
    };

    start().catch(() => undefined);

    return () => {
      disposed = true;
      onReadyChange(false);
      if (!started) return;

      AudioSession.stopAudioSession()
        .then(() => {
          logLiveDebug('live_audio_session_stop', {
            role,
            roomName,
            streamName,
            traceId,
          });
        })
        .catch(error => {
          logLiveDebug('live_audio_session_stop_error', {
            role,
            roomName,
            streamName,
            traceId,
            error: error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: String(error) },
          });
        });
    };
  }, [enabled, onReadyChange, role, roomName, streamName, traceId]);

  return null;
}

function LiveAudioPlaybackGate({
  role,
  roomName,
  streamName,
  traceId,
}: {
  role: 'host' | 'viewer';
  roomName: string;
  streamName: string;
  traceId: string;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const startedReasonsRef = useRef(new Set<string>());

  const startRoomAudio = useCallback(
    async (reason: string, track?: unknown) => {
      if (Platform.OS !== 'ios' || role !== 'viewer') return;
      if (track) setRemoteTrackVolume(track, 1);

      const attemptKey = `${reason}|${room.canPlaybackAudio ? 'allowed' : 'blocked'}`;
      if (startedReasonsRef.current.has(attemptKey) && room.canPlaybackAudio) {
        return;
      }
      startedReasonsRef.current.add(attemptKey);

      const canPlaybackAudioBefore = room.canPlaybackAudio;
      logLiveDebug('live_room_start_audio_attempt', {
        role,
        roomName,
        streamName,
        traceId,
        reason,
        canPlaybackAudioBefore,
      });

      try {
        await room.startAudio();
        logLiveDebug('live_room_start_audio_success', {
          role,
          roomName,
          streamName,
          traceId,
          reason,
          canPlaybackAudioBefore,
          canPlaybackAudioAfter: room.canPlaybackAudio,
        });
      } catch (error) {
        logLiveDebug('live_room_start_audio_error', {
          role,
          roomName,
          streamName,
          traceId,
          reason,
          canPlaybackAudioBefore,
          canPlaybackAudioAfter: room.canPlaybackAudio,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
      }
    },
    [role, room, roomName, streamName, traceId],
  );

  useEffect(() => {
    if (Platform.OS !== 'ios' || role !== 'viewer') return;
    if (connectionState === ConnectionState.Connected) {
      startRoomAudio('room_connected').catch(() => undefined);
    }
  }, [connectionState, role, startRoomAudio]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || role !== 'viewer') return undefined;

    const handleTrackSubscribed = (
      track?: unknown,
      publication?: unknown,
    ) => {
      const publicationLike = publication as LiveTrackPublicationDebug | undefined;
      const trackLike = track as { source?: unknown; kind?: unknown } | undefined;
      const isRemoteMicrophone =
        publicationLike?.source === Track.Source.Microphone ||
        trackLike?.source === Track.Source.Microphone;

      if (!isRemoteMicrophone) return;
      setRemoteTrackVolume(track, 1);
      if (!room.canPlaybackAudio) {
        startRoomAudio('remote_microphone_subscribed', track).catch(() => undefined);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    };
  }, [role, room, startRoomAudio]);

  return null;
}

function LiveMediaDiagnostics({
  role,
  roomName,
  streamName,
  traceId,
}: {
  role: 'host' | 'viewer';
  roomName: string;
  streamName: string;
  traceId: string;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const microphoneTracks = useTracks([Track.Source.Microphone]);
  const audioTrackRef = useMemo(() => {
    const trackRefs = microphoneTracks.filter(isTrackReference);
    const localTrack = trackRefs.find(item => item.participant.isLocal);
    const remoteTrack = trackRefs.find(item => !item.participant.isLocal);
    return role === 'host' ? localTrack : remoteTrack;
  }, [microphoneTracks, role]);
  const latestAudioVolume = useTrackVolume(audioTrackRef);
  const latestAudioVolumeRef = useRef(latestAudioVolume);

  useEffect(() => {
    latestAudioVolumeRef.current = latestAudioVolume;
  }, [latestAudioVolume]);

  useEffect(() => {
    const handleLocalTrackPublished = (publication?: unknown) => {
      logLiveDebug('live_track_published', {
        role,
        roomName,
        streamName,
        traceId,
        local: true,
        ...trackPublicationDebugPayload(
          publication as LiveTrackPublicationDebug,
          {
            identity: room.localParticipant.identity,
            sid: room.localParticipant.sid,
            name: room.localParticipant.name,
            isLocal: true,
          },
        ),
      });
    };

    const handleRemoteTrackPublished = (
      publication?: unknown,
      participant?: unknown,
    ) => {
      logLiveDebug('live_track_published', {
        role,
        roomName,
        streamName,
        traceId,
        local: false,
        ...trackPublicationDebugPayload(
          publication as LiveTrackPublicationDebug,
          participant as LiveParticipantDebug,
        ),
      });
    };

    const handleTrackSubscribed = (
      track?: unknown,
      publication?: unknown,
      participant?: unknown,
    ) => {
      logLiveDebug('live_track_subscribed', {
        role,
        roomName,
        streamName,
        traceId,
        ...trackPublicationDebugPayload(
          publication as LiveTrackPublicationDebug,
          participant as LiveParticipantDebug,
        ),
        subscribedTrackKind: (track as { kind?: unknown } | undefined)?.kind,
      });
    };

    const handleTrackUnsubscribed = (
      track?: unknown,
      publication?: unknown,
      participant?: unknown,
    ) => {
      logLiveDebug('live_track_unsubscribed', {
        role,
        roomName,
        streamName,
        traceId,
        ...trackPublicationDebugPayload(
          publication as LiveTrackPublicationDebug,
          participant as LiveParticipantDebug,
        ),
        unsubscribedTrackKind: (track as { kind?: unknown } | undefined)?.kind,
      });
    };

    const handleTrackMuted = (publication?: unknown, participant?: unknown) => {
      logLiveDebug('live_track_muted', {
        role,
        roomName,
        streamName,
        traceId,
        ...trackPublicationDebugPayload(
          publication as LiveTrackPublicationDebug,
          participant as LiveParticipantDebug,
        ),
      });
    };

    const handleTrackUnmuted = (publication?: unknown, participant?: unknown) => {
      logLiveDebug('live_track_unmuted', {
        role,
        roomName,
        streamName,
        traceId,
        ...trackPublicationDebugPayload(
          publication as LiveTrackPublicationDebug,
          participant as LiveParticipantDebug,
        ),
      });
    };

    const handleAudioPlaybackStatusChanged = () => {
      logLiveDebug('live_audio_playback_status_changed', {
        role,
        roomName,
        streamName,
        traceId,
        canPlaybackAudio: room.canPlaybackAudio,
      });
    };

    room
      .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      .on(RoomEvent.TrackPublished, handleRemoteTrackPublished)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.TrackMuted, handleTrackMuted)
      .on(RoomEvent.TrackUnmuted, handleTrackUnmuted)
      .on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackStatusChanged);

    return () => {
      room
        .off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
        .off(RoomEvent.TrackPublished, handleRemoteTrackPublished)
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .off(RoomEvent.TrackMuted, handleTrackMuted)
        .off(RoomEvent.TrackUnmuted, handleTrackUnmuted)
        .off(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackStatusChanged);
    };
  }, [role, room, roomName, streamName, traceId]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return undefined;
    let disposed = false;
    let sample = 0;

    const collect = async () => {
      sample += 1;
      try {
        const publisherStats =
          await room.engine.pcManager?.publisher?.getStats?.();
        const subscriberStats =
          await room.engine.pcManager?.subscriber?.getStats?.();
        const localAudioPublication = getTrackPublicationBySource(
          room.localParticipant,
          Track.Source.Microphone,
        );
        const remoteAudio = getFirstRemoteTrackPublicationBySource(
          room,
          Track.Source.Microphone,
        );
        const selectedAudioPublication =
          role === 'host' ? localAudioPublication : remoteAudio?.publication;
        const selectedAudioParticipant =
          role === 'host'
            ? ({
                identity: room.localParticipant.identity,
                sid: room.localParticipant.sid,
                name: room.localParticipant.name,
                isLocal: true,
              } satisfies LiveParticipantDebug)
            : remoteAudio?.participant;
        const selectedTrackStats = await summarizePublicationRtcStats(
          selectedAudioPublication,
          role === 'host' ? 'outbound-rtp' : 'inbound-rtp',
        );
        if (disposed) return;

        const outbound = summarizeRtcStats(publisherStats, 'outbound-rtp');
        const inbound = summarizeRtcStats(subscriberStats, 'inbound-rtp');
        logLiveDebug('live_audio_stats_core', {
          sample,
          role,
          roomName,
          streamName,
          traceId,
          roomSid: (room as { sid?: unknown }).sid,
          canPlaybackAudio: room.canPlaybackAudio,
          participantIdentity:
            selectedAudioParticipant?.identity ?? room.localParticipant.identity,
          participantSid:
            selectedAudioParticipant?.sid ?? room.localParticipant.sid,
          trackSid:
            selectedAudioPublication?.trackSid ??
            selectedAudioPublication?.sid ??
            selectedAudioPublication?.track?.sid,
          muted:
            selectedAudioPublication?.isMuted ??
            selectedAudioPublication?.track?.isMuted,
          subscribed: selectedAudioPublication?.isSubscribed,
          desired: selectedAudioPublication?.isDesired,
          readyState:
            selectedAudioPublication?.track?.mediaStreamTrack?.readyState,
          bytes: selectedTrackStats.audioBytes,
          packets: selectedTrackStats.audioPackets,
          audioLevel: selectedTrackStats.audioLevel,
          pcmVolume: latestAudioVolumeRef.current,
          outboundAudioBytes: outbound.audioBytes,
          outboundAudioPackets: outbound.audioPackets,
          outboundAudioLevel: outbound.audioLevel,
          inboundAudioBytes: inbound.audioBytes,
          inboundAudioPackets: inbound.audioPackets,
          inboundAudioLevel: inbound.audioLevel,
        });

        logLiveDebug('live_video_stats_core', {
          sample,
          role,
          roomName,
          streamName,
          traceId,
          roomSid: (room as { sid?: unknown }).sid,
          outboundVideoBytes: outbound.videoBytes,
          outboundVideoPackets: outbound.videoPackets,
          outboundVideoFrames: outbound.videoFrames,
          inboundVideoBytes: inbound.videoBytes,
          inboundVideoPackets: inbound.videoPackets,
          inboundVideoFrames: inbound.videoFrames,
        });
      } catch (error) {
        logLiveDebug('live_media_stats_error', {
          sample,
          role,
          roomName,
          streamName,
          traceId,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
      }
    };

    collect().catch(() => undefined);
    const interval = setInterval(() => {
      if (sample >= LIVE_MEDIA_STATS_SAMPLES) {
        clearInterval(interval);
        return;
      }
      collect().catch(() => undefined);
    }, LIVE_MEDIA_STATS_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [
    audioTrackRef,
    connectionState,
    latestAudioVolumeRef,
    role,
    room,
    roomName,
    streamName,
    traceId,
  ]);

  return null;
}

function LiveAudioVolumeDiagnostics({
  role,
  roomName,
  streamName,
  traceId,
}: {
  role: 'host' | 'viewer';
  roomName: string;
  streamName: string;
  traceId: string;
}) {
  const connectionState = useConnectionState();
  const microphoneTracks = useTracks([Track.Source.Microphone]);
  const audioTrackRef = useMemo(() => {
    const trackRefs = microphoneTracks.filter(isTrackReference);
    const localTrack = trackRefs.find(item => item.participant.isLocal);
    const remoteTrack = trackRefs.find(item => !item.participant.isLocal);
    return role === 'host' ? localTrack : remoteTrack;
  }, [microphoneTracks, role]);
  const volume = useTrackVolume(audioTrackRef);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected || !audioTrackRef) {
      return undefined;
    }

    let sample = 0;
    const logSample = () => {
      sample += 1;
      const payload = {
        sample,
        role,
        roomName,
        streamName,
        traceId,
        volume: volumeRef.current,
        ...trackPublicationDebugPayload(
          audioTrackRef.publication as LiveTrackPublicationDebug,
          audioTrackRef.participant as LiveParticipantDebug,
        ),
      };

      if (role === 'host') {
        logLiveDebug('live_host_local_audio_pcm_volume', payload);
      } else {
        logLiveDebug('live_viewer_remote_audio_pcm_volume', payload);
      }
    };

    logSample();
    const interval = setInterval(() => {
      if (sample >= LIVE_AUDIO_VOLUME_SAMPLES) {
        clearInterval(interval);
        return;
      }
      logSample();
    }, LIVE_AUDIO_VOLUME_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [
    audioTrackRef,
    connectionState,
    role,
    roomName,
    streamName,
    traceId,
  ]);

  return null;
}

function LiveVideoOnlySubscriptionController({ enabled }: { enabled: boolean }) {
  const room = useRoomContext();

  useEffect(() => {
    if (!enabled) return undefined;

    const syncPublication = (publication: RemoteTrackPublication) => {
      const shouldSubscribe =
        publication.source === Track.Source.Camera ||
        (publication.source === Track.Source.Unknown &&
          publication.kind === Track.Kind.Video);
      publication.setSubscribed(shouldSubscribe);
    };

    room.remoteParticipants.forEach(participant => {
      participant.trackPublications.forEach(publication => {
        syncPublication(publication as RemoteTrackPublication);
      });
    });

    const handleTrackPublished = (publication: RemoteTrackPublication) => {
      syncPublication(publication);
    };

    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    return () => {
      room.off(RoomEvent.TrackPublished, handleTrackPublished);
    };
  }, [enabled, room]);

  return null;
}

function LiveKitVideoSurface({
  isHost,
  cameraFacing,
  objectFit,
  onVideoReady,
}: {
  isHost: boolean;
  cameraFacing: 'front' | 'back';
  objectFit: 'contain' | 'cover';
  onVideoReady?: () => void;
}) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant } = useLocalParticipant();
  const [trackRenderKey, setTrackRenderKey] = useState(0);
  const desiredFacingMode = cameraFacing === 'front' ? 'user' : 'environment';
  const lastFacingModeRef = useRef(desiredFacingMode);

  const cameraTrack = useMemo(() => {
    const trackRefs = tracks.filter(isTrackReference);
    const localTrack = trackRefs.find(item => item.participant.isLocal);
    const remoteTrack = trackRefs.find(item => !item.participant.isLocal);
    return isHost ? localTrack ?? remoteTrack : remoteTrack ?? localTrack;
  }, [isHost, tracks]);

  useEffect(() => {
    if (cameraTrack) onVideoReady?.();
  }, [cameraTrack, onVideoReady]);

  useEffect(() => {
    if (!isHost) return;
    if (lastFacingModeRef.current === desiredFacingMode) return;
    const localCameraPublication = localParticipant.getTrackPublication(
      Track.Source.Camera,
    );
    const localCameraTrack = localCameraPublication?.track as
      | { restartTrack?: (options: { facingMode: string }) => Promise<void> }
      | undefined;
    if (typeof localCameraTrack?.restartTrack !== 'function') return;

    lastFacingModeRef.current = desiredFacingMode;
    localCameraTrack
      .restartTrack({ facingMode: desiredFacingMode })
      .then(() => {
        setTrackRenderKey(key => key + 1);
        logLiveDebug('live_camera_restarted', {
          facingMode: desiredFacingMode,
        });
      })
      .catch(error => {
        logLiveDebug('live_camera_restart_error', {
          facingMode: desiredFacingMode,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
      });
  }, [desiredFacingMode, isHost, localParticipant]);

  if (cameraTrack) {
    return (
      <VideoTrack
        key={`camera-${trackRenderKey}`}
        trackRef={cameraTrack}
        objectFit={isHost ? 'cover' : objectFit}
        mirror={isHost && cameraTrack.participant.isLocal && cameraFacing === 'front'}
        style={absoluteFillStyle}
      />
    );
  }

  return (
    <View style={styles.placeholder}>
      <ActivityIndicator color="#ffffff" />
      <Text style={styles.placeholderText}>
        {isHost ? 'Đang bật camera live...' : 'Đang chờ tín hiệu video...'}
      </Text>
    </View>
  );
}

export type LiveKitStreamViewProps = {
  session: LiveSession;
  isHost: boolean;
  cameraFacing?: 'front' | 'back';
  audioEnabled?: boolean;
  diagnosticsEnabled?: boolean;
  objectFit?: 'contain' | 'cover';
  onVideoReady?: () => void;
  onConnectionStateChange?: (
    state: 'connected' | 'disconnected' | 'error',
  ) => void;
};

export function LiveKitStreamView({
  session,
  isHost,
  cameraFacing = 'front',
  audioEnabled = true,
  diagnosticsEnabled = true,
  objectFit = 'contain',
  onVideoReady,
  onConnectionStateChange,
}: LiveKitStreamViewProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>(
    isHost && (Platform.OS === 'android' || Platform.OS === 'ios')
      ? 'checking'
      : 'granted',
  );
  const [connectionMessage, setConnectionMessage] = useState('Đang kết nối live...');
  const [liveAudioSessionReady, setLiveAudioSessionReady] = useState(false);
  const connectStartLoggedRef = useRef('');
  const deviceTraceIdRef = useRef(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const liveRole = isHost ? 'host' : 'viewer';
  const canPrepareLiveAudioSession = Boolean(
    session.wsUrl && session.token && permissionState === 'granted',
  );
  const canConnectLiveKitRoom =
    canPrepareLiveAudioSession && (!audioEnabled || liveAudioSessionReady);
  const connectOptions =
    isHost || audioEnabled
      ? LIVE_CONNECT_OPTIONS
      : LIVE_VIDEO_ONLY_CONNECT_OPTIONS;
  const traceId = useMemo(
    () => `${session.roomName}|${liveRole}|${deviceTraceIdRef.current}`,
    [liveRole, session.roomName],
  );
  const hostVideoCaptureOptions = useMemo<false | VideoCaptureOptions>(() => {
    if (!isHost) return false;
    return {
      facingMode: cameraFacing === 'front' ? 'user' : 'environment',
    };
  }, [cameraFacing, isHost]);

  const requestPermissions = useCallback(async () => {
    if (!isHost) {
      setPermissionState('granted');
      return;
    }

    if (Platform.OS === 'ios') {
      setPermissionState('checking');
      const granted = await requestCallMediaPermissions('video');
      setPermissionState(granted ? 'granted' : 'denied');
      return;
    }

    if (Platform.OS !== 'android') {
      setPermissionState('granted');
      return;
    }

    setPermissionState('checking');
    const granted = await requestAndroidHostPermissions();
    setPermissionState(granted ? 'granted' : 'denied');
  }, [isHost]);

  useEffect(() => {
    requestPermissions().catch(error => {
      console.error('[LiveKit] permission error:', error);
      setPermissionState('denied');
    });
  }, [requestPermissions]);

  useEffect(() => {
    logLiveDebug('live_view_mount', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
      traceId,
    });
    return () => {
      logLiveDebug('live_view_unmount', {
        role: liveRole,
        roomName: session.roomName,
        streamName: session.streamName,
        traceId,
      });
    };
  }, [liveRole, session.roomName, session.streamName, traceId]);

  useEffect(() => {
    if (!canConnectLiveKitRoom) return;
    const connectKey = `${liveRole}|${session.roomName}|${session.streamName}`;
    if (connectStartLoggedRef.current === connectKey) return;
    connectStartLoggedRef.current = connectKey;
    logLiveDebug('live_room_connect_start', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
      traceId,
      wsUrl: session.wsUrl,
      tokenLength: session.token.length,
      autoSubscribe: connectOptions.autoSubscribe,
      audio: isHost,
      video: Boolean(hostVideoCaptureOptions),
    });
  }, [
    canConnectLiveKitRoom,
    connectOptions.autoSubscribe,
    hostVideoCaptureOptions,
    isHost,
    liveRole,
    session.roomName,
    session.streamName,
    session.token.length,
    session.wsUrl,
    traceId,
  ]);

  const handleConnected = useCallback(() => {
    logLiveDebug('live_room_connected', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
      traceId,
    });
    setConnectionMessage('');
    onConnectionStateChange?.('connected');
  }, [
    liveRole,
    onConnectionStateChange,
    session.roomName,
    session.streamName,
    traceId,
  ]);

  const handleDisconnected = useCallback(() => {
    logLiveDebug('live_room_disconnected', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
      traceId,
    });
    setConnectionMessage('Đã ngắt kết nối live');
    onConnectionStateChange?.('disconnected');
  }, [
    liveRole,
    onConnectionStateChange,
    session.roomName,
    session.streamName,
    traceId,
  ]);

  const handleError = useCallback((error: unknown) => {
    logLiveDebug('live_room_error', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
      traceId,
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
    });
    setConnectionMessage('Không kết nối được live');
    onConnectionStateChange?.('error');
  }, [
    liveRole,
    onConnectionStateChange,
    session.roomName,
    session.streamName,
    traceId,
  ]);

  if (!session.wsUrl || !session.token) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Chưa có phiên live</Text>
        <Text style={styles.placeholderText}>
          Backend chưa trả token LiveKit cho phòng này.
        </Text>
      </View>
    );
  }

  if (permissionState === 'checking') {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.placeholderText}>Đang xin quyền camera và mic...</Text>
      </View>
    );
  }

  if (permissionState === 'denied') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Chưa có quyền camera</Text>
        <Text style={styles.placeholderText}>
          Vui lòng cấp quyền Camera và Microphone để phát live.
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={requestPermissions}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const audioSessionBoundary = audioEnabled ? (
    <LiveAudioSessionBoundary
      enabled={canPrepareLiveAudioSession}
      role={liveRole}
      roomName={session.roomName}
      streamName={session.streamName}
      traceId={traceId}
      onReadyChange={setLiveAudioSessionReady}
    />
  ) : null;

  if (audioEnabled && !liveAudioSessionReady) {
    return (
      <>
        {audioSessionBoundary}
        <View style={styles.placeholder}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.placeholderText}>
            Đang chuẩn bị âm thanh live...
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      {audioSessionBoundary}
      <LiveKitRoom
        serverUrl={session.wsUrl}
        token={session.token}
        connect={canConnectLiveKitRoom}
        audio={isHost}
        video={hostVideoCaptureOptions}
        options={LIVE_ROOM_OPTIONS}
        connectOptions={connectOptions}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
        onMediaDeviceFailure={failure => {
          logLiveDebug('live_media_device_failure', {
            role: liveRole,
            roomName: session.roomName,
            streamName: session.streamName,
            traceId,
            failure,
          });
          setConnectionMessage('Không mở được camera hoặc mic');
        }}
      >
        <View style={styles.container}>
          <LiveVideoOnlySubscriptionController
            enabled={!isHost && !audioEnabled}
          />
          {diagnosticsEnabled ? (
            <LiveMediaDiagnostics
              role={liveRole}
              roomName={session.roomName}
              streamName={session.streamName}
              traceId={traceId}
            />
          ) : null}
          {audioEnabled ? (
            <LiveAudioPlaybackGate
              role={liveRole}
              roomName={session.roomName}
              streamName={session.streamName}
              traceId={traceId}
            />
          ) : null}
          {diagnosticsEnabled && audioEnabled ? (
            <LiveAudioVolumeDiagnostics
              role={liveRole}
              roomName={session.roomName}
              streamName={session.streamName}
              traceId={traceId}
            />
          ) : null}
          <LiveKitVideoSurface
            isHost={isHost}
            cameraFacing={cameraFacing}
            objectFit={objectFit}
            onVideoReady={onVideoReady}
          />
          {connectionMessage ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{connectionMessage}</Text>
            </View>
          ) : null}
        </View>
      </LiveKitRoom>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...absoluteFillStyle,
    backgroundColor: '#020617',
  },
  permissionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  permissionButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  placeholder: {
    ...absoluteFillStyle,
    alignItems: 'center',
    backgroundColor: '#020617',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  placeholderTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    bottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
