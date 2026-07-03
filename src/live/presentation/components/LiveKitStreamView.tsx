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
  RoomContext,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useRoomContext,
  useTracks,
  useLocalParticipant,
  useTrackVolume,
} from '@livekit/react-native';
import { AudioDeviceModule } from '@livekit/react-native-webrtc';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type LocalTrack,
  type LocalTrackPublication,
} from 'livekit-client';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';
import type { LiveSession } from '../../domain/types/live.types';

type PermissionState = 'checking' | 'granted' | 'denied';
type LiveAudioStatsDirection = 'outbound' | 'inbound';

type VnseeaLiveKitAudioRuntime = {
  setIosRealtimeMediaAudioActive?: (
    active: boolean,
    context: Record<string, unknown>,
  ) => void;
  getIosAudioDeviceState?: () => Record<string, unknown>;
};

const liveKitAudioRuntime = require('../../../shared-kernel/infrastructure/livekit/registerLiveKitGlobals') as VnseeaLiveKitAudioRuntime;
const LIVE_AUDIO_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';
const LIVE_AUDIO_STATS_PROBE_INTERVAL_MS = 1_000;
const LIVE_AUDIO_STATS_PROBE_SAMPLES = 12;
const LIVE_HOST_SILENT_AUDIO_RECOVERY_SAMPLE = 4;
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
    setVolume?: (volume: number) => void;
    getRTCStatsReport?: () => Promise<unknown>;
    mediaStreamTrack?: {
      id?: string;
      kind?: string;
      label?: string;
      enabled?: boolean;
      muted?: boolean;
      readyState?: string;
    };
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

type LiveHostMicrophonePublishReason =
  | 'initial_publish'
  | 'silent_audio_recovery';

type LiveHostSilentAudioContext = {
  sample: number;
  hostPacketsSent: number;
  hostBytesSent: number;
  hostLocalTrackPacketsSent: number;
  hostLocalTrackBytesSent: number;
  hostLocalTrackAudioEnergy: number;
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

function scheduleLiveRemoteTrackSubscriptionRecovery(
  params: {
    pendingSubscriptions: Map<string, PendingLiveRemoteSubscription>;
    publication: LiveTrackPublicationLike;
    participant?: LiveParticipantLike;
    context: LiveRemoteSubscriptionDebugContext;
    onAutoSubscribeTimeout?: (params: {
      publication: LiveTrackPublicationLike;
      participant?: LiveParticipantLike;
      context: LiveRemoteSubscriptionDebugContext;
    }) => void;
  },
  retried = false,
) {
  const {
    pendingSubscriptions,
    publication,
    participant,
    context,
    onAutoSubscribeTimeout,
  } = params;
  const trackSid = publication.trackSid ?? publication.sid ?? publication.track?.sid;
  if (!trackSid) return;

  clearLiveRemoteTrackSubscriptionTimeout(pendingSubscriptions, trackSid);
  const timeoutId = setTimeout(() => {
    const pending = pendingSubscriptions.get(trackSid);
    if (!pending) return;
    if (publication.isSubscribed || publication.track) {
      clearLiveRemoteTrackSubscriptionTimeout(pendingSubscriptions, trackSid);
      return;
    }

    if (!pending.retried) {
      logLiveAudioDebug('live_remote_track_auto_subscribe_timeout', {
        ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
        retried: false,
        timeoutMs: LIVE_REMOTE_SUBSCRIPTION_TIMEOUT_MS,
      });
      onAutoSubscribeTimeout?.({
        publication,
        participant,
        context,
      });
      try {
        if (typeof publication.setSubscribed !== 'function') {
          throw new Error('Remote publication cannot be subscribed.');
        }
        logLiveAudioDebug('live_remote_track_subscription_manual_recovery', {
          ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
          retryAttempt: 1,
        });
        publication.setSubscribed(true);
        logLiveAudioDebug('live_remote_track_subscription_manual_recovery_applied', {
          ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
          retryAttempt: 1,
        });
        scheduleLiveRemoteTrackSubscriptionRecovery(
          {
            pendingSubscriptions,
            publication,
            participant,
            context,
            onAutoSubscribeTimeout,
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
      return;
    }

    logLiveAudioDebug('live_remote_track_subscription_timeout', {
      ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
      retried: true,
      timeoutMs: LIVE_REMOTE_SUBSCRIPTION_TIMEOUT_MS,
    });

    logLiveAudioDebug('live_remote_track_subscription_retry', {
      ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
      retryAttempt: 2,
    });

    try {
      if (typeof publication.setSubscribed !== 'function') {
        throw new Error('Remote publication cannot be subscribed.');
      }
      publication.setSubscribed(false);
      publication.setSubscribed(true);
      logLiveAudioDebug('live_remote_track_subscription_retry_applied', {
        ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
        retryAttempt: 2,
      });
      pendingSubscriptions.delete(trackSid);
    } catch (error) {
      logLiveAudioDebug('live_remote_track_subscription_failed', {
        ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
        retryAttempt: 2,
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
  stage:
    | 'mount'
    | 'unmount'
    | 'before_connect'
    | 'connected'
    | 'disconnected'
    | 'error';
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

function getIosLiveAudioDeviceStateForLog() {
  if (Platform.OS !== 'ios') return undefined;
  try {
    return liveKitAudioRuntime.getIosAudioDeviceState?.() ?? {};
  } catch (error) {
    return {
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
    };
  }
}

function logLiveAudioDeviceState(
  reason: string,
  roomName: string,
  streamName: string,
  extra: Record<string, unknown> = {},
) {
  if (Platform.OS !== 'ios') return;
  logLiveAudioDebug('live_audio_device_state', {
    role: 'viewer',
    roomName,
    streamName,
    reason,
    ...extra,
    audioDeviceState: getIosLiveAudioDeviceStateForLog(),
  });
}

async function ensureIosLiveHostMicrophoneUnmuted(
  stage: string,
  roomName: string,
  streamName: string,
) {
  if (Platform.OS !== 'ios') return true;
  const beforeAudioDeviceState = getIosLiveAudioDeviceStateForLog();

  logLiveAudioDebug('live_host_microphone_unmute_start', {
    role: 'host',
    roomName,
    streamName,
    stage,
    audioDeviceStateBefore: beforeAudioDeviceState,
  });

  try {
    await AudioDeviceModule.setMicrophoneMuted(false);
    const afterAudioDeviceState = getIosLiveAudioDeviceStateForLog();
    logLiveAudioDebug('live_host_microphone_unmute_success', {
      role: 'host',
      roomName,
      streamName,
      stage,
      isMicrophoneMuted: afterAudioDeviceState?.isMicrophoneMuted,
      audioDeviceStateAfter: afterAudioDeviceState,
    });
    return true;
  } catch (error) {
    logLiveAudioDebug('live_host_microphone_unmute_error', {
      role: 'host',
      roomName,
      streamName,
      stage,
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
      audioDeviceStateAfter: getIosLiveAudioDeviceStateForLog(),
    });
    return false;
  }
}

function liveLocalTrackDebugPayload(track?: LocalTrack) {
  const mediaStreamTrack = track?.mediaStreamTrack;
  return {
    trackKind: track?.kind,
    trackSource: track?.source,
    trackSid: track?.sid,
    muted: track?.isMuted,
    mediaStreamTrackId: mediaStreamTrack?.id,
    mediaStreamTrackKind: mediaStreamTrack?.kind,
    mediaStreamTrackLabel: mediaStreamTrack?.label,
    mediaStreamTrackEnabled: mediaStreamTrack?.enabled,
    mediaStreamTrackMuted: mediaStreamTrack?.muted,
    mediaStreamTrackReadyState: mediaStreamTrack?.readyState,
  };
}

function stopUnusedLiveLocalTracks(tracks: LocalTrack[]) {
  tracks.forEach(track => {
    try {
      track.stop();
    } catch {
      // Best-effort cleanup for tracks that were created but not published.
    }
  });
}

async function unpublishExistingIosLiveHostMicrophoneTrack(params: {
  localParticipant: LocalParticipant;
  roomName: string;
  streamName: string;
  reason: LiveHostMicrophonePublishReason;
}) {
  const { localParticipant, roomName, streamName, reason } = params;
  const existingPublication = localParticipant.getTrackPublication(
    Track.Source.Microphone,
  ) as LocalTrackPublication | undefined;
  const existingTrack = existingPublication?.track;
  if (!existingTrack) return;

  logLiveAudioDebug('live_host_audio_track_unpublish_existing', {
    roomName,
    streamName,
    reason,
    ...liveTrackDebugPayload(existingPublication as LiveTrackPublicationLike, {
      identity: localParticipant.identity,
      sid: localParticipant.sid,
      name: localParticipant.name,
      isLocal: localParticipant.isLocal,
    }),
    localTrack: liveLocalTrackDebugPayload(existingTrack),
  });

  await localParticipant.unpublishTrack(existingTrack, true);
}

async function publishIosLiveHostMicrophoneTrack(params: {
  localParticipant: LocalParticipant;
  roomName: string;
  streamName: string;
  reason: LiveHostMicrophonePublishReason;
}) {
  const { localParticipant, roomName, streamName, reason } = params;
  if (Platform.OS !== 'ios') {
    return localParticipant.setMicrophoneEnabled(true);
  }

  try {
    await ensureIosLiveHostMicrophoneUnmuted(
      `before_${reason}`,
      roomName,
      streamName,
    );
    await unpublishExistingIosLiveHostMicrophoneTrack({
      localParticipant,
      roomName,
      streamName,
      reason,
    });

    logLiveAudioDebug('live_host_audio_track_create_start', {
      roomName,
      streamName,
      reason,
      audioDeviceState: getIosLiveAudioDeviceStateForLog(),
    });
    const localTracks =
      await localParticipant.createTracks({ audio: true, video: false });
    const audioTrack = localTracks.find(track => (
      track.kind === Track.Kind.Audio ||
      track.source === Track.Source.Microphone ||
      track.mediaStreamTrack?.kind === 'audio'
    ));

    if (!audioTrack) {
      stopUnusedLiveLocalTracks(localTracks);
      throw new Error('Live host microphone capture did not create an audio track.');
    }

    audioTrack.source = Track.Source.Microphone;
    stopUnusedLiveLocalTracks(localTracks.filter(track => track !== audioTrack));
    logLiveAudioDebug('live_host_audio_track_create_success', {
      roomName,
      streamName,
      reason,
      localTrack: liveLocalTrackDebugPayload(audioTrack),
      audioDeviceState: getIosLiveAudioDeviceStateForLog(),
    });

    const publication = await localParticipant.publishTrack(audioTrack, {
      source: Track.Source.Microphone,
      stream: streamName,
    });
    await ensureIosLiveHostMicrophoneUnmuted(
      `after_${reason}`,
      roomName,
      streamName,
    );
    logLiveAudioDebug('live_host_audio_track_publish_success', {
      roomName,
      streamName,
      reason,
      ...liveTrackDebugPayload(publication as LiveTrackPublicationLike, {
        identity: localParticipant.identity,
        sid: localParticipant.sid,
        name: localParticipant.name,
        isLocal: localParticipant.isLocal,
      }),
      localTrack: liveLocalTrackDebugPayload(publication.track),
      audioDeviceState: getIosLiveAudioDeviceStateForLog(),
    });
    return publication;
  } catch (error) {
    logLiveAudioDebug('live_host_audio_track_publish_error', {
      roomName,
      streamName,
      reason,
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
      audioDeviceState: getIosLiveAudioDeviceStateForLog(),
    });
    throw error;
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
    audioLevel: 0,
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
      summary.audioLevel = Math.max(
        summary.audioLevel,
        readLiveAudioStatNumber(stat.audioLevel),
      );
      summary.totalAudioEnergy += readLiveAudioStatNumber(
        stat.totalAudioEnergy,
      );
    }

    if (direction === 'inbound' && stat.type === 'inbound-rtp') {
      summary.packets += readLiveAudioStatNumber(stat.packetsReceived);
      summary.bytes += readLiveAudioStatNumber(stat.bytesReceived);
      summary.audioLevel = Math.max(
        summary.audioLevel,
        readLiveAudioStatNumber(stat.audioLevel),
      );
      summary.totalAudioEnergy += readLiveAudioStatNumber(
        stat.totalAudioEnergy,
      );
    }
  });

  return summary;
}

function liveMediaStreamTrackDebugPayload(
  track?: LiveTrackPublicationLike['track'],
) {
  const mediaStreamTrack = track?.mediaStreamTrack;
  return {
    trackKind: track?.kind,
    trackSource: track?.source,
    trackSid: track?.sid,
    trackMuted: track?.isMuted,
    mediaStreamTrackId: mediaStreamTrack?.id,
    mediaStreamTrackKind: mediaStreamTrack?.kind,
    mediaStreamTrackLabel: mediaStreamTrack?.label,
    mediaStreamTrackEnabled: mediaStreamTrack?.enabled,
    mediaStreamTrackMuted: mediaStreamTrack?.muted,
    mediaStreamTrackReadyState: mediaStreamTrack?.readyState,
    hasRTCStatsReport: typeof track?.getRTCStatsReport === 'function',
  };
}

async function collectLiveRemoteAudioTrackStats(room: Room) {
  const remoteTrackAudio = {
    trackCount: 0,
    reportCount: 0,
    summary: {
      packets: 0,
      bytes: 0,
      audioLevel: 0,
      totalAudioEnergy: 0,
    },
    tracks: [] as Record<string, unknown>[],
    errors: [] as Record<string, unknown>[],
  };
  const seenTrackSids = new Set<string>();
  const tracksWithStats: {
    getRTCStatsReport: () => Promise<unknown>;
    trackState: Record<string, unknown>;
  }[] = [];

  const visit = (
    publication: LiveTrackPublicationLike,
    participant?: LiveParticipantLike,
  ) => {
    if (!isLiveAudioPublication(publication)) return;
    const trackSid = publication.trackSid ?? publication.sid ?? publication.track?.sid;
    if (trackSid && seenTrackSids.has(trackSid)) return;
    if (trackSid) seenTrackSids.add(trackSid);

    remoteTrackAudio.trackCount += 1;
    const trackDebug = {
      ...liveMediaStreamTrackDebugPayload(publication.track),
      ...liveTrackDebugPayload(publication, participant),
    };

    const track = publication.track;
    const getRTCStatsReport = track?.getRTCStatsReport;
    if (typeof getRTCStatsReport !== 'function') {
      remoteTrackAudio.tracks.push(trackDebug);
      return;
    }

    const trackState = {
      ...trackDebug,
      statsPending: true,
    };
    remoteTrackAudio.tracks.push(trackState);
    tracksWithStats.push({
      getRTCStatsReport: () => getRTCStatsReport.call(track),
      trackState,
    });
  };

  room.remoteParticipants.forEach(participant => {
    const participantLike = participant as LiveParticipantLike;
    participantLike.trackPublications?.forEach(publication => {
      visit(publication, participantLike);
    });
    participantLike.audioTrackPublications?.forEach(publication => {
      visit(publication, participantLike);
    });
  });

  for (const { getRTCStatsReport, trackState } of tracksWithStats) {
    try {
      const report = await getRTCStatsReport();
      const summary = summarizeLiveAudioStatsReport(report, 'inbound');
      remoteTrackAudio.summary.packets += summary.packets;
      remoteTrackAudio.summary.bytes += summary.bytes;
      remoteTrackAudio.summary.audioLevel = Math.max(
        remoteTrackAudio.summary.audioLevel,
        summary.audioLevel,
      );
      remoteTrackAudio.summary.totalAudioEnergy += summary.totalAudioEnergy;
      remoteTrackAudio.reportCount += 1;
      Object.assign(trackState, {
        stats: summary,
        statsPending: false,
      });
    } catch (error) {
      remoteTrackAudio.errors.push({
        ...trackState,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      });
      Object.assign(trackState, {
        statsPending: false,
      });
    }
  }

  return remoteTrackAudio;
}

async function collectLiveLocalAudioTrackStats(room: Room) {
  const localTrackAudio = {
    trackCount: 0,
    reportCount: 0,
    summary: {
      packets: 0,
      bytes: 0,
      audioLevel: 0,
      totalAudioEnergy: 0,
    },
    tracks: [] as Record<string, unknown>[],
    errors: [] as Record<string, unknown>[],
  };
  const participant = {
    identity: room.localParticipant.identity,
    sid: room.localParticipant.sid,
    name: room.localParticipant.name,
    isLocal: room.localParticipant.isLocal,
  };
  const publication = room.localParticipant.getTrackPublication(
    Track.Source.Microphone,
  ) as LiveTrackPublicationLike | undefined;

  if (!publication || !isLiveAudioPublication(publication)) {
    return localTrackAudio;
  }

  localTrackAudio.trackCount += 1;
  const trackDebug = {
    ...liveMediaStreamTrackDebugPayload(publication.track),
    ...liveTrackDebugPayload(publication, participant),
  };
  const track = publication.track;
  const getRTCStatsReport = track?.getRTCStatsReport;
  if (typeof getRTCStatsReport !== 'function') {
    localTrackAudio.tracks.push(trackDebug);
    return localTrackAudio;
  }

  const trackState = {
    ...trackDebug,
    statsPending: true,
  };
  localTrackAudio.tracks.push(trackState);

  try {
    const report = await getRTCStatsReport.call(track);
    const summary = summarizeLiveAudioStatsReport(report, 'outbound');
    localTrackAudio.summary.packets += summary.packets;
    localTrackAudio.summary.bytes += summary.bytes;
    localTrackAudio.summary.audioLevel = Math.max(
      localTrackAudio.summary.audioLevel,
      summary.audioLevel,
    );
    localTrackAudio.summary.totalAudioEnergy += summary.totalAudioEnergy;
    localTrackAudio.reportCount += 1;
    Object.assign(trackState, {
      stats: summary,
      statsPending: false,
    });
  } catch (error) {
    localTrackAudio.errors.push({
      ...trackState,
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
    });
    Object.assign(trackState, {
      statsPending: false,
    });
  }

  return localTrackAudio;
}

function startLiveAudioStatsProbe(params: {
  room: ReturnType<typeof useRoomContext>;
  isHost: boolean;
  roomName: string;
  streamName: string;
  remoteAudioPublication?: LiveTrackPublicationLike;
  audioSessionStartedByViewer?: boolean;
  hostAudioSessionPrepared?: boolean;
  onHostSilentAudioDetected?: (context: LiveHostSilentAudioContext) => void;
}) {
  const {
    room,
    isHost,
    roomName,
    streamName,
    remoteAudioPublication,
    audioSessionStartedByViewer = false,
    hostAudioSessionPrepared = false,
    onHostSilentAudioDetected,
  } = params;
  let sample = 0;
  let isStopped = false;
  let interval: ReturnType<typeof setInterval> | null = null;
  let hostSilentAudioRecoveryRequested = false;

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
      const publisherAudioSummary = summarizeLiveAudioStatsReport(
        publisherReport,
        'outbound',
      );
      const subscriberAudioSummary = summarizeLiveAudioStatsReport(
        subscriberReport,
        'inbound',
      );
      const remoteAudioTrackStats = await collectLiveRemoteAudioTrackStats(
        room as Room,
      );
      const localAudioTrackStats = isHost
        ? await collectLiveLocalAudioTrackStats(room as Room)
        : undefined;
      const remotePublicationState = remoteAudioPublication
        ? liveTrackDebugPayload(remoteAudioPublication)
        : undefined;
      const remoteTrackReadyState = remoteAudioTrackStats.tracks.find(
        track => typeof track.mediaStreamTrackReadyState === 'string',
      )?.mediaStreamTrackReadyState;
      const hostLocalTrackReadyState = localAudioTrackStats?.tracks.find(
        track => typeof track.mediaStreamTrackReadyState === 'string',
      )?.mediaStreamTrackReadyState;
      const audioDeviceState = Platform.OS === 'ios'
        ? getIosLiveAudioDeviceStateForLog()
        : undefined;
      const hostLocalTrackPacketsSent =
        localAudioTrackStats?.summary.packets ?? 0;
      const hostLocalTrackBytesSent =
        localAudioTrackStats?.summary.bytes ?? 0;
      const hostLocalTrackAudioEnergy =
        localAudioTrackStats?.summary.totalAudioEnergy ?? 0;
      const shouldLogTrackStatsDetail =
        sample === 1 || sample === LIVE_AUDIO_STATS_PROBE_SAMPLES;

      if (shouldLogTrackStatsDetail) {
        logLiveAudioDebug('live_audio_track_stats_detail', {
          sample,
          role: isHost ? 'host' : 'viewer',
          roomName,
          streamName,
          outboundAudio: publisherAudioSummary,
          inboundAudio: subscriberAudioSummary,
          localTrackAudio: localAudioTrackStats,
          remoteTrackAudio: remoteAudioTrackStats,
          remoteAudioPublication: remotePublicationState,
          remotePublicationState,
          audioDeviceState,
        });
      }

      if (
        isHost &&
        !hostSilentAudioRecoveryRequested &&
        sample >= LIVE_HOST_SILENT_AUDIO_RECOVERY_SAMPLE &&
        hostLocalTrackBytesSent > 0 &&
        hostLocalTrackAudioEnergy === 0
      ) {
        hostSilentAudioRecoveryRequested = true;
        const silentAudioContext = {
          sample,
          hostPacketsSent: publisherAudioSummary.packets,
          hostBytesSent: publisherAudioSummary.bytes,
          hostLocalTrackPacketsSent,
          hostLocalTrackBytesSent,
          hostLocalTrackAudioEnergy,
        };
        logLiveAudioDebug('live_host_silent_audio_detected', {
          role: 'host',
          roomName,
          streamName,
          ...silentAudioContext,
          hostIsMicrophoneMuted: audioDeviceState?.isMicrophoneMuted,
          audioDeviceState,
        });
        onHostSilentAudioDetected?.(silentAudioContext);
      }

      logLiveAudioDebug('live_audio_stats_compact', {
        sample,
        role: isHost ? 'host' : 'viewer',
        roomName,
        streamName,
        hostPacketsSent: publisherAudioSummary.packets,
        hostBytesSent: publisherAudioSummary.bytes,
        hostLocalTrackPacketsSent,
        hostLocalTrackBytesSent,
        hostLocalTrackAudioEnergy,
        hostLocalTrackReadyState,
        hostIsMicrophoneMuted: isHost
          ? audioDeviceState?.isMicrophoneMuted
          : undefined,
        hostAudioSessionPrepared,
        viewerPacketsReceived: subscriberAudioSummary.packets,
        viewerBytesReceived: subscriberAudioSummary.bytes,
        remoteTrackPacketsReceived: remoteAudioTrackStats.summary.packets,
        remoteTrackBytesReceived: remoteAudioTrackStats.summary.bytes,
        remoteTrackAudioLevel: remoteAudioTrackStats.summary.audioLevel,
        remoteTrackReadyState,
        audioSessionStartedByViewer,
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
  audioSessionStartedByViewer,
  hostAudioSessionPrepared,
  onHostSilentAudioDetected,
}: {
  enabled: boolean;
  isHost: boolean;
  roomName: string;
  streamName: string;
  remoteAudioPublication?: LiveTrackPublicationLike;
  audioSessionStartedByViewer?: boolean;
  hostAudioSessionPrepared?: boolean;
  onHostSilentAudioDetected?: (context: LiveHostSilentAudioContext) => void;
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
      audioSessionStartedByViewer,
      hostAudioSessionPrepared,
      onHostSilentAudioDetected,
    });
  }, [
    audioSessionStartedByViewer,
    enabled,
    hostAudioSessionPrepared,
    isHost,
    onHostSilentAudioDetected,
    remoteAudioPublication,
    room,
    roomName,
    streamName,
  ]);

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
  const hostAudioPublishedRef = useRef(false);
  const hostMediaPublishInFlightRef = useRef(false);

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
    if (hostAudioPublishedRef.current || hostMediaPublishInFlightRef.current) {
      return;
    }
    hostMediaPublishInFlightRef.current = true;

    logLiveAudioDebug('live_host_media_enable_start', {
      roomName,
      streamName,
    });

    try {
      const microphonePublication = await publishIosLiveHostMicrophoneTrack({
        localParticipant,
        roomName,
        streamName,
        reason: 'initial_publish',
      });
      hostAudioPublishedRef.current = true;
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
      hostAudioPublishedRef.current = false;
      logLiveAudioDebug('live_host_microphone_enable_error', {
        roomName,
        streamName,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      });
    } finally {
      hostMediaPublishInFlightRef.current = false;
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
    hostAudioPublishedRef.current = false;
    hostMediaPublishInFlightRef.current = false;
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

function LiveKitRemoteAudioPlayoutBridge({
  roomName,
  streamName,
  onAudioSessionStarted,
}: {
  roomName: string;
  streamName: string;
  onAudioSessionStarted: (started: boolean) => void;
}) {
  const room = useRoomContext();
  const audioSessionStartedRef = useRef(false);

  const startRemoteAudioPlayout = useCallback(
    async ({
      subscribedTrack,
      publication,
      participant,
      reason,
    }: {
      subscribedTrack?: LiveTrackPublicationLike['track'];
      publication?: LiveTrackPublicationLike;
      participant?: LiveParticipantLike;
      reason: string;
    }) => {
      if (Platform.OS !== 'ios') return;
      if (!isLiveAudioPublication(publication)) return;

      const track = publication?.track ?? subscribedTrack;
      const trackSid = publication?.trackSid ?? publication?.sid ?? track?.sid;
      let defaultVolumeApplied = false;
      let trackVolumeApplied = false;
      let roomStartAudioSucceeded = false;

      logLiveAudioDeviceState('before_remote_audio_playout', roomName, streamName, {
        reason,
        ...liveMediaStreamTrackDebugPayload(track),
        ...liveTrackDebugPayload(publication, participant),
      });

      try {
        await AudioSession.setDefaultRemoteAudioTrackVolume(1);
        defaultVolumeApplied = true;
        logLiveAudioDebug('live_remote_audio_default_volume_set', {
          roomName,
          streamName,
          reason,
          trackSid,
          volume: 1,
        });
      } catch (error) {
        logLiveAudioDebug('live_remote_audio_default_volume_error', {
          roomName,
          streamName,
          reason,
          trackSid,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
      }

      try {
        if (typeof track?.setVolume === 'function') {
          track.setVolume(1);
          trackVolumeApplied = true;
        }
        logLiveAudioDebug('live_remote_audio_track_volume_set', {
          roomName,
          streamName,
          reason,
          trackSid,
          volume: 1,
          trackVolumeApplied,
        });
      } catch (error) {
        logLiveAudioDebug('live_remote_audio_track_volume_error', {
          roomName,
          streamName,
          reason,
          trackSid,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
      }

      try {
        await room.startAudio?.();
        roomStartAudioSucceeded = true;
        logLiveAudioDebug('live_room_start_audio', {
          roomName,
          streamName,
          reason,
          trackSid,
        });
      } catch (error) {
        logLiveAudioDebug('live_room_start_audio_error', {
          roomName,
          streamName,
          reason,
          trackSid,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
      }

      if (!audioSessionStartedRef.current) {
        try {
          await AudioSession.startAudioSession();
          audioSessionStartedRef.current = true;
          onAudioSessionStarted(true);
          logLiveAudioDebug('live_remote_audio_session_start', {
            roomName,
            streamName,
            reason,
            trackSid,
          });
        } catch (error) {
          logLiveAudioDebug('live_remote_audio_session_start_error', {
            roomName,
            streamName,
            reason,
            trackSid,
            error: error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: String(error) },
          });
        }
      }

      logLiveAudioDeviceState('after_remote_audio_playout', roomName, streamName, {
        reason,
        trackSid,
        defaultVolumeApplied,
        trackVolumeApplied,
        roomStartAudioSucceeded,
        audioSessionStartedByViewer: audioSessionStartedRef.current,
      });
      logLiveAudioDebug('live_remote_audio_playout_ready', {
        roomName,
        streamName,
        reason,
        ...liveTrackDebugPayload(publication, participant),
        playoutTrackSid: trackSid,
        defaultVolumeApplied,
        trackVolumeApplied,
        roomStartAudioSucceeded,
        audioSessionStartedByViewer: audioSessionStartedRef.current,
      });
    },
    [onAudioSessionStarted, room, roomName, streamName],
  );

  const startParticipantAudioPlayout = useCallback(
    (participant: LiveParticipantLike, reason: string) => {
      const seenTrackSids = new Set<string>();
      const visit = (publication: LiveTrackPublicationLike) => {
        if (!isLiveAudioPublication(publication)) return;
        if (!publication.isSubscribed && !publication.track) return;
        const trackSid = publication.trackSid ?? publication.sid ?? publication.track?.sid;
        if (trackSid && seenTrackSids.has(trackSid)) return;
        if (trackSid) seenTrackSids.add(trackSid);
        startRemoteAudioPlayout({
          publication,
          participant,
          reason,
        }).catch(() => undefined);
      };

      participant.trackPublications?.forEach(visit);
      participant.audioTrackPublications?.forEach(visit);
    },
    [startRemoteAudioPlayout],
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    const handleConnected = () => {
      room.remoteParticipants.forEach(participant => {
        startParticipantAudioPlayout(
          participant as LiveParticipantLike,
          'audio_playout_connected',
        );
      });
    };

    const handleParticipantConnected = (participant: LiveParticipantLike) => {
      startParticipantAudioPlayout(
        participant,
        'audio_playout_participant_connected',
      );
    };

    const handleTrackSubscribed = (
      subscribedTrack?: LiveTrackPublicationLike['track'],
      publication?: LiveTrackPublicationLike,
      participant?: LiveParticipantLike,
    ) => {
      if (!isLiveAudioPublication(publication)) return;
      startRemoteAudioPlayout({
        subscribedTrack,
        publication,
        participant,
        reason: 'audio_playout_track_subscribed',
      }).catch(() => undefined);
    };

    const handleTrackUnsubscribed = (
      unsubscribedTrack?: LiveTrackPublicationLike['track'],
      publication?: LiveTrackPublicationLike,
      participant?: LiveParticipantLike,
    ) => {
      if (!isLiveAudioPublication(publication)) return;
      logLiveAudioDebug('live_remote_audio_playout_track_unsubscribed', {
        roomName,
        streamName,
        ...liveMediaStreamTrackDebugPayload(unsubscribedTrack),
        ...liveTrackDebugPayload(publication, participant),
      });
    };

    room
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    handleConnected();

    return () => {
      room
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      onAudioSessionStarted(false);
    };
  }, [
    onAudioSessionStarted,
    room,
    roomName,
    startParticipantAudioPlayout,
    startRemoteAudioPlayout,
    streamName,
  ]);

  return null;
}

function LiveRemoteAudioVolumeProbe({
  enabled,
  publication,
  roomName,
  streamName,
}: {
  enabled: boolean;
  publication?: LiveTrackPublicationLike;
  roomName: string;
  streamName: string;
}) {
  const trackSid = publication?.trackSid ?? publication?.sid ?? publication?.track?.sid;
  const audioTrack = isLiveAudioPublication(publication)
    ? (publication?.track as Parameters<typeof useTrackVolume>[0])
    : undefined;
  const volume = useTrackVolume(audioTrack);
  const sampleRef = useRef(0);

  useEffect(() => {
    sampleRef.current = 0;
  }, [trackSid]);

  useEffect(() => {
    if (!enabled || !publication || !isLiveAudioPublication(publication)) {
      return;
    }
    if (sampleRef.current >= LIVE_AUDIO_STATS_PROBE_SAMPLES) return;

    sampleRef.current += 1;
    logLiveAudioDebug('live_remote_audio_pcm_volume', {
      sample: sampleRef.current,
      roomName,
      streamName,
      volume,
      ...liveMediaStreamTrackDebugPayload(publication.track),
      ...liveTrackDebugPayload(publication),
    });
  }, [enabled, publication, roomName, streamName, volume]);

  return null;
}

function ManualIosLiveHostRoom({
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
    hostAudioSessionPrepared,
    setHostAudioSessionPrepared,
  ] = useState(false);
  const silentAudioRecoveryInFlightRef = useRef(false);

  const handleHostSilentAudioDetected = useCallback(
    (context: LiveHostSilentAudioContext) => {
      if (silentAudioRecoveryInFlightRef.current) return;
      silentAudioRecoveryInFlightRef.current = true;
      logLiveAudioDebug('live_host_silent_audio_recovery_start', {
        roomName: session.roomName,
        streamName: session.streamName,
        ...context,
        audioDeviceState: getIosLiveAudioDeviceStateForLog(),
      });

      publishIosLiveHostMicrophoneTrack({
        localParticipant: room.localParticipant,
        roomName: session.roomName,
        streamName: session.streamName,
        reason: 'silent_audio_recovery',
      })
        .then(publication => {
          logLiveAudioDebug('live_host_silent_audio_recovery_success', {
            roomName: session.roomName,
            streamName: session.streamName,
            ...context,
            ...liveTrackDebugPayload(publication as LiveTrackPublicationLike, {
              identity: room.localParticipant.identity,
              sid: room.localParticipant.sid,
              name: room.localParticipant.name,
              isLocal: room.localParticipant.isLocal,
            }),
            audioDeviceState: getIosLiveAudioDeviceStateForLog(),
          });
        })
        .catch(error => {
          logLiveAudioDebug('live_host_silent_audio_recovery_error', {
            roomName: session.roomName,
            streamName: session.streamName,
            ...context,
            error: error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: String(error) },
            audioDeviceState: getIosLiveAudioDeviceStateForLog(),
          });
        })
        .finally(() => {
          silentAudioRecoveryInFlightRef.current = false;
        });
    },
    [room, session.roomName, session.streamName],
  );

  useEffect(() => {
    let isDisposed = false;

      setConnectionMessage('Đang kết nối live...');
      setAudioStatsReady(false);
      setHostAudioSessionPrepared(false);
      silentAudioRecoveryInFlightRef.current = false;

    const prepareHostAudioSession = async () => {
      logLiveAudioDebug('live_host_audio_session_prepare_start', {
        roomName: session.roomName,
        streamName: session.streamName,
      });
      setIosLiveStreamAudioActive({
        active: true,
        isHost: true,
        roomName: session.roomName,
        streamName: session.streamName,
        stage: 'before_connect',
      });
      logLiveAudioDeviceState(
        'before_host_audio_session_prepare',
        session.roomName,
        session.streamName,
        { role: 'host' },
      );

      try {
        await AudioSession.setAppleAudioConfiguration({
          audioCategory: 'playAndRecord',
          audioMode: 'videoChat',
          audioCategoryOptions: ['allowBluetooth', 'defaultToSpeaker', 'mixWithOthers'],
        });
        await AudioSession.startAudioSession();
        await ensureIosLiveHostMicrophoneUnmuted('after_audio_session_start', session.roomName, session.streamName);
        logLiveAudioDebug('live_host_audio_session_prepare_success', {
          roomName: session.roomName,
          streamName: session.streamName,
          audioCategory: 'playAndRecord',
          audioMode: 'videoChat',
          audioCategoryOptions: ['allowBluetooth', 'defaultToSpeaker', 'mixWithOthers'],
        });
        logLiveAudioDeviceState(
          'after_host_audio_session_prepare',
          session.roomName,
          session.streamName,
          { role: 'host' },
        );
      } catch (error) {
        logLiveAudioDebug('live_host_audio_session_prepare_error', {
          roomName: session.roomName,
          streamName: session.streamName,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
        throw error;
      }
    };

    const handleConnected = () => {
      if (isDisposed) return;
      logLiveAudioDebug('live_room_connected', {
        role: 'host',
        roomName: session.roomName,
        streamName: session.streamName,
        localIdentity: room.localParticipant.identity,
        remoteParticipants: room.remoteParticipants.size,
      });
      setIosLiveStreamAudioActive({
        active: true,
        isHost: true,
        roomName: session.roomName,
        streamName: session.streamName,
        stage: 'connected',
      });
      setConnectionMessage('');
    };

    const handleDisconnected = (reason?: unknown) => {
      if (isDisposed) return;
      setAudioStatsReady(false);
      setHostAudioSessionPrepared(false);
      logLiveAudioDebug('live_room_disconnected', {
        role: 'host',
        roomName: session.roomName,
        streamName: session.streamName,
        reason: reason ? String(reason) : '',
      });
      setIosLiveStreamAudioActive({
        active: false,
        isHost: true,
        roomName: session.roomName,
        streamName: session.streamName,
        stage: 'disconnected',
      });
      setConnectionMessage('Đã ngắt kết nối live');
    };

    room
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.Disconnected, handleDisconnected);

    prepareHostAudioSession()
      .then(() => {
        if (isDisposed) return undefined;
        setHostAudioSessionPrepared(true);
        return room.connect(session.wsUrl, session.token, { autoSubscribe: true });
      })
      .catch(error => {
        if (isDisposed) return;
        setAudioStatsReady(false);
        setHostAudioSessionPrepared(false);
        logLiveAudioDebug('live_room_error', {
          role: 'host',
          roomName: session.roomName,
          streamName: session.streamName,
          error: error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
        });
        setIosLiveStreamAudioActive({
          active: false,
          isHost: true,
          roomName: session.roomName,
          streamName: session.streamName,
          stage: 'error',
        });
        setConnectionMessage('Không kết nối được live');
      });

    return () => {
      isDisposed = true;
      room
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.Disconnected, handleDisconnected);
      setAudioStatsReady(false);
      setHostAudioSessionPrepared(false);
      room.disconnect();
    };
  }, [
    room,
    session.roomName,
    session.streamName,
    session.token,
    session.wsUrl,
  ]);

  return (
    <RoomContext.Provider value={room}>
      <View style={styles.container}>
        <LiveKitStreamMediaBridge
          isHost
          roomName={session.roomName}
          streamName={session.streamName}
          setAudioStatsReady={setAudioStatsReady}
        />
        <LiveAudioStatsProbe
          enabled={audioStatsReady}
          isHost
          roomName={session.roomName}
          streamName={session.streamName}
          hostAudioSessionPrepared={hostAudioSessionPrepared}
          onHostSilentAudioDetected={handleHostSilentAudioDetected}
        />
        <LiveKitVideoSurface isHost cameraFacing={cameraFacing} />
        {connectionMessage ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{connectionMessage}</Text>
          </View>
        ) : null}
      </View>
    </RoomContext.Provider>
  );
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
    viewerAudioSessionStarted,
    setViewerAudioSessionStarted,
  ] = useState(false);
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

  useEffect(() => {
    audioStatsReadyRef.current = false;
    setAudioStatsReady(false);
    setViewerAudioSessionStarted(false);
    setRemoteAudioPublication(undefined);
    clearAllLiveRemoteTrackSubscriptionTimeouts(
      pendingSubscriptionsRef.current,
    );
  }, [session.roomName, session.streamName]);

  useEffect(() => {
    let isDisposed = false;
    const pendingSubscriptions = pendingSubscriptionsRef.current;

    const markAutoSubscribeTimeoutStats = ({
      publication,
    }: {
      publication: LiveTrackPublicationLike;
      participant?: LiveParticipantLike;
      context: LiveRemoteSubscriptionDebugContext;
    }) => {
      if (isLiveAudioPublication(publication)) {
        markViewerAudioStatsReady(
          'viewer_remote_audio_auto_subscribe_timeout',
          publication,
        );
      }
    };

    const watchRemotePublicationAutoSubscription = (
      publication: LiveTrackPublicationLike | undefined,
      participant: LiveParticipantLike | undefined,
      reason: string,
    ) => {
      if (!shouldSubscribeLiveRemotePublication(publication)) return;
      const context = {
        roomName: session.roomName,
        streamName: session.streamName,
        reason,
      };

      logLiveAudioDebug('live_remote_track_auto_subscribe_watch', {
        ...liveRemoteSubscriptionDebugPayload(context, publication, participant),
      });

      if (isLiveAudioPublication(publication)) {
        setRemoteAudioPublication(publication);
      }

      if (publication.isSubscribed || publication.track) {
        if (isLiveAudioPublication(publication)) {
          markViewerAudioStatsReady(
            'viewer_remote_audio_auto_subscribed',
            publication,
          );
        }
        return;
      }

      scheduleLiveRemoteTrackSubscriptionRecovery({
        pendingSubscriptions,
        publication,
        participant,
        context,
        onAutoSubscribeTimeout: markAutoSubscribeTimeoutStats,
      });
    };

    const watchParticipantAutoSubscriptions = (
      participant: LiveParticipantLike,
      reason: string,
    ) => {
      const seenTrackSids = new Set<string>();
      const visit = (publication: LiveTrackPublicationLike) => {
        const trackSid = publication.trackSid ?? publication.sid ?? publication.track?.sid;
        if (trackSid && seenTrackSids.has(trackSid)) return;
        if (trackSid) seenTrackSids.add(trackSid);
        watchRemotePublicationAutoSubscription(publication, participant, reason);
      };

      participant.trackPublications?.forEach(visit);
      participant.audioTrackPublications?.forEach(visit);
      participant.videoTrackPublications?.forEach(visit);
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
        watchParticipantAutoSubscriptions(
          participant as LiveParticipantLike,
          'auto_subscribe_connected',
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
      watchParticipantAutoSubscriptions(
        participant,
        'auto_subscribe_participant_connected',
      );
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
      watchRemotePublicationAutoSubscription(
        publication,
        participant,
        'auto_subscribe_track_published',
      );
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
      if (publication?.isSubscribed || publication?.track) {
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
      setViewerAudioSessionStarted(false);
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

    room.connect(session.wsUrl, session.token, { autoSubscribe: true })
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
      setViewerAudioSessionStarted(false);
      room.disconnect();
    };
  }, [
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
        <LiveKitRemoteAudioPlayoutBridge
          roomName={session.roomName}
          streamName={session.streamName}
          onAudioSessionStarted={setViewerAudioSessionStarted}
        />
        <LiveAudioStatsProbe
          enabled={audioStatsReady}
          isHost={false}
          roomName={session.roomName}
          streamName={session.streamName}
          remoteAudioPublication={remoteAudioPublication}
          audioSessionStartedByViewer={viewerAudioSessionStarted}
        />
        <LiveRemoteAudioVolumeProbe
          enabled={audioStatsReady}
          publication={remoteAudioPublication}
          roomName={session.roomName}
          streamName={session.streamName}
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

  if (Platform.OS === 'ios' && isHost) {
    return (
      <ManualIosLiveHostRoom
        session={session}
        cameraFacing={cameraFacing}
      />
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
