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
  LiveKitRoom,
  RoomContext,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useRoomContext,
  useTracks,
  useLocalParticipant,
} from '@livekit/react-native';
import { ConnectionState, Room, RoomEvent, Track } from 'livekit-client';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';
import type { LiveSession } from '../../domain/types/live.types';

type PermissionState = 'checking' | 'granted' | 'denied';
type LiveAudioStatsDirection = 'outbound' | 'inbound';

type VnseeaLiveKitAudioRuntime = {
  setIosRealtimeMediaAudioActive?: (
    active: boolean,
    context: Record<string, unknown>,
  ) => void;
};

const liveKitAudioRuntime = require('../../../shared-kernel/infrastructure/livekit/registerLiveKitGlobals') as VnseeaLiveKitAudioRuntime;
const LIVE_AUDIO_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';
const LIVE_AUDIO_STATS_PROBE_INTERVAL_MS = 1_000;
const LIVE_AUDIO_STATS_PROBE_SAMPLES = 12;
const LIVE_REMOTE_SUBSCRIPTION_TIMEOUT_MS = 2_000;

type LiveTrackPublicationLike = {
  kind?: string;
  source?: string;
  trackSid?: string;
  sid?: string;
  isMuted?: boolean;
  isSubscribed?: boolean;
  isDesired?: boolean;
  subscriptionStatus?: unknown;
  permissionStatus?: unknown;
  setSubscribed?: (subscribed: boolean) => void;
  track?: {
    kind?: string;
    source?: string;
    sid?: string;
    isMuted?: boolean;
  };
};

type LiveTrackPublicationCollection = {
  forEach: (callback: (publication: LiveTrackPublicationLike) => void) => void;
};

type LiveParticipantLike = {
  identity?: string;
  sid?: string;
  name?: string;
  isLocal?: boolean;
  trackPublications?: LiveTrackPublicationCollection;
  audioTrackPublications?: LiveTrackPublicationCollection;
  videoTrackPublications?: LiveTrackPublicationCollection;
};

type LiveRemoteSubscriptionDebugContext = {
  roomName: string;
  streamName: string;
  reason: string;
};

type PendingLiveRemoteSubscription = {
  timeoutId: ReturnType<typeof setTimeout>;
  retried: boolean;
  publication: LiveTrackPublicationLike;
  participant?: LiveParticipantLike;
  context: LiveRemoteSubscriptionDebugContext;
};

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

function logLiveAudioDebug(event: string, data: Record<string, unknown> = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...data,
  };

  try {
    console.log(LIVE_AUDIO_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(LIVE_AUDIO_DEBUG_PREFIX, event, data);
  }
}

function liveDebugValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function liveTrackDebugPayload(
  publication?: LiveTrackPublicationLike,
  participant?: LiveParticipantLike,
) {
  return {
    trackKind: publication?.kind ?? publication?.track?.kind,
    trackSource: publication?.source ?? publication?.track?.source,
    trackSid: publication?.trackSid ?? publication?.sid ?? publication?.track?.sid,
    muted: publication?.isMuted ?? publication?.track?.isMuted,
    isSubscribed: publication?.isSubscribed,
    isDesired: publication?.isDesired,
    subscriptionStatus: liveDebugValue(publication?.subscriptionStatus),
    permissionStatus: liveDebugValue(publication?.permissionStatus),
    participantIdentity: participant?.identity,
    participantSid: participant?.sid,
    participantName: participant?.name,
    participantIsLocal: participant?.isLocal,
  };
}

function isLiveAudioPublication(publication?: LiveTrackPublicationLike) {
  const kind = String(publication?.kind ?? publication?.track?.kind ?? '')
    .toLowerCase();
  const source = String(publication?.source ?? publication?.track?.source ?? '')
    .toLowerCase();
  return kind === 'audio' || source === Track.Source.Microphone || source === 'microphone';
}

function shouldSubscribeLiveRemotePublication(
  publication?: LiveTrackPublicationLike,
): publication is LiveTrackPublicationLike & {
  setSubscribed: (subscribed: boolean) => void;
} {
  if (!publication || typeof publication.setSubscribed !== 'function') {
    return false;
  }
  const kind = String(publication.kind ?? publication.track?.kind ?? '')
    .toLowerCase();
  const source = String(publication.source ?? publication.track?.source ?? '')
    .toLowerCase();
  return (
    kind === 'audio' ||
    kind === 'video' ||
    source === Track.Source.Microphone ||
    source === Track.Source.Camera ||
    source === 'microphone' ||
    source === 'camera'
  );
}

function liveRemoteSubscriptionDebugPayload(
  context: LiveRemoteSubscriptionDebugContext,
  publication?: LiveTrackPublicationLike,
  participant?: LiveParticipantLike,
) {
  return {
    roomName: context.roomName,
    streamName: context.streamName,
    reason: context.reason,
    ...liveTrackDebugPayload(publication, participant),
  };
}

function clearLiveRemoteTrackSubscriptionTimeout(
  pendingSubscriptions: Map<string, PendingLiveRemoteSubscription>,
  trackSid?: string,
) {
  if (!trackSid) return;
  const pending = pendingSubscriptions.get(trackSid);
  if (!pending) return;
  clearTimeout(pending.timeoutId);
  pendingSubscriptions.delete(trackSid);
}

function clearAllLiveRemoteTrackSubscriptionTimeouts(
  pendingSubscriptions: Map<string, PendingLiveRemoteSubscription>,
) {
  pendingSubscriptions.forEach(pending => {
    clearTimeout(pending.timeoutId);
  });
  pendingSubscriptions.clear();
}

function scheduleLiveRemoteTrackSubscriptionTimeout(
  params: {
    pendingSubscriptions: Map<string, PendingLiveRemoteSubscription>;
    publication: LiveTrackPublicationLike;
    participant?: LiveParticipantLike;
    context: LiveRemoteSubscriptionDebugContext;
  },
  retried = false,
) {
  const {
    pendingSubscriptions,
    publication,
    participant,
    context,
  } = params;
  const trackSid = publication.trackSid ?? publication.sid ?? publication.track?.sid;
  if (!trackSid) return;

  clearLiveRemoteTrackSubscriptionTimeout(pendingSubscriptions, trackSid);
  const timeoutId = setTimeout(() => {
    const pending = pendingSubscriptions.get(trackSid);
    if (!pending) return;
    if (publication.isSubscribed) {
      clearLiveRemoteTrackSubscriptionTimeout(pendingSubscriptions, trackSid);
      return;
    }

    logLiveAudioDebug('live_remote_track_subscription_timeout', {
      ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
      retried: pending.retried,
      timeoutMs: LIVE_REMOTE_SUBSCRIPTION_TIMEOUT_MS,
    });

    if (pending.retried) {
      pendingSubscriptions.delete(trackSid);
      return;
    }

    logLiveAudioDebug('live_remote_track_subscription_retry', {
      ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
      retryAttempt: 1,
    });

    try {
      if (typeof publication.setSubscribed !== 'function') {
        throw new Error('Remote publication cannot be subscribed.');
      }
      publication.setSubscribed(false);
      publication.setSubscribed(true);
      logLiveAudioDebug('live_remote_track_subscription_retry_applied', {
        ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
        retryAttempt: 1,
      });
      scheduleLiveRemoteTrackSubscriptionTimeout(
        {
          pendingSubscriptions,
          publication,
          participant,
          context,
        },
        true,
      );
    } catch (error) {
      logLiveAudioDebug('live_remote_track_subscription_failed', {
        ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
        retryAttempt: 1,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      });
      pendingSubscriptions.delete(trackSid);
    }
  }, LIVE_REMOTE_SUBSCRIPTION_TIMEOUT_MS);

  pendingSubscriptions.set(trackSid, {
    timeoutId,
    retried,
    publication,
    participant,
    context,
  });
}

function requestLiveRemoteTrackSubscription(params: {
  publication?: LiveTrackPublicationLike;
  participant?: LiveParticipantLike;
  roomName: string;
  streamName: string;
  reason: string;
  onSubscriptionRequested?: (params: {
    publication: LiveTrackPublicationLike;
    participant?: LiveParticipantLike;
    context: LiveRemoteSubscriptionDebugContext;
  }) => void;
}) {
  const {
    publication,
    participant,
    roomName,
    streamName,
    reason,
    onSubscriptionRequested,
  } = params;
  if (!shouldSubscribeLiveRemotePublication(publication)) return false;
  if (publication.isSubscribed) return false;
  const context = { roomName, streamName, reason };

  logLiveAudioDebug('live_remote_track_subscription_requested', {
    ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
  });

  try {
    publication.setSubscribed(true);
    onSubscriptionRequested?.({
      publication,
      participant,
      context,
    });
    return true;
  } catch (error) {
    logLiveAudioDebug('live_remote_track_subscription_failed', {
      ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
    });
    return false;
  }
}

function requestLiveRemoteParticipantTrackSubscriptions(params: {
  participant?: LiveParticipantLike;
  roomName: string;
  streamName: string;
  reason: string;
  onSubscriptionRequested?: (params: {
    publication: LiveTrackPublicationLike;
    participant?: LiveParticipantLike;
    context: LiveRemoteSubscriptionDebugContext;
  }) => void;
}) {
  const {
    participant,
    roomName,
    streamName,
    reason,
    onSubscriptionRequested,
  } = params;
  const seenTrackSids = new Set<string>();
  const visit = (publication: LiveTrackPublicationLike) => {
    const trackSid = publication.trackSid ?? '';
    if (trackSid && seenTrackSids.has(trackSid)) return;
    if (trackSid) seenTrackSids.add(trackSid);
    requestLiveRemoteTrackSubscription({
      publication,
      participant,
      roomName,
      streamName,
      reason,
      onSubscriptionRequested,
    });
  };

  participant?.trackPublications?.forEach(visit);
  participant?.audioTrackPublications?.forEach(visit);
  participant?.videoTrackPublications?.forEach(visit);
}

function setIosLiveStreamAudioActive(params: {
  active: boolean;
  isHost: boolean;
  roomName: string;
  streamName: string;
  stage: 'mount' | 'unmount' | 'connected' | 'disconnected' | 'error';
}) {
  const { active, isHost, roomName, streamName, stage } = params;
  if (Platform.OS !== 'ios') return;

  const context = {
    owner: 'live-stream',
    mediaKind: 'video',
    role: isHost ? 'host' : 'viewer',
    requiresInput: isHost,
    roomName,
    streamName,
    stage,
  };

  try {
    liveKitAudioRuntime.setIosRealtimeMediaAudioActive?.(active, context);
    logLiveAudioDebug('ios_live_realtime_media_audio_active_set', {
      active,
      ...context,
    });
  } catch (error) {
    logLiveAudioDebug('ios_live_realtime_media_audio_active_error', {
      active,
      ...context,
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
    });
  }
}

function readLiveAudioStatNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function summarizeLiveAudioStatsReport(
  report: unknown,
  direction: LiveAudioStatsDirection,
) {
  const summary = {
    packets: 0,
    bytes: 0,
    totalAudioEnergy: 0,
  };

  if (!report || typeof (report as Map<string, unknown>).forEach !== 'function') {
    return summary;
  }

  (report as Map<string, Record<string, unknown>>).forEach(stat => {
    const isAudio = stat.kind === 'audio' || stat.mediaType === 'audio';
    if (!isAudio || stat.isRemote === true) return;

    if (direction === 'outbound' && stat.type === 'outbound-rtp') {
      summary.packets += readLiveAudioStatNumber(stat.packetsSent);
      summary.bytes += readLiveAudioStatNumber(stat.bytesSent);
      summary.totalAudioEnergy += readLiveAudioStatNumber(
        stat.totalAudioEnergy,
      );
    }

    if (direction === 'inbound' && stat.type === 'inbound-rtp') {
      summary.packets += readLiveAudioStatNumber(stat.packetsReceived);
      summary.bytes += readLiveAudioStatNumber(stat.bytesReceived);
      summary.totalAudioEnergy += readLiveAudioStatNumber(
        stat.totalAudioEnergy,
      );
    }
  });

  return summary;
}

function startLiveAudioStatsProbe(params: {
  room: ReturnType<typeof useRoomContext>;
  isHost: boolean;
  roomName: string;
  streamName: string;
  remoteAudioPublication?: LiveTrackPublicationLike;
}) {
  const { room, isHost, roomName, streamName, remoteAudioPublication } = params;
  let sample = 0;
  let isStopped = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    isStopped = true;
    if (interval) clearInterval(interval);
    interval = null;
  };

  const collect = async () => {
    if (isStopped) return;
    sample += 1;

    try {
      const publisherReport = await room.engine.pcManager?.publisher.getStats();
      const subscriberReport =
        await room.engine.pcManager?.subscriber?.getStats();
      const outboundAudio = summarizeLiveAudioStatsReport(
        publisherReport,
        'outbound',
      );
      const inboundAudio = summarizeLiveAudioStatsReport(
        subscriberReport,
        'inbound',
      );
      const remotePublicationState = remoteAudioPublication
        ? liveTrackDebugPayload(remoteAudioPublication)
        : undefined;

      logLiveAudioDebug('live_audio_stats_compact', {
        sample,
        role: isHost ? 'host' : 'viewer',
        roomName,
        streamName,
        hostPacketsSent: outboundAudio.packets,
        hostBytesSent: outboundAudio.bytes,
        viewerPacketsReceived: inboundAudio.packets,
        viewerBytesReceived: inboundAudio.bytes,
        outboundAudio,
        inboundAudio,
        remoteAudioPublication: remotePublicationState,
        remotePublicationState,
      });
    } catch (error) {
      logLiveAudioDebug('live_audio_stats_error', {
        sample,
        role: isHost ? 'host' : 'viewer',
        roomName,
        streamName,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      });
    }

    if (sample >= LIVE_AUDIO_STATS_PROBE_SAMPLES) {
      stop();
    }
  };

  collect().catch(() => undefined);
  interval = setInterval(() => {
    collect().catch(() => undefined);
  }, LIVE_AUDIO_STATS_PROBE_INTERVAL_MS);

  return stop;
}

function LiveAudioStatsProbe({
  enabled,
  isHost,
  roomName,
  streamName,
  remoteAudioPublication,
}: {
  enabled: boolean;
  isHost: boolean;
  roomName: string;
  streamName: string;
  remoteAudioPublication?: LiveTrackPublicationLike;
}) {
  const room = useRoomContext();

  useEffect(() => {
    if (!enabled) return undefined;
    return startLiveAudioStatsProbe({
      room,
      isHost,
      roomName,
      streamName,
      remoteAudioPublication,
    });
  }, [enabled, isHost, remoteAudioPublication, room, roomName, streamName]);

  return null;
}

function LiveKitStreamMediaBridge({
  isHost,
  roomName,
  streamName,
  setAudioStatsReady,
}: {
  isHost: boolean;
  roomName: string;
  streamName: string;
  setAudioStatsReady: (ready: boolean) => void;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const markedAudioReadyRef = useRef(false);

  const markAudioStatsReady = useCallback(
    (reason: string) => {
      if (markedAudioReadyRef.current) return;
      markedAudioReadyRef.current = true;
      setAudioStatsReady(true);
      logLiveAudioDebug('live_audio_stats_ready', {
        role: isHost ? 'host' : 'viewer',
        roomName,
        streamName,
        reason,
      });
    },
    [isHost, roomName, setAudioStatsReady, streamName],
  );

  const ensureHostMedia = useCallback(async () => {
    if (!isHost || connectionState !== ConnectionState.Connected) return;

    logLiveAudioDebug('live_host_media_enable_start', {
      roomName,
      streamName,
    });

    try {
      const microphonePublication =
        await localParticipant.setMicrophoneEnabled(true);
      logLiveAudioDebug('live_host_microphone_enabled', {
        roomName,
        streamName,
        ...liveTrackDebugPayload(
          microphonePublication as LiveTrackPublicationLike,
          {
            identity: localParticipant.identity,
            sid: localParticipant.sid,
            name: localParticipant.name,
            isLocal: localParticipant.isLocal,
          },
        ),
      });
      markAudioStatsReady('host_microphone_enabled');
    } catch (error) {
      logLiveAudioDebug('live_host_microphone_enable_error', {
        roomName,
        streamName,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      });
    }

    try {
      const cameraPublication = await localParticipant.setCameraEnabled(true);
      logLiveAudioDebug('live_host_camera_enabled', {
        roomName,
        streamName,
        ...liveTrackDebugPayload(cameraPublication as LiveTrackPublicationLike, {
          identity: localParticipant.identity,
          sid: localParticipant.sid,
          name: localParticipant.name,
          isLocal: localParticipant.isLocal,
        }),
      });
    } catch (error) {
      logLiveAudioDebug('live_host_camera_enable_error', {
        roomName,
        streamName,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      });
    }
  }, [
    connectionState,
    isHost,
    localParticipant,
    markAudioStatsReady,
    roomName,
    streamName,
  ]);

  const markViewerSubscribedAudioIfPresent = useCallback(
    (participant?: LiveParticipantLike, reason = 'viewer_audio_already_subscribed') => {
      if (isHost) return;
      const seenTrackSids = new Set<string>();
      const visit = (publication: LiveTrackPublicationLike) => {
        const trackSid = publication.trackSid ?? '';
        if (trackSid && seenTrackSids.has(trackSid)) return;
        if (trackSid) seenTrackSids.add(trackSid);
        if (publication.isSubscribed && isLiveAudioPublication(publication)) {
          markAudioStatsReady(reason);
        }
      };

      participant?.trackPublications?.forEach(visit);
      participant?.audioTrackPublications?.forEach(visit);
      participant?.videoTrackPublications?.forEach(visit);
    },
    [isHost, markAudioStatsReady],
  );

  useEffect(() => {
    markedAudioReadyRef.current = false;
    setAudioStatsReady(false);
  }, [isHost, roomName, setAudioStatsReady, streamName]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    if (isHost) {
      ensureHostMedia().catch(() => undefined);
      return;
    }

    room.remoteParticipants.forEach(participant => {
      requestLiveRemoteParticipantTrackSubscriptions({
        participant: participant as LiveParticipantLike,
        roomName,
        streamName,
        reason: 'live_room_connected',
      });
      markViewerSubscribedAudioIfPresent(
        participant as LiveParticipantLike,
        'viewer_connected_audio_already_subscribed',
      );
    });
  }, [
    connectionState,
    ensureHostMedia,
    isHost,
    markViewerSubscribedAudioIfPresent,
    room,
    roomName,
    streamName,
  ]);

  useEffect(() => {
    const handleConnected = () => {
      if (isHost) {
        ensureHostMedia().catch(() => undefined);
        return;
      }

      room.remoteParticipants.forEach(participant => {
        requestLiveRemoteParticipantTrackSubscriptions({
          participant: participant as LiveParticipantLike,
          roomName,
          streamName,
          reason: 'live_room_connected_event',
        });
        markViewerSubscribedAudioIfPresent(
          participant as LiveParticipantLike,
          'viewer_connected_event_audio_already_subscribed',
        );
      });
    };

    const handleLocalTrackPublished = (
      publication?: LiveTrackPublicationLike,
    ) => {
      logLiveAudioDebug('live_local_track_published', {
        roomName,
        streamName,
        ...liveTrackDebugPayload(publication, {
          identity: localParticipant.identity,
          sid: localParticipant.sid,
          name: localParticipant.name,
          isLocal: localParticipant.isLocal,
        }),
      });
      if (isHost && isLiveAudioPublication(publication)) {
        markAudioStatsReady('host_local_audio_published');
      }
    };

    const handleRemoteTrackPublished = (
      publication?: LiveTrackPublicationLike,
      participant?: LiveParticipantLike,
    ) => {
      logLiveAudioDebug('live_remote_track_published', {
        roomName,
        streamName,
        ...liveTrackDebugPayload(publication, participant),
      });
      if (isHost) return;
      requestLiveRemoteTrackSubscription({
        publication,
        participant,
        roomName,
        streamName,
        reason: 'live_track_published',
      });
      if (publication?.isSubscribed && isLiveAudioPublication(publication)) {
        markAudioStatsReady('viewer_published_audio_already_subscribed');
      }
    };

    const handleRemoteTrackSubscribed = (
      track?: { kind?: string; source?: string; sid?: string },
      publication?: LiveTrackPublicationLike,
      participant?: LiveParticipantLike,
    ) => {
      logLiveAudioDebug('live_remote_track_subscribed', {
        roomName,
        streamName,
        ...liveTrackDebugPayload(publication, participant),
        trackKind: track?.kind ?? publication?.kind,
        trackSource: track?.source ?? publication?.source,
        trackSid: track?.sid ?? publication?.trackSid,
      });
      if (!isHost && isLiveAudioPublication(publication)) {
        markAudioStatsReady('viewer_remote_audio_subscribed');
      }
    };

    const handleRemoteTrackSubscriptionFailed = (
      trackSid?: string,
      participant?: LiveParticipantLike,
      error?: unknown,
    ) => {
      logLiveAudioDebug('live_remote_track_subscription_sdk_failed', {
        roomName,
        streamName,
        trackSid,
        participantIdentity: participant?.identity,
        participantSid: participant?.sid,
        participantName: participant?.name,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : error
            ? { message: String(error) }
            : undefined,
      });
    };

    room
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      .on(RoomEvent.TrackPublished, handleRemoteTrackPublished)
      .on(RoomEvent.TrackSubscribed, handleRemoteTrackSubscribed)
      .on(
        RoomEvent.TrackSubscriptionFailed,
        handleRemoteTrackSubscriptionFailed,
      );

    return () => {
      room
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
        .off(RoomEvent.TrackPublished, handleRemoteTrackPublished)
        .off(RoomEvent.TrackSubscribed, handleRemoteTrackSubscribed)
        .off(
          RoomEvent.TrackSubscriptionFailed,
          handleRemoteTrackSubscriptionFailed,
        );
    };
  }, [
    ensureHostMedia,
    isHost,
    localParticipant,
    markAudioStatsReady,
    markViewerSubscribedAudioIfPresent,
    room,
    roomName,
    streamName,
  ]);

  return null;
}

function ManualIosLiveViewerRoom({
  session,
  cameraFacing,
}: {
  session: LiveSession;
  cameraFacing: 'front' | 'back';
}) {
  const [room] = useState(
    () => new Room({ adaptiveStream: true, dynacast: true }),
  );
  const [connectionMessage, setConnectionMessage] = useState('Đang kết nối live...');
  const [audioStatsReady, setAudioStatsReady] = useState(false);
  const [
    remoteAudioPublication,
    setRemoteAudioPublication,
  ] = useState<LiveTrackPublicationLike | undefined>(undefined);
  const audioStatsReadyRef = useRef(false);
  const pendingSubscriptionsRef = useRef(
    new Map<string, PendingLiveRemoteSubscription>(),
  );

  const markViewerAudioStatsReady = useCallback(
    (reason: string, publication?: LiveTrackPublicationLike) => {
      if (publication) {
        setRemoteAudioPublication(publication);
      }
      if (audioStatsReadyRef.current) return;
      audioStatsReadyRef.current = true;
      setAudioStatsReady(true);
      logLiveAudioDebug('live_audio_stats_ready', {
        role: 'viewer',
        roomName: session.roomName,
        streamName: session.streamName,
        reason,
        remoteAudioPublication: publication
          ? liveTrackDebugPayload(publication)
          : undefined,
      });
    },
    [session.roomName, session.streamName],
  );

  const handleSubscriptionRequested = useCallback(
    ({
      publication,
      participant,
      context,
    }: {
      publication: LiveTrackPublicationLike;
      participant?: LiveParticipantLike;
      context: LiveRemoteSubscriptionDebugContext;
    }) => {
      scheduleLiveRemoteTrackSubscriptionTimeout({
        pendingSubscriptions: pendingSubscriptionsRef.current,
        publication,
        participant,
        context,
      });
      if (isLiveAudioPublication(publication)) {
        markViewerAudioStatsReady(
          'viewer_remote_audio_subscription_requested',
          publication,
        );
      }
    },
    [markViewerAudioStatsReady],
  );

  useEffect(() => {
    audioStatsReadyRef.current = false;
    setAudioStatsReady(false);
    setRemoteAudioPublication(undefined);
    clearAllLiveRemoteTrackSubscriptionTimeouts(
      pendingSubscriptionsRef.current,
    );
  }, [session.roomName, session.streamName]);

  useEffect(() => {
    let isDisposed = false;
    const pendingSubscriptions = pendingSubscriptionsRef.current;

    const requestParticipantSubscriptions = (
      participant: LiveParticipantLike,
      reason: string,
    ) => {
      requestLiveRemoteParticipantTrackSubscriptions({
        participant,
        roomName: session.roomName,
        streamName: session.streamName,
        reason,
        onSubscriptionRequested: handleSubscriptionRequested,
      });
    };

    const handleConnected = () => {
      if (isDisposed) return;
      logLiveAudioDebug('live_room_connected', {
        role: 'viewer',
        roomName: session.roomName,
        streamName: session.streamName,
        localIdentity: room.localParticipant.identity,
        remoteParticipants: room.remoteParticipants.size,
      });
      setIosLiveStreamAudioActive({
        active: true,
        isHost: false,
        roomName: session.roomName,
        streamName: session.streamName,
        stage: 'connected',
      });
      setConnectionMessage('');
      room.remoteParticipants.forEach(participant => {
        requestParticipantSubscriptions(
          participant as LiveParticipantLike,
          'manual_room_connected',
        );
      });
    };

    const handleParticipantConnected = (participant: LiveParticipantLike) => {
      if (isDisposed) return;
      logLiveAudioDebug('live_remote_participant_connected', {
        roomName: session.roomName,
        streamName: session.streamName,
        participantIdentity: participant.identity,
        participantSid: participant.sid,
        participantName: participant.name,
        remoteParticipants: room.remoteParticipants.size,
      });
      requestParticipantSubscriptions(participant, 'manual_participant_connected');
    };

    const handleTrackPublished = (
      publication?: LiveTrackPublicationLike,
      participant?: LiveParticipantLike,
    ) => {
      if (isDisposed) return;
      logLiveAudioDebug('live_remote_track_published', {
        roomName: session.roomName,
        streamName: session.streamName,
        ...liveTrackDebugPayload(publication, participant),
      });
      requestLiveRemoteTrackSubscription({
        publication,
        participant,
        roomName: session.roomName,
        streamName: session.streamName,
        reason: 'manual_track_published',
        onSubscriptionRequested: handleSubscriptionRequested,
      });
    };

    const handleTrackSubscribed = (
      track?: { kind?: string; source?: string; sid?: string },
      publication?: LiveTrackPublicationLike,
      participant?: LiveParticipantLike,
    ) => {
      if (isDisposed) return;
      const trackSid = track?.sid ?? publication?.trackSid;
      clearLiveRemoteTrackSubscriptionTimeout(
        pendingSubscriptions,
        trackSid,
      );
      logLiveAudioDebug('live_remote_track_subscribed', {
        roomName: session.roomName,
        streamName: session.streamName,
        ...liveTrackDebugPayload(publication, participant),
        trackKind: track?.kind ?? publication?.kind,
        trackSource: track?.source ?? publication?.source,
        trackSid,
      });
      if (isLiveAudioPublication(publication)) {
        markViewerAudioStatsReady('viewer_remote_audio_subscribed', publication);
      }
    };

    const handleTrackSubscriptionStatusChanged = (
      publication?: LiveTrackPublicationLike,
      status?: unknown,
      participant?: LiveParticipantLike,
    ) => {
      if (isDisposed) return;
      if (publication?.isSubscribed) {
        clearLiveRemoteTrackSubscriptionTimeout(
          pendingSubscriptions,
          publication.trackSid,
        );
      }
      if (isLiveAudioPublication(publication)) {
        setRemoteAudioPublication(publication);
      }
      logLiveAudioDebug('live_remote_track_subscription_status_changed', {
        ...liveRemoteSubscriptionDebugPayload(
          {
            roomName: session.roomName,
            streamName: session.streamName,
            reason: 'manual_sdk_status_changed',
          },
          publication,
          participant,
        ),
        status: liveDebugValue(status),
      });
    };

    const handleTrackSubscriptionPermissionChanged = (
      publication?: LiveTrackPublicationLike,
      status?: unknown,
      participant?: LiveParticipantLike,
    ) => {
      if (isDisposed) return;
      logLiveAudioDebug('live_remote_track_subscription_permission_changed', {
        ...liveRemoteSubscriptionDebugPayload(
          {
            roomName: session.roomName,
            streamName: session.streamName,
            reason: 'manual_sdk_permission_changed',
          },
          publication,
          participant,
        ),
        status: liveDebugValue(status),
      });
    };

    const handleTrackSubscriptionFailed = (
      trackSid?: string,
      participant?: LiveParticipantLike,
      error?: unknown,
    ) => {
      if (isDisposed) return;
      clearLiveRemoteTrackSubscriptionTimeout(
        pendingSubscriptions,
        trackSid,
      );
      logLiveAudioDebug('live_remote_track_subscription_sdk_failed', {
        roomName: session.roomName,
        streamName: session.streamName,
        trackSid,
        participantIdentity: participant?.identity,
        participantSid: participant?.sid,
        participantName: participant?.name,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : error
            ? { message: String(error) }
            : undefined,
      });
    };

    const handleDisconnected = (reason?: unknown) => {
      if (isDisposed) return;
      clearAllLiveRemoteTrackSubscriptionTimeouts(
        pendingSubscriptions,
      );
      audioStatsReadyRef.current = false;
      setAudioStatsReady(false);
      logLiveAudioDebug('live_room_disconnected', {
        role: 'viewer',
        roomName: session.roomName,
        streamName: session.streamName,
        reason: reason ? String(reason) : '',
      });
      setConnectionMessage('Đã ngắt kết nối live');
    };

    room
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.TrackPublished, handleTrackPublished)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(
        RoomEvent.TrackSubscriptionStatusChanged,
        handleTrackSubscriptionStatusChanged,
      )
      .on(
        RoomEvent.TrackSubscriptionPermissionChanged,
        handleTrackSubscriptionPermissionChanged,
      )
      .on(RoomEvent.TrackSubscriptionFailed, handleTrackSubscriptionFailed)
      .on(RoomEvent.Disconnected, handleDisconnected);

    room.connect(session.wsUrl, session.token, { autoSubscribe: false })
      .catch(error => {
        if (isDisposed) return;
        logLiveAudioDebug('live_room_error', {
          role: 'viewer',
          roomName: session.roomName,
          streamName: session.streamName,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
        audioStatsReadyRef.current = false;
        setAudioStatsReady(false);
        setIosLiveStreamAudioActive({
          active: false,
          isHost: false,
          roomName: session.roomName,
          streamName: session.streamName,
          stage: 'error',
        });
        setConnectionMessage('Không kết nối được live');
      });

    return () => {
      isDisposed = true;
      clearAllLiveRemoteTrackSubscriptionTimeouts(
        pendingSubscriptions,
      );
      room
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .off(RoomEvent.TrackPublished, handleTrackPublished)
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(
          RoomEvent.TrackSubscriptionStatusChanged,
          handleTrackSubscriptionStatusChanged,
        )
        .off(
          RoomEvent.TrackSubscriptionPermissionChanged,
          handleTrackSubscriptionPermissionChanged,
        )
        .off(RoomEvent.TrackSubscriptionFailed, handleTrackSubscriptionFailed)
        .off(RoomEvent.Disconnected, handleDisconnected);
      audioStatsReadyRef.current = false;
      setAudioStatsReady(false);
      room.disconnect();
    };
  }, [
    handleSubscriptionRequested,
    markViewerAudioStatsReady,
    room,
    session.roomName,
    session.streamName,
    session.token,
    session.wsUrl,
  ]);

  return (
    <RoomContext.Provider value={room}>
      <View style={styles.container}>
        <LiveAudioStatsProbe
          enabled={audioStatsReady}
          isHost={false}
          roomName={session.roomName}
          streamName={session.streamName}
          remoteAudioPublication={remoteAudioPublication}
        />
        <LiveKitVideoSurface isHost={false} cameraFacing={cameraFacing} />
        {connectionMessage ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{connectionMessage}</Text>
          </View>
        ) : null}
      </View>
    </RoomContext.Provider>
  );
}

function LiveKitVideoSurface({
  isHost,
  cameraFacing = 'front',
}: {
  isHost: boolean;
  cameraFacing?: 'front' | 'back';
}) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant, cameraTrack: localCameraTrack } = useLocalParticipant();

  // LiveKit defaults to front camera ('user') on connect.
  const currentFacingModeRef = React.useRef<'user' | 'environment'>('user');
  const desiredFacingMode = cameraFacing === 'front' ? 'user' : 'environment';
  const isSwitchingRef = React.useRef(false);
  // Bumping this key forces VideoTrack to remount and pick up the new track
  const [trackRenderKey, setTrackRenderKey] = useState(0);

  useEffect(() => {
    if (!isHost || !localParticipant) return;
    if (currentFacingModeRef.current === desiredFacingMode) return;
    if (isSwitchingRef.current) return;

    const publication = localParticipant.getTrackPublication(Track.Source.Camera);
    const trackObj = publication?.track as
      | {
          restartTrack?: (options?: {
            facingMode?: 'user' | 'environment';
          }) => Promise<void>;
          mediaStreamTrack?: { _switchCamera?: () => void };
        }
      | undefined;

    if (!trackObj) return;

    isSwitchingRef.current = true;
    console.log(`[LiveKitVideoSurface] Switching camera: ${currentFacingModeRef.current} -> ${desiredFacingMode}`);

    const performSwitch = async () => {
      try {
        let didSwitch = false;

        // Primary: restartTrack — replaces the physical camera track
        if (trackObj.restartTrack) {
          try {
            await trackObj.restartTrack({ facingMode: desiredFacingMode });
            didSwitch = true;
          } catch (e) {
            console.warn('[LiveKitVideoSurface] restartTrack failed, trying fallback:', e);
          }
        }

        // Fallback: native _switchCamera (toggle)
        if (!didSwitch && trackObj.mediaStreamTrack?._switchCamera) {
          try {
            trackObj.mediaStreamTrack._switchCamera();
            didSwitch = true;
          } catch (e) {
            console.error('[LiveKitVideoSurface] _switchCamera also failed:', e);
          }
        }

        if (didSwitch) {
          currentFacingModeRef.current = desiredFacingMode;
          // Force VideoTrack to remount so it binds to the new track
          setTrackRenderKey(k => k + 1);
          // Second bump after a short delay to handle async track readiness
          setTimeout(() => setTrackRenderKey(k => k + 1), 400);
        }
      } catch (e) {
        console.error('[LiveKitVideoSurface] camera switch error:', e);
      } finally {
        setTimeout(() => {
          isSwitchingRef.current = false;
        }, 800);
      }
    };

    performSwitch();
  }, [isHost, localParticipant, desiredFacingMode, localCameraTrack]);

  useEffect(() => {
    console.log('[LiveKitVideoSurface] tracks update:', tracks.map(t => ({
      participant: t.participant.identity,
      isLocal: t.participant.isLocal,
      source: t.source,
      publication: t.publication ? {
        trackSid: t.publication.trackSid,
        isSubscribed: t.publication.isSubscribed,
        isEnabled: t.publication.isEnabled,
      } : null,
    })));
  }, [tracks]);

  const cameraTrack = useMemo(() => {
    if (isHost) {
      if (localCameraTrack && localParticipant) {
        return {
          participant: localParticipant,
          source: Track.Source.Camera,
          publication: localCameraTrack,
        };
      }
    }
    const trackRefs = tracks.filter(isTrackReference);
    const localTrack = trackRefs.find(item => item.participant.isLocal);
    const remoteTrack = trackRefs.find(item => !item.participant.isLocal);
    return isHost ? localTrack ?? remoteTrack : remoteTrack ?? localTrack;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, localCameraTrack, localParticipant, tracks, trackRenderKey]);

  if (cameraTrack) {
    return (
      <VideoTrack
        key={`camera-${trackRenderKey}`}
        trackRef={cameraTrack}
        objectFit="cover"
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

export function LiveKitStreamView({
  session,
  isHost,
  cameraFacing = 'front',
}: {
  session: LiveSession;
  isHost: boolean;
  cameraFacing?: 'front' | 'back';
}) {
  const [permissionState, setPermissionState] = useState<PermissionState>(
    isHost && (Platform.OS === 'android' || Platform.OS === 'ios')
      ? 'checking'
      : 'granted',
  );
  const [connectionMessage, setConnectionMessage] = useState('Đang kết nối live...');
  const [audioStatsReady, setAudioStatsReady] = useState(false);
  const connectStartLoggedRef = useRef('');
  const liveRole = isHost ? 'host' : 'viewer';
  const canConnectLiveKitRoom = Boolean(
    session.wsUrl && session.token && permissionState === 'granted',
  );

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
    logLiveAudioDebug('live_view_mount', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
    });
    setIosLiveStreamAudioActive({
      active: true,
      isHost,
      roomName: session.roomName,
      streamName: session.streamName,
      stage: 'mount',
    });
    return () => {
      logLiveAudioDebug('live_view_unmount', {
        role: liveRole,
        roomName: session.roomName,
        streamName: session.streamName,
      });
      setIosLiveStreamAudioActive({
        active: false,
        isHost,
        roomName: session.roomName,
        streamName: session.streamName,
        stage: 'unmount',
      });
    };
  }, [isHost, liveRole, session.roomName, session.streamName]);

  useEffect(() => {
    if (!canConnectLiveKitRoom) return;
    const connectKey = `${liveRole}|${session.roomName}|${session.streamName}`;
    if (connectStartLoggedRef.current === connectKey) return;
    connectStartLoggedRef.current = connectKey;
    logLiveAudioDebug('live_room_connect_start', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
      wsUrl: session.wsUrl,
      tokenLength: session.token.length,
    });
  }, [
    canConnectLiveKitRoom,
    liveRole,
    session.roomName,
    session.streamName,
    session.token.length,
    session.wsUrl,
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

  if (Platform.OS === 'ios' && !isHost) {
    return (
      <ManualIosLiveViewerRoom
        session={session}
        cameraFacing={cameraFacing}
      />
    );
  }

  return (
    <LiveKitRoom
      serverUrl={session.wsUrl}
      token={session.token}
      connect
      audio={isHost}
      video={isHost}
      options={{ adaptiveStream: true, dynacast: true }}
      connectOptions={{ autoSubscribe: true }}
      onConnected={() => {
        logLiveAudioDebug('live_room_connected', {
          role: liveRole,
          roomName: session.roomName,
          streamName: session.streamName,
        });
        setIosLiveStreamAudioActive({
          active: true,
          isHost,
          roomName: session.roomName,
          streamName: session.streamName,
          stage: 'connected',
        });
        setConnectionMessage('');
      }}
      onDisconnected={() => {
        logLiveAudioDebug('live_room_disconnected', {
          role: liveRole,
          roomName: session.roomName,
          streamName: session.streamName,
        });
        setAudioStatsReady(false);
        if (isHost) {
          setIosLiveStreamAudioActive({
            active: false,
            isHost,
            roomName: session.roomName,
            streamName: session.streamName,
            stage: 'disconnected',
          });
        }
        setConnectionMessage('Đã ngắt kết nối live');
      }}
      onError={error => {
        logLiveAudioDebug('live_room_error', {
          role: liveRole,
          roomName: session.roomName,
          streamName: session.streamName,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
        setAudioStatsReady(false);
        setIosLiveStreamAudioActive({
          active: false,
          isHost,
          roomName: session.roomName,
          streamName: session.streamName,
          stage: 'error',
        });
        setConnectionMessage('Không kết nối được live');
      }}
      onMediaDeviceFailure={failure => {
        console.error('[LiveKit] media device failure:', failure);
        setConnectionMessage('Không mở được camera hoặc mic');
      }}
    >
      <View style={styles.container}>
        <LiveKitStreamMediaBridge
          isHost={isHost}
          roomName={session.roomName}
          streamName={session.streamName}
          setAudioStatsReady={setAudioStatsReady}
        />
        <LiveAudioStatsProbe
          enabled={audioStatsReady}
          isHost={isHost}
          roomName={session.roomName}
          streamName={session.streamName}
        />
        <LiveKitVideoSurface isHost={isHost} cameraFacing={cameraFacing} />
        {connectionMessage ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{connectionMessage}</Text>
          </View>
        ) : null}
      </View>
    </LiveKitRoom>
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
