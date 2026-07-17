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
import { AppState, Platform } from 'react-native';
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
  LiveKitCallCheckResult,
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
  usesNativeCallUi,
  waitForNativeAudioSessionActivation,
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
import {
  getIosCallAudioDeviceState,
  setIosCallAudioActive,
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

type CallPhase =
  | 'initializing'
  | 'ringing'
  | 'answering'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';

type CloseReason = 'ended' | 'cancelled' | 'declined' | 'no_answer' | 'missed';
type LiveKitCallSession = {
  callId: string;
  recipientId: string;
  callType: LiveKitCallType;
  direction: LiveKitCallRouteParams['direction'];
  peer?: LiveKitCallPeer;
  nativeCallUuid: string;
  phase: CallPhase;
  payload: LiveKitJoinPayload | null;
  iosNativeAudioReady: boolean;
  error: string;
  isMinimized: boolean;
  hasMediaPermissions: boolean | null;
  mediaErrorText: string;
  startedAt: number;
  elapsedSeconds: number;
  localVideoStreamUrl: string;
  localVideoRenderKey: number;
  localCameraFacingMode: 'user' | 'environment';
  remoteVideoStreamUrl: string;
  hasRemoteParticipant: boolean;
  isLocalMicrophoneEnabled: boolean;
  isLocalCameraEnabled: boolean;
  audioOutputMode: CallAudioOutputMode;
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
  answerIncomingCall: (call: IncomingLiveKitCall) => Promise<boolean>;
  ensureSessionFromRoute: (params: LiveKitCallRouteParams) => void;
  minimizeCall: () => void;
  restoreCallRoom: () => void;
  endCall: (status?: CloseReason) => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
  setAudioOutputMode: (mode: CallAudioOutputMode) => Promise<void>;
};

type IosCallKitAudioSessionStartStage =
  | 'callkit_activation'
  | 'app_foreground';

type IosVoiceAudioStage =
  | 'before_connect'
  | 'ios_direct_room_error'
  | 'app_foreground'
  | 'release';

const OUTGOING_RING_TIMEOUT_MS = 43_000;
const OUTGOING_ANSWER_WATCHDOG_INTERVAL_MS = 650;
const CONNECTED_CALL_SYNC_INTERVAL_MS = 2_000;
const LIVEKIT_CALL_DATA_TOPIC = 'vnseea-call-event';
const CALL_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';
const CALL_MEDIA_ENABLE_TIMEOUT_MS = 7_000;
const CALLKIT_AUDIO_SESSION_WAIT_MS = 6_000;
const CALL_AUDIO_STATS_PROBE_INTERVAL_MS = 1_000;
const CALL_AUDIO_STATS_PROBE_SAMPLES = 6;
const TERMINAL_CALL_STATUSES = new Set([
  'cancelled',
  'ended',
  'no_answer',
  'missed',
  'declined',
  'finished',
]);
const CALL_AUDIO_ZERO_RTP_RECOVERY_SAMPLE = 3;
const REMOTE_SUBSCRIPTION_TIMEOUT_MS = 2_000;
const REMOTE_AUDIO_SUBSCRIPTION_ERROR =
  'Không nhận được âm thanh từ đối phương.';
const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: false,
  dynacast: false,
  singlePeerConnection: false,
  audioCaptureDefaults: CALL_AUDIO_CAPTURE_DEFAULTS,
} as const;
const LIVEKIT_CONNECT_OPTIONS = {
  autoSubscribe: false,
} as const;

const LiveKitCallSessionContext =
  createContext<LiveKitCallSessionContextValue | null>(null);

function shouldUseIosDirectCallAudioGate(callType: LiveKitCallType) {
  return Platform.OS === 'ios' && (callType === 'audio' || callType === 'video');
}

type DirectCallConnectKeyInput = {
  callId?: string;
  callType?: LiveKitCallType;
  callUuid?: string;
  nativeCallUuid?: string;
} | null | undefined;

function buildDirectCallConnectKey(input: DirectCallConnectKeyInput) {
  if (!input?.callId || !input.callType) return '';
  const callUuid = input.callUuid || input.nativeCallUuid || '';
  if (!callUuid) return '';
  return `${input.callId}|${input.callType}|${callUuid}`;
}

function serializeCallDebugError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return {
    message: String(error),
  };
}

function logCallDebug(event: string, data: Record<string, unknown> = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...data,
  };

  try {
    console.log(CALL_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(CALL_DEBUG_PREFIX, event, data);
  }
}

function isTerminalCallStatus(status?: string) {
  return Boolean(status && TERMINAL_CALL_STATUSES.has(status));
}

type IosVoiceAudioContext = {
  callId: string;
  callType: LiveKitCallType;
  callUuid: string;
  roomName: string;
  stage: IosVoiceAudioStage;
};

function shouldManageIosVoiceAudio(callType: LiveKitCallType) {
  return shouldUseIosDirectCallAudioGate(callType);
}

function setIosVoiceCallAudioActive(
  active: boolean,
  params: IosVoiceAudioContext,
) {
  if (!shouldUseIosDirectCallAudioGate(params.callType)) return;
  const context = {
    owner: 'direct-call',
    callId: params.callId,
    callType: params.callType,
    callUuid: params.callUuid,
    roomName: params.roomName,
    stage: params.stage,
  } as const;
  setIosCallAudioActive(active, context, logCallDebug);
  logCallDebug('ios_voice_call_audio_active_set', {
    callId: params.callId,
    callType: params.callType,
    callUuid: params.callUuid,
    roomName: params.roomName,
    stage: params.stage,
    active,
  });
}

function getIosAudioDeviceStateForLog() {
  return getIosCallAudioDeviceState();
}

function logIosAudioDeviceState(
  params: IosVoiceAudioContext & { checkpoint: string },
) {
  if (!shouldManageIosVoiceAudio(params.callType)) return;
  logCallDebug('ios_audio_device_state', {
    callId: params.callId,
    callType: params.callType,
    callUuid: params.callUuid,
    roomName: params.roomName,
    stage: params.stage,
    checkpoint: params.checkpoint,
    ...getIosAudioDeviceStateForLog(),
  });
}

function withCallMediaTimeout<T>(
  operation: Promise<T>,
  label: string,
  timeoutMs = CALL_MEDIA_ENABLE_TIMEOUT_MS,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([operation, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

type AudioStatsSummary = {
  packetsSent: number;
  bytesSent: number;
  packetsReceived: number;
  bytesReceived: number;
  audioLevel: number;
  totalAudioEnergy: number;
  totalSamplesDuration: number;
};

const EMPTY_AUDIO_STATS: AudioStatsSummary = {
  packetsSent: 0,
  bytesSent: 0,
  packetsReceived: 0,
  bytesReceived: 0,
  audioLevel: 0,
  totalAudioEnergy: 0,
  totalSamplesDuration: 0,
};

type AudioTrackStatsSummary = {
  direction: 'outbound' | 'inbound';
  trackCount: number;
  reportCount: number;
  summary: AudioStatsSummary;
  tracks: Record<string, unknown>[];
  errors: Record<string, unknown>[];
};

type VideoStatsSummary = {
  packetsSent: number;
  bytesSent: number;
  packetsReceived: number;
  bytesReceived: number;
  framesSent: number;
  framesEncoded: number;
  framesReceived: number;
  framesDecoded: number;
};

const EMPTY_VIDEO_STATS: VideoStatsSummary = {
  packetsSent: 0,
  bytesSent: 0,
  packetsReceived: 0,
  bytesReceived: 0,
  framesSent: 0,
  framesEncoded: 0,
  framesReceived: 0,
  framesDecoded: 0,
};

function readStatsNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function statsReportEntries(report: unknown) {
  const entries: Record<string, unknown>[] = [];
  const withForEach = report as
    | { forEach?: (handler: (value: unknown) => void) => void }
    | undefined;

  if (typeof withForEach?.forEach === 'function') {
    withForEach.forEach(value => {
      if (value && typeof value === 'object') {
        entries.push(value as Record<string, unknown>);
      }
    });
    return entries;
  }

  if (Array.isArray(report)) {
    return report.filter(
      value => value && typeof value === 'object',
    ) as Record<string, unknown>[];
  }

  if (report && typeof report === 'object') {
    return Object.values(report).filter(
      value => value && typeof value === 'object',
    ) as Record<string, unknown>[];
  }

  return entries;
}

function isAudioStatsRecord(record: Record<string, unknown>) {
  return record.kind === 'audio' || record.mediaType === 'audio';
}

function isVideoStatsRecord(record: Record<string, unknown>) {
  return record.kind === 'video' || record.mediaType === 'video';
}

function summarizeAudioStatsReport(
  report: unknown,
  direction: 'outbound' | 'inbound',
) {
  const summary = { ...EMPTY_AUDIO_STATS };
  const rtpType = direction === 'outbound' ? 'outbound-rtp' : 'inbound-rtp';

  for (const record of statsReportEntries(report)) {
    if (record.type === rtpType && isAudioStatsRecord(record)) {
      summary.packetsSent += readStatsNumber(record, 'packetsSent');
      summary.bytesSent += readStatsNumber(record, 'bytesSent');
      summary.packetsReceived += readStatsNumber(record, 'packetsReceived');
      summary.bytesReceived += readStatsNumber(record, 'bytesReceived');
    }

    if (record.type === 'media-source' && isAudioStatsRecord(record)) {
      summary.audioLevel = Math.max(
        summary.audioLevel,
        readStatsNumber(record, 'audioLevel'),
      );
      summary.totalAudioEnergy += readStatsNumber(record, 'totalAudioEnergy');
      summary.totalSamplesDuration += readStatsNumber(
        record,
        'totalSamplesDuration',
      );
    }
  }

  return summary;
}

function hasOutboundAudioTraffic(stats: AudioStatsSummary) {
  return Boolean(
    stats.packetsSent > 0 ||
      stats.bytesSent > 0 ||
      stats.totalAudioEnergy > 0 ||
      stats.totalSamplesDuration > 0,
  );
}

function hasInboundAudioTraffic(stats: AudioStatsSummary) {
  return Boolean(
    stats.packetsReceived > 0 ||
      stats.bytesReceived > 0 ||
      stats.totalAudioEnergy > 0 ||
      stats.totalSamplesDuration > 0,
  );
}

function createEmptyAudioTrackStats(
  direction: 'outbound' | 'inbound',
): AudioTrackStatsSummary {
  return {
    direction,
    trackCount: 0,
    reportCount: 0,
    summary: { ...EMPTY_AUDIO_STATS },
    tracks: [],
    errors: [],
  };
}

function addAudioStatsSummary(
  target: AudioStatsSummary,
  source: AudioStatsSummary,
) {
  target.packetsSent += source.packetsSent;
  target.bytesSent += source.bytesSent;
  target.packetsReceived += source.packetsReceived;
  target.bytesReceived += source.bytesReceived;
  target.audioLevel = Math.max(target.audioLevel, source.audioLevel);
  target.totalAudioEnergy += source.totalAudioEnergy;
  target.totalSamplesDuration += source.totalSamplesDuration;
}

function audioTrafficDiagnosis(params: {
  pcOutboundAudio: AudioStatsSummary;
  pcInboundAudio: AudioStatsSummary;
  localTrackAudio: AudioTrackStatsSummary;
  remoteTrackAudio: AudioTrackStatsSummary;
}) {
  const {
    pcOutboundAudio,
    pcInboundAudio,
    localTrackAudio,
    remoteTrackAudio,
  } = params;
  const hasPcOutbound = hasOutboundAudioTraffic(pcOutboundAudio);
  const hasPcInbound = hasInboundAudioTraffic(pcInboundAudio);
  const hasTrackOutbound = hasOutboundAudioTraffic(localTrackAudio.summary);
  const hasTrackInbound = hasInboundAudioTraffic(remoteTrackAudio.summary);

  if (hasTrackOutbound && hasTrackInbound) {
    return 'track_rtp_present_check_playout_route';
  }
  if (hasTrackOutbound && !hasTrackInbound) {
    return 'local_outbound_present_remote_inbound_zero';
  }
  if (!hasTrackOutbound && hasTrackInbound) {
    return 'remote_inbound_present_local_outbound_zero';
  }
  if ((hasPcOutbound || hasPcInbound) && !hasTrackOutbound && !hasTrackInbound) {
    return 'pc_stats_present_track_stats_zero';
  }
  if (!hasPcOutbound && !hasPcInbound && !hasTrackOutbound && !hasTrackInbound) {
    return 'all_audio_rtp_zero_or_stats_unavailable';
  }
  return 'mixed_audio_stats';
}

function readFirstAudioTrackState(trackAudio: AudioTrackStatsSummary) {
  const firstTrack = trackAudio.tracks[0] ?? {};
  return {
    trackReadyState: firstTrack.mediaStreamTrackReadyState,
    trackEnabled: firstTrack.mediaStreamTrackEnabled,
    trackMuted: firstTrack.mediaStreamTrackMuted ?? firstTrack.trackMuted,
  };
}

function toCompactAudioStats(params: {
  outboundAudio: AudioStatsSummary;
  inboundAudio: AudioStatsSummary;
  localTrackAudio: AudioTrackStatsSummary;
  remoteTrackAudio: AudioTrackStatsSummary;
  diagnosis: string;
}) {
  const {
    outboundAudio,
    inboundAudio,
    localTrackAudio,
    remoteTrackAudio,
    diagnosis,
  } = params;
  const localTrackState = readFirstAudioTrackState(localTrackAudio);
  const remoteTrackState = readFirstAudioTrackState(remoteTrackAudio);

  return {
    diagnosis,
    localPacketsSent: localTrackAudio.summary.packetsSent,
    localBytesSent: localTrackAudio.summary.bytesSent,
    localAudioEnergy: localTrackAudio.summary.totalAudioEnergy,
    localSamplesDuration: localTrackAudio.summary.totalSamplesDuration,
    localTrackCount: localTrackAudio.trackCount,
    localReportCount: localTrackAudio.reportCount,
    localTrackReadyState: localTrackState.trackReadyState,
    localTrackEnabled: localTrackState.trackEnabled,
    localTrackMuted: localTrackState.trackMuted,
    pcPacketsSent: outboundAudio.packetsSent,
    pcBytesSent: outboundAudio.bytesSent,
    pcAudioEnergy: outboundAudio.totalAudioEnergy,
    remotePacketsReceived: remoteTrackAudio.summary.packetsReceived,
    remoteBytesReceived: remoteTrackAudio.summary.bytesReceived,
    remoteAudioEnergy: remoteTrackAudio.summary.totalAudioEnergy,
    remoteSamplesDuration: remoteTrackAudio.summary.totalSamplesDuration,
    remoteTrackCount: remoteTrackAudio.trackCount,
    remoteReportCount: remoteTrackAudio.reportCount,
    remoteTrackReadyState: remoteTrackState.trackReadyState,
    remoteTrackEnabled: remoteTrackState.trackEnabled,
    remoteTrackMuted: remoteTrackState.trackMuted,
    pcPacketsReceived: inboundAudio.packetsReceived,
    pcBytesReceived: inboundAudio.bytesReceived,
  };
}

function mediaStreamTrackDebugPayload(track?: AudioStatsTrackLike) {
  const mediaStreamTrack = track?.mediaStreamTrack as
    | {
        id?: string;
        kind?: string;
        label?: string;
        enabled?: boolean;
        muted?: boolean;
        readyState?: string;
      }
    | undefined;

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

async function appendAudioTrackRtcStats(params: {
  target: AudioTrackStatsSummary;
  publication?: RemoteTrackPublicationLike;
  participant?: RemoteParticipantLike;
  direction: 'outbound' | 'inbound';
}) {
  const { target, publication, participant, direction } = params;
  const track = publication?.track;
  const trackDebug = {
    ...managedTrackDebugPayload(publication, participant),
    ...mediaStreamTrackDebugPayload(track),
  };

  target.trackCount += 1;

  if (typeof track?.getRTCStatsReport !== 'function') {
    target.tracks.push(trackDebug);
    return;
  }

  try {
    const report = await track.getRTCStatsReport();
    const summary = summarizeAudioStatsReport(report, direction);
    addAudioStatsSummary(target.summary, summary);
    target.reportCount += 1;
    target.tracks.push({
      ...trackDebug,
      stats: summary,
    });
  } catch (error) {
    target.errors.push({
      ...trackDebug,
      error: serializeCallDebugError(error),
    });
  }
}

function collectRemoteAudioPublications(room: Room) {
  const publications: {
    publication: RemoteTrackPublicationLike;
    participant: RemoteParticipantLike;
  }[] = [];

  room.remoteParticipants.forEach(participant => {
    const participantLike = participant as RemoteParticipantLike;
    const collection =
      participantLike.audioTrackPublications ??
      participantLike.trackPublications;
    collection?.forEach(publication => {
      const kind = publication.kind ?? publication.track?.kind;
      const source = publication.source ?? publication.track?.source;
      if (kind === 'audio' || source === Track.Source.Microphone) {
        publications.push({
          publication,
          participant: participantLike,
        });
      }
    });
  });

  return publications;
}

async function collectAudioTrackRtcStats(room: Room) {
  const localTrackAudio = createEmptyAudioTrackStats('outbound');
  const remoteTrackAudio = createEmptyAudioTrackStats('inbound');
  const localMicrophonePublication = room.localParticipant.getTrackPublication(
    Track.Source.Microphone,
  ) as RemoteTrackPublicationLike | undefined;

  if (localMicrophonePublication) {
    await appendAudioTrackRtcStats({
      target: localTrackAudio,
      publication: localMicrophonePublication,
      participant: {
        identity: room.localParticipant.identity,
        sid: room.localParticipant.sid,
        name: room.localParticipant.name,
        isLocal: room.localParticipant.isLocal,
      },
      direction: 'outbound',
    });
  }

  for (const { publication, participant } of collectRemoteAudioPublications(
    room,
  )) {
    await appendAudioTrackRtcStats({
      target: remoteTrackAudio,
      publication,
      participant,
      direction: 'inbound',
    });
  }

  return {
    localTrackAudio,
    remoteTrackAudio,
  };
}

function getLocalMicrophoneDebugState(room: Room) {
  const publication = room.localParticipant.getTrackPublication(
    Track.Source.Microphone,
  ) as RemoteTrackPublicationLike | undefined;
  return {
    isMicrophoneEnabled: Boolean(publication && !publication.isMuted),
    hasPublication: Boolean(publication),
    ...managedTrackDebugPayload(publication, {
      identity: room.localParticipant.identity,
      sid: room.localParticipant.sid,
      name: room.localParticipant.name,
      isLocal: room.localParticipant.isLocal,
    }),
  };
}

function summarizeVideoStatsReport(
  report: unknown,
  direction: 'outbound' | 'inbound',
) {
  const summary = { ...EMPTY_VIDEO_STATS };
  const rtpType = direction === 'outbound' ? 'outbound-rtp' : 'inbound-rtp';

  for (const record of statsReportEntries(report)) {
    if (record.type === rtpType && isVideoStatsRecord(record)) {
      summary.packetsSent += readStatsNumber(record, 'packetsSent');
      summary.bytesSent += readStatsNumber(record, 'bytesSent');
      summary.packetsReceived += readStatsNumber(record, 'packetsReceived');
      summary.bytesReceived += readStatsNumber(record, 'bytesReceived');
      summary.framesSent += readStatsNumber(record, 'framesSent');
      summary.framesEncoded += readStatsNumber(record, 'framesEncoded');
      summary.framesReceived += readStatsNumber(record, 'framesReceived');
      summary.framesDecoded += readStatsNumber(record, 'framesDecoded');
    }
  }

  return summary;
}

function hasOutboundVideoTraffic(stats: VideoStatsSummary) {
  return Boolean(
    stats.packetsSent > 0 ||
      stats.bytesSent > 0 ||
      stats.framesSent > 0 ||
      stats.framesEncoded > 0,
  );
}

function startCallAudioStatsProbe(params: {
  room: Room;
  callId: string;
  callType: LiveKitCallType;
  callUuid: string;
  roomName: string;
}) {
  const { room, callId, callType, callUuid, roomName } = params;
  let sample = 0;
  let lastOutboundAudio = { ...EMPTY_AUDIO_STATS };
  let lastLocalTrackAudio = createEmptyAudioTrackStats('outbound');
  let lastRemoteTrackAudio = createEmptyAudioTrackStats('inbound');
  let isStopped = false;
  let interval: ReturnType<typeof setInterval> | null = null;
  let zeroOutboundRecoveryAttempted = false;

  const stop = () => {
    isStopped = true;
    if (interval) clearInterval(interval);
    interval = null;
  };

  const collect = async () => {
    if (isStopped || room.state === ConnectionState.Disconnected) {
      stop();
      return;
    }

    sample += 1;
    try {
      const publisherReport = await room.engine.pcManager?.publisher.getStats();
      const subscriberReport =
        await room.engine.pcManager?.subscriber?.getStats();
      const outboundAudio = summarizeAudioStatsReport(
        publisherReport,
        'outbound',
      );
      const inboundAudio = summarizeAudioStatsReport(
        subscriberReport,
        'inbound',
      );
      const { localTrackAudio, remoteTrackAudio } =
        await collectAudioTrackRtcStats(room);
      const diagnosis = audioTrafficDiagnosis({
        pcOutboundAudio: outboundAudio,
        pcInboundAudio: inboundAudio,
        localTrackAudio,
        remoteTrackAudio,
      });
      const compactAudioStats = toCompactAudioStats({
        outboundAudio,
        inboundAudio,
        localTrackAudio,
        remoteTrackAudio,
        diagnosis,
      });
      lastOutboundAudio = outboundAudio;
      lastLocalTrackAudio = localTrackAudio;
      lastRemoteTrackAudio = remoteTrackAudio;
      logCallDebug('audio_stats_compact', {
        callId,
        callType,
        callUuid,
        roomName,
        sample,
        ...compactAudioStats,
      });
      if (
        !zeroOutboundRecoveryAttempted &&
        sample >= CALL_AUDIO_ZERO_RTP_RECOVERY_SAMPLE &&
        !hasOutboundAudioTraffic(outboundAudio) &&
        !hasOutboundAudioTraffic(localTrackAudio.summary)
      ) {
        zeroOutboundRecoveryAttempted = true;
        logCallDebug('zero_outbound_recovery_start', {
          callId,
          callType,
          callUuid,
          roomName,
          sample,
          localMicrophone: getLocalMicrophoneDebugState(room),
        });
        try {
          await withCallMediaTimeout(
            room.localParticipant.setMicrophoneEnabled(false),
            'zero outbound microphone disable',
          );
          await withCallMediaTimeout(
            room.localParticipant.setMicrophoneEnabled(true),
            'zero outbound microphone enable',
          );
          logCallDebug('zero_outbound_recovery_success', {
            callId,
            callType,
            callUuid,
            roomName,
            sample,
            localMicrophone: getLocalMicrophoneDebugState(room),
          });
        } catch (recoveryError) {
          logCallDebug('zero_outbound_recovery_error', {
            callId,
            callType,
            callUuid,
            roomName,
            sample,
            error: serializeCallDebugError(recoveryError),
            localMicrophone: getLocalMicrophoneDebugState(room),
          });
        }
      }
    } catch (error) {
      logCallDebug('audio_stats_error', {
        callId,
        callType,
        callUuid,
        roomName,
        sample,
        error: serializeCallDebugError(error),
      });
    }

    if (sample >= CALL_AUDIO_STATS_PROBE_SAMPLES) {
      if (!hasOutboundAudioTraffic(lastOutboundAudio)) {
        logCallDebug('audio_stats_zero_outbound', {
          callId,
          callType,
          callUuid,
          roomName,
          outboundAudio: lastOutboundAudio,
          localTrackAudio: lastLocalTrackAudio,
          remoteTrackAudio: lastRemoteTrackAudio,
          localMicrophone: getLocalMicrophoneDebugState(room),
        });
      }
      if (!hasOutboundAudioTraffic(lastLocalTrackAudio.summary)) {
        logCallDebug('audio_stats_zero_track_outbound', {
          callId,
          callType,
          callUuid,
          roomName,
          localTrackAudio: lastLocalTrackAudio,
          remoteTrackAudio: lastRemoteTrackAudio,
          localMicrophone: getLocalMicrophoneDebugState(room),
        });
      }
      stop();
    }
  };

  collect().catch(() => undefined);
  interval = setInterval(() => {
    collect().catch(() => undefined);
  }, CALL_AUDIO_STATS_PROBE_INTERVAL_MS);

  return stop;
}

function startCallVideoStatsProbe(params: {
  room: Room;
  callId: string;
  callType: LiveKitCallType;
  callUuid: string;
  roomName: string;
}) {
  const { room, callId, callType, callUuid, roomName } = params;
  let sample = 0;
  let lastOutboundVideo = { ...EMPTY_VIDEO_STATS };
  let isStopped = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    isStopped = true;
    if (interval) clearInterval(interval);
    interval = null;
  };

  const collect = async () => {
    if (isStopped || room.state === ConnectionState.Disconnected) {
      stop();
      return;
    }

    sample += 1;
    try {
      const publisherReport = await room.engine.pcManager?.publisher.getStats();
      const subscriberReport =
        await room.engine.pcManager?.subscriber?.getStats();
      const outboundVideo = summarizeVideoStatsReport(
        publisherReport,
        'outbound',
      );
      const inboundVideo = summarizeVideoStatsReport(
        subscriberReport,
        'inbound',
      );
      lastOutboundVideo = outboundVideo;
      logCallDebug('video_stats_sample', {
        callId,
        callType,
        callUuid,
        roomName,
        sample,
        outboundVideo,
        inboundVideo,
      });
    } catch (error) {
      logCallDebug('video_stats_error', {
        callId,
        callType,
        callUuid,
        roomName,
        sample,
        error: serializeCallDebugError(error),
      });
    }

    if (sample >= CALL_AUDIO_STATS_PROBE_SAMPLES) {
      if (!hasOutboundVideoTraffic(lastOutboundVideo)) {
        logCallDebug('video_stats_zero_outbound', {
          callId,
          callType,
          callUuid,
          roomName,
          outboundVideo: lastOutboundVideo,
        });
      }
      stop();
    }
  };

  collect().catch(() => undefined);
  interval = setInterval(() => {
    collect().catch(() => undefined);
  }, CALL_AUDIO_STATS_PROBE_INTERVAL_MS);

  return stop;
}

async function waitForRequiredCallKitAudioSession(params: {
  callId: string;
  callType: LiveKitCallType;
  callUuid: string;
  roomName: string;
}) {
  const { callId, callType, callUuid, roomName } = params;
  if (Platform.OS !== 'ios' || !usesNativeCallUi(callUuid)) {
    return true;
  }

  logCallDebug('callkit_audio_session_wait_start', {
    callId,
    callType,
    callUuid,
    roomName,
  });
  const activation = await waitForNativeAudioSessionActivation(
    callUuid,
    CALLKIT_AUDIO_SESSION_WAIT_MS,
  );
  logCallDebug('callkit_audio_session_wait_end', {
    callId,
    callType,
    callUuid,
    roomName,
    activated: activation.activated,
    activationSource: activation.source,
    activationCallUuid: activation.callUuid,
    activationAgeMs: activation.activationAgeMs,
  });
  const isNativeAudioGateReady =
    activation.activated === true && activation.callUuid === callUuid;
  if (!isNativeAudioGateReady) {
    logCallDebug('native_audio_gate_failed', {
      callId,
      callType,
      callUuid,
      roomName,
      activated: activation.activated,
      activationSource: activation.source,
      activationCallUuid: activation.callUuid,
      activationAgeMs: activation.activationAgeMs,
    });
    return false;
  }
  logCallDebug('native_audio_gate_pass', {
    callId,
    callType,
    callUuid,
    roomName,
    activationSource: activation.source,
    activationCallUuid: activation.callUuid,
    activationAgeMs: activation.activationAgeMs,
  });
  await ensureIosCallKitAudioSessionStarted({
    callId,
    callType,
    callUuid,
    roomName,
    stage: 'callkit_activation',
    activated: activation.activated,
    activationSource: activation.source,
    activationCallUuid: activation.callUuid,
    activationAgeMs: activation.activationAgeMs,
    preferSpeakerOutput: callType === 'video',
  });
  return true;
}

async function ensureIosCallKitAudioSessionStarted(params: {
  callId: string;
  callType: LiveKitCallType;
  callUuid: string;
  roomName: string;
  stage: IosCallKitAudioSessionStartStage;
  activated?: boolean;
  activationSource?: string;
  activationCallUuid?: string;
  activationAgeMs?: number;
  preferSpeakerOutput?: boolean;
}) {
  const {
    callId,
    callType,
    callUuid,
    roomName,
    stage,
    activated,
    activationSource,
    activationCallUuid,
    activationAgeMs,
    preferSpeakerOutput = true,
  } = params;

  if (Platform.OS !== 'ios' || !usesNativeCallUi(callUuid)) {
    return false;
  }

  logCallDebug('ios_callkit_audio_session_start_start', {
    callId,
    callType,
    callUuid,
    roomName,
    stage,
    activated,
    activationSource,
    activationCallUuid,
    activationAgeMs,
    preferSpeakerOutput,
  });
  logCallDebug('ios_callkit_audio_session_ready', {
    callId,
    callType,
    callUuid,
    roomName,
    stage,
    activated,
    activationSource,
    activationCallUuid,
    activationAgeMs,
    preferSpeakerOutput,
    audioDeviceState: getIosAudioDeviceStateForLog(),
  });
  return true;
}

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

const SUBSCRIBABLE_REMOTE_TRACK_KINDS = new Set(['audio', 'video']);
const SUBSCRIBABLE_REMOTE_TRACK_SOURCES = new Set([
  Track.Source.Camera,
  Track.Source.Microphone,
  'camera',
  'microphone',
]);

type RemoteTrackPublicationLike = {
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
  track?: AudioStatsTrackLike;
};

type AudioStatsTrackLike = {
  kind?: string;
  source?: string;
  sid?: string;
  isMuted?: boolean;
  mediaStreamTrack?: unknown;
  getRTCStatsReport?: () => Promise<unknown>;
};

type RemoteTrackPublicationCollection = {
  forEach: (callback: (publication: RemoteTrackPublicationLike) => void) => void;
};

type RemoteParticipantLike = {
  identity?: string;
  sid?: string;
  name?: string;
  isLocal?: boolean;
  trackPublications?: RemoteTrackPublicationCollection;
  audioTrackPublications?: RemoteTrackPublicationCollection;
  videoTrackPublications?: RemoteTrackPublicationCollection;
};

function managedTrackDebugPayload(
  publication?: RemoteTrackPublicationLike,
  participant?: RemoteParticipantLike,
) {
  return {
    trackKind: publication?.kind ?? publication?.track?.kind,
    trackSource: publication?.source ?? publication?.track?.source,
    trackSid: publication?.trackSid ?? publication?.sid ?? publication?.track?.sid,
    muted: publication?.isMuted ?? publication?.track?.isMuted,
    isSubscribed: publication?.isSubscribed,
    isDesired: publication?.isDesired,
    subscriptionStatus: debugValue(publication?.subscriptionStatus),
    permissionStatus: debugValue(publication?.permissionStatus),
    participantIdentity: participant?.identity,
    participantSid: participant?.sid,
    participantName: participant?.name,
    participantIsLocal: participant?.isLocal,
  };
}

type RemoteSubscriptionDebugContext = {
  callId: string;
  callType: LiveKitCallType;
  callUuid: string;
  roomName: string;
  reason: string;
};

type RemoteSubscriptionRequestedCallback = (params: {
  publication: RemoteTrackPublicationLike;
  participant?: RemoteParticipantLike;
  context: RemoteSubscriptionDebugContext;
}) => void;

type RemoteSubscriptionPendingCheck = (trackSid: string) => boolean;

type PendingRemoteSubscription = {
  timeoutId: ReturnType<typeof setTimeout>;
  retried: boolean;
  publication: RemoteTrackPublicationLike;
  participant?: RemoteParticipantLike;
  context: RemoteSubscriptionDebugContext;
};

function shouldSubscribeRemotePublication(
  publication?: RemoteTrackPublicationLike,
): publication is RemoteTrackPublicationLike & {
  setSubscribed: (subscribed: boolean) => void;
} {
  if (!publication || typeof publication.setSubscribed !== 'function') {
    return false;
  }
  const kind = String(publication.kind ?? '').toLowerCase();
  const source = String(publication.source ?? '').toLowerCase();
  return (
    SUBSCRIBABLE_REMOTE_TRACK_KINDS.has(kind) ||
    SUBSCRIBABLE_REMOTE_TRACK_SOURCES.has(source)
  );
}

function isRemoteMicrophonePublication(
  publication?: RemoteTrackPublicationLike,
) {
  const kind = String(publication?.kind ?? publication?.track?.kind ?? '')
    .toLowerCase();
  const source = String(publication?.source ?? publication?.track?.source ?? '')
    .toLowerCase();
  if (source) return source === String(Track.Source.Microphone);
  return kind === 'audio';
}

function debugValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function remoteSubscriptionDebugPayload(
  context: RemoteSubscriptionDebugContext,
  publication?: RemoteTrackPublicationLike,
  participant?: RemoteParticipantLike,
) {
  return {
    callId: context.callId,
    callType: context.callType,
    callUuid: context.callUuid,
    roomName: context.roomName,
    reason: context.reason,
    trackKind: publication?.kind,
    trackSource: publication?.source,
    trackSid: publication?.trackSid,
    isSubscribed: publication?.isSubscribed,
    isDesired: publication?.isDesired,
    subscriptionStatus: debugValue(publication?.subscriptionStatus),
    permissionStatus: debugValue(publication?.permissionStatus),
    participantIdentity: participant?.identity,
    participantSid: participant?.sid,
    participantName: participant?.name,
  };
}

function requestRemoteTrackSubscription(params: {
  publication?: RemoteTrackPublicationLike;
  participant?: RemoteParticipantLike;
  context: RemoteSubscriptionDebugContext;
  onSubscriptionRequested?: RemoteSubscriptionRequestedCallback;
  isSubscriptionPending?: RemoteSubscriptionPendingCheck;
}) {
  const {
    publication,
    participant,
    context,
    onSubscriptionRequested,
    isSubscriptionPending,
  } = params;
  if (!shouldSubscribeRemotePublication(publication)) return;
  if (publication?.isSubscribed) return;
  const trackSid = publication.trackSid ?? publication.sid ?? '';
  if (trackSid && isSubscriptionPending?.(trackSid)) return;

  logCallDebug('track_subscription_requested', {
    ...remoteSubscriptionDebugPayload(context, publication, participant),
  });

  try {
    publication.setSubscribed(true);
    onSubscriptionRequested?.({ publication, participant, context });
  } catch (error) {
    logCallDebug('track_subscription_failed', {
      ...remoteSubscriptionDebugPayload(context, publication, participant),
      error: serializeCallDebugError(error),
    });
  }
}

function requestRemoteParticipantTrackSubscriptions(params: {
  participant?: RemoteParticipantLike;
  context: RemoteSubscriptionDebugContext;
  onSubscriptionRequested?: RemoteSubscriptionRequestedCallback;
  isSubscriptionPending?: RemoteSubscriptionPendingCheck;
}) {
  const {
    participant,
    context,
    onSubscriptionRequested,
    isSubscriptionPending,
  } = params;
  const seenTrackSids = new Set<string>();
  const visit = (publication: RemoteTrackPublicationLike) => {
    const trackSid = publication.trackSid ?? '';
    if (trackSid && seenTrackSids.has(trackSid)) return;
    if (trackSid) seenTrackSids.add(trackSid);
    requestRemoteTrackSubscription({
      publication,
      participant,
      context,
      onSubscriptionRequested,
      isSubscriptionPending,
    });
  };

  participant?.trackPublications?.forEach(visit);
  participant?.audioTrackPublications?.forEach(visit);
  participant?.videoTrackPublications?.forEach(visit);
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
    iosNativeAudioReady: false,
    error: '',
    isMinimized: false,
    hasMediaPermissions: null,
    mediaErrorText: '',
    startedAt: 0,
    elapsedSeconds: 0,
    localVideoStreamUrl: '',
    localVideoRenderKey: 0,
    localCameraFacingMode: 'user',
    remoteVideoStreamUrl: '',
    hasRemoteParticipant: false,
    isLocalMicrophoneEnabled: true,
    isLocalCameraEnabled: params.callType === 'video',
    audioOutputMode: defaultCallAudioOutputMode(params.callType),
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
      localCameraFacingMode: cameraFacingModeRef.current,
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
        if (isCameraEnabled) {
          await localParticipant.setCameraEnabled(false);
          return;
        }

        await localParticipant.setCameraEnabled(true, {
          facingMode: cameraFacingModeRef.current,
        });
      },
      switchCamera: async () => {
        if (callType !== 'video') return;
        if (!isCameraEnabled) {
          await localParticipant.setCameraEnabled(true, {
            facingMode: cameraFacingModeRef.current,
          });
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
        onMediaState({
          localCameraFacingMode: nextFacingMode,
        });

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
  const audioStatsProbeCleanupRef = useRef<(() => void) | null>(null);
  const videoStatsProbeCleanupRef = useRef<(() => void) | null>(null);
  const mediaControllerRef = useRef<LiveKitMediaController | null>(null);
  const closeSentRef = useRef(false);
  const isJoiningAnsweredCallRef = useRef(false);
  const isAnswerWatchdogCheckingRef = useRef(false);
  const activeConnectKeyRef = useRef('');
  const connectPayloadPromiseRef = useRef<Promise<void> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pendingRemoteSubscriptionsRef = useRef(
    new Map<string, PendingRemoteSubscription>(),
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

  const clearRemoteTrackSubscriptionTimeout = useCallback(
    (trackSid?: string) => {
      if (!trackSid) return;
      const pending = pendingRemoteSubscriptionsRef.current.get(trackSid);
      if (!pending) return;
      clearTimeout(pending.timeoutId);
      pendingRemoteSubscriptionsRef.current.delete(trackSid);
    },
    [],
  );

  const clearAllRemoteTrackSubscriptionTimeouts = useCallback(() => {
    pendingRemoteSubscriptionsRef.current.forEach(pending => {
      clearTimeout(pending.timeoutId);
    });
    pendingRemoteSubscriptionsRef.current.clear();
  }, []);

  const isRemoteTrackSubscriptionPending = useCallback(
    (trackSid: string) =>
      pendingRemoteSubscriptionsRef.current.has(trackSid),
    [],
  );

  const scheduleRemoteTrackSubscriptionTimeout = useCallback(
    (
      params: {
        publication: RemoteTrackPublicationLike;
        participant?: RemoteParticipantLike;
        context: RemoteSubscriptionDebugContext;
      },
      retried = false,
    ) => {
      const { publication, participant, context } = params;
      const trackSid = publication.trackSid;
      if (!trackSid) return;

      clearRemoteTrackSubscriptionTimeout(trackSid);
      const timeoutId = setTimeout(() => {
        const pending = pendingRemoteSubscriptionsRef.current.get(trackSid);
        if (!pending) return;
        if (publication.isSubscribed) {
          clearRemoteTrackSubscriptionTimeout(trackSid);
          return;
        }

        logCallDebug('track_subscription_timeout', {
          ...remoteSubscriptionDebugPayload(context, publication, participant),
          retried: pending.retried,
          timeoutMs: REMOTE_SUBSCRIPTION_TIMEOUT_MS,
        });

        if (pending.retried) {
          logCallDebug('track_subscription_terminal_failure', {
            ...remoteSubscriptionDebugPayload(
              pending.context,
              publication,
              participant,
            ),
            retryAttempt: 1,
          });
          if (isRemoteMicrophonePublication(publication)) {
            setSession(current => {
              if (
                !current ||
                current.callId !== pending.context.callId ||
                current.nativeCallUuid !== pending.context.callUuid ||
                isFinalPhase(current.phase)
              ) {
                return current;
              }
              const next = {
                ...current,
                mediaErrorText: REMOTE_AUDIO_SUBSCRIPTION_ERROR,
              };
              sessionRef.current = next;
              return next;
            });
          }
          return;
        }

        logCallDebug('track_subscription_retry', {
          ...remoteSubscriptionDebugPayload(context, publication, participant),
          retryAttempt: 1,
        });

        try {
          if (typeof publication.setSubscribed !== 'function') {
            throw new Error('Remote publication cannot be subscribed.');
          }
          publication.setSubscribed(false);
          publication.setSubscribed(true);
          logCallDebug('track_subscription_retry_applied', {
            ...remoteSubscriptionDebugPayload(
              context,
              publication,
              participant,
            ),
            retryAttempt: 1,
          });
          scheduleRemoteTrackSubscriptionTimeout(
            {
              publication,
              participant,
              context,
            },
            true,
          );
        } catch (error) {
          logCallDebug('track_subscription_failed', {
            ...remoteSubscriptionDebugPayload(
              context,
              publication,
              participant,
            ),
            retryAttempt: 1,
            error: serializeCallDebugError(error),
          });
          pendingRemoteSubscriptionsRef.current.delete(trackSid);
        }
      }, REMOTE_SUBSCRIPTION_TIMEOUT_MS);

      pendingRemoteSubscriptionsRef.current.set(trackSid, {
        timeoutId,
        retried,
        publication,
        participant,
        context,
      });
    },
    [clearRemoteTrackSubscriptionTimeout],
  );

  const disconnectActiveRoom = useCallback(() => {
    clearAllRemoteTrackSubscriptionTimeouts();
    roomEventCleanupRef.current?.();
    roomEventCleanupRef.current = null;
    const room = activeRoomRef.current;
    activeRoomRef.current = null;
    setActiveRoom(null);
    disconnectRoomSafely(room);
  }, [clearAllRemoteTrackSubscriptionTimeouts]);

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

  const resetMediaState = useCallback((options: { stopAudioSession?: boolean } = {}) => {
    const current = sessionRef.current;
    const shouldStopAudioSession =
      options.stopAudioSession ??
      !(Platform.OS === 'ios' && usesNativeCallUi(current?.nativeCallUuid));
    mediaControllerRef.current = null;
    activeConnectKeyRef.current = '';
    connectPayloadPromiseRef.current = null;
    audioStatsProbeCleanupRef.current?.();
    audioStatsProbeCleanupRef.current = null;
    videoStatsProbeCleanupRef.current?.();
    videoStatsProbeCleanupRef.current = null;
    if (current) {
      const params = {
        callId: current.callId,
        callType: current.callType,
        callUuid: current.nativeCallUuid,
        roomName: current.payload?.call.roomName ?? '',
        stage: 'release' as const,
      };
      setIosVoiceCallAudioActive(false, params);
      logIosAudioDeviceState({ ...params, checkpoint: 'release' });
    }
    disconnectActiveRoom();
    resetCallRemoteAudioVolume();
    if (shouldStopAudioSession) {
      AudioSession.stopAudioSession().catch(() => undefined);
    }
  }, [disconnectActiveRoom]);

  const finishSession = useCallback(
    (patch?: Partial<LiveKitCallSession>) => {
      const current = sessionRef.current;
      const isIosNativeCall =
        Platform.OS === 'ios' && usesNativeCallUi(current?.nativeCallUuid);
      clearRingTimers();
      if (isIosNativeCall && current?.nativeCallUuid) {
        endNativeCall(current.nativeCallUuid);
      }
      resetMediaState({ stopAudioSession: !isIosNativeCall });
      if (!isIosNativeCall && current?.nativeCallUuid) {
        endNativeCall(current.nativeCallUuid);
      }
      setSession(currentSession => {
        const next = currentSession
          ? {
              ...currentSession,
              ...patch,
              phase: patch?.phase ?? 'ended',
              payload: null,
              iosNativeAudioReady: false,
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

  const patchSessionForCurrentCall = useCallback(
    (
      room: Room,
      callId: string,
      callUuid: string,
      patch: Partial<LiveKitCallSession>,
    ) => {
      const current = sessionRef.current;
      if (!current || isFinalPhase(current.phase)) return;
      if (current.callId !== callId || current.nativeCallUuid !== callUuid) {
        return;
      }
      if (activeRoomRef.current !== room) return;
      patchSession(patch);
    },
    [patchSession],
  );

  const preserveRemoteAudioSubscriptionError = useCallback(
    () =>
      sessionRef.current?.mediaErrorText === REMOTE_AUDIO_SUBSCRIPTION_ERROR
        ? REMOTE_AUDIO_SUBSCRIPTION_ERROR
        : '',
    [],
  );

  const publishLocalCallMedia = useCallback(
    async (params: {
      room: Room;
      callId: string;
      callType: LiveKitCallType;
      callUuid: string;
      roomName: string;
    }) => {
      const { room, callId, callType, callUuid, roomName } = params;
      const isCallKitAudioReady = await waitForRequiredCallKitAudioSession({
        callId,
        callType,
        callUuid,
        roomName,
      });
      if (!isCallKitAudioReady) return;

      const enableMicrophone = async () => {
        try {
          logCallDebug('local_microphone_enable_start', {
            callId,
            callType,
            callUuid,
            roomName,
          });
          const microphonePublication = await withCallMediaTimeout(
            room.localParticipant.setMicrophoneEnabled(true),
            'microphone',
          );
          logCallDebug('local_track_published', {
            callId,
            callType,
            callUuid,
            roomName,
            trackKind: microphonePublication?.kind,
            trackSource: microphonePublication?.source,
            trackSid: microphonePublication?.trackSid,
            muted: microphonePublication?.isMuted,
          });
          logCallDebug('local_microphone_enabled', {
            callId,
            callType,
            callUuid,
            roomName,
            enabled: true,
          });
          audioStatsProbeCleanupRef.current?.();
          audioStatsProbeCleanupRef.current = startCallAudioStatsProbe({
            room,
            callId,
            callType,
            callUuid,
            roomName,
          });
          patchSessionForCurrentCall(room, callId, callUuid, {
            isLocalMicrophoneEnabled: true,
            mediaErrorText: preserveRemoteAudioSubscriptionError(),
          });
        } catch (microphoneError) {
          logCallDebug('local_microphone_enabled', {
            callId,
            callType,
            callUuid,
            roomName,
            enabled: false,
            error: serializeCallDebugError(microphoneError),
          });
          patchSessionForCurrentCall(room, callId, callUuid, {
            isLocalMicrophoneEnabled: false,
            mediaErrorText: 'Không bật được micro. Bạn vẫn đang ở trong phòng gọi.',
          });
        }
      };

      const enableCamera = async () => {
        if (callType !== 'video') {
          logCallDebug('local_camera_enabled', {
            callId,
            callType,
            callUuid,
            roomName,
            enabled: false,
            skipped: true,
          });
          return;
        }

        try {
          logCallDebug('local_camera_enable_start', {
            callId,
            callType,
            callUuid,
            roomName,
          });
          const cameraPublication = await withCallMediaTimeout(
            room.localParticipant.setCameraEnabled(true),
            'camera',
          );
          logCallDebug('local_track_published', {
            callId,
            callType,
            callUuid,
            roomName,
            trackKind: cameraPublication?.kind,
            trackSource: cameraPublication?.source,
            trackSid: cameraPublication?.trackSid,
            muted: cameraPublication?.isMuted,
          });
          logCallDebug('local_camera_enabled', {
            callId,
            callType,
            callUuid,
            roomName,
            enabled: true,
          });
          videoStatsProbeCleanupRef.current?.();
          videoStatsProbeCleanupRef.current = startCallVideoStatsProbe({
            room,
            callId,
            callType,
            callUuid,
            roomName,
          });
          patchSessionForCurrentCall(room, callId, callUuid, {
            isLocalCameraEnabled: true,
            mediaErrorText: preserveRemoteAudioSubscriptionError(),
          });
        } catch (cameraError) {
          logCallDebug('local_camera_enabled', {
            callId,
            callType,
            callUuid,
            roomName,
            enabled: false,
            error: serializeCallDebugError(cameraError),
          });
          patchSessionForCurrentCall(room, callId, callUuid, {
            isLocalCameraEnabled: false,
            mediaErrorText:
              'Không bật được camera. Bạn vẫn đang ở trong phòng gọi.',
          });
        }
      };

      await Promise.allSettled([enableMicrophone(), enableCamera()]);
    },
    [patchSessionForCurrentCall, preserveRemoteAudioSubscriptionError],
  );

  const prepareIosDirectCallAudioGate = useCallback(
    async (params: {
      callId: string;
      callType: LiveKitCallType;
      callUuid: string;
      roomName: string;
    }) => {
      const { callId, callType, callUuid, roomName } = params;
      const hasNativeCallUi = usesNativeCallUi(callUuid);
      logCallDebug('ios_direct_call_audio_gate_prepare_start', {
        callId,
        callType,
        callUuid,
        roomName,
        usesNativeCallUi: hasNativeCallUi,
      });
      setIosVoiceCallAudioActive(true, {
        callId,
        callType,
        callUuid,
        roomName,
        stage: 'before_connect',
      });

      try {
        const isNativeAudioReady = await waitForRequiredCallKitAudioSession({
          callId,
          callType,
          callUuid,
          roomName,
        });
        if (!isNativeAudioReady) {
          throw new Error(
            'Không thể kích hoạt audio session CallKit cho cuộc gọi.',
          );
        }
        logIosAudioDeviceState({
          callId,
          callType,
          callUuid,
          roomName,
          stage: 'before_connect',
          checkpoint: 'before_connect',
        });
      } catch (error) {
        setIosVoiceCallAudioActive(false, {
          callId,
          callType,
          callUuid,
          roomName,
          stage: 'ios_direct_room_error',
        });
        throw error;
      }

      logCallDebug('ios_direct_call_audio_gate_prepare_end', {
        callId,
        callType,
        callUuid,
        roomName,
      });
    },
    [],
  );

  const connectPayload = useCallback(
    async (
      callId: string,
      callType: LiveKitCallType,
      callUuid: string,
      timingOverride?: LiveKitCallRealtimeTiming,
    ) => {
      const nextConnectKey = buildDirectCallConnectKey({
        callId,
        callType,
        callUuid,
      });
      const current = sessionRef.current;
      const currentConnectKey = buildDirectCallConnectKey(current);
      if (
        nextConnectKey &&
        activeConnectKeyRef.current === nextConnectKey &&
        (connectPayloadPromiseRef.current ||
          (currentConnectKey === nextConnectKey &&
            (current?.phase === 'connecting' || Boolean(current?.payload))))
      ) {
        logCallDebug('room_connect_deduped', {
          callId,
          callType,
          callUuid,
          phase: current?.phase,
          hasPayload: Boolean(current?.payload),
          hasConnectPromise: Boolean(connectPayloadPromiseRef.current),
        });
        return connectPayloadPromiseRef.current ?? undefined;
      }
      activeConnectKeyRef.current = nextConnectKey;
      patchSession({ phase: 'connecting', iosNativeAudioReady: false });
      const initialAudioOutputMode = defaultCallAudioOutputMode(callType);
      await configureCallAudioSession(initialAudioOutputMode).catch(
        () => undefined,
      );
      const shouldStartAudioSessionBeforeConnect =
        Platform.OS !== 'ios' || !usesNativeCallUi(callUuid);
      if (shouldStartAudioSessionBeforeConnect) {
        await AudioSession.startAudioSession().catch(() => undefined);
      }
      logCallDebug('payload_request', {
        callId,
        callType,
        callUuid,
      });
      let nextPayload: LiveKitJoinPayload;
      try {
        const payloadPromise = repository.getJoinPayload({ callId, callType });
        connectPayloadPromiseRef.current = payloadPromise.then(
          () => undefined,
          () => undefined,
        );
        nextPayload = await payloadPromise;
      } catch (payloadError) {
        if (activeConnectKeyRef.current === nextConnectKey) {
          connectPayloadPromiseRef.current = null;
        }
        logCallDebug('payload_error', {
          callId,
          callType,
          callUuid,
          error: serializeCallDebugError(payloadError),
        });
        throw payloadError;
      }
      logCallDebug('payload_response', {
        callId,
        callType,
        callUuid,
        wsUrl: nextPayload.wsUrl,
        roomName: nextPayload.call.roomName,
        sourceRoomName: nextPayload.call.sourceRoomName,
        callStatus: nextPayload.call.status,
        startedAt: nextPayload.call.startedAt,
        startedAtMs: nextPayload.call.startedAtMs,
        elapsedSeconds: nextPayload.elapsedSeconds,
        elapsedMs: nextPayload.elapsedMs,
        serverNow: nextPayload.serverNow,
        serverNowMs: nextPayload.serverNowMs,
        currentUserId: nextPayload.currentUser.id,
        peerId: nextPayload.peer?.id,
        tokenLength: nextPayload.token.length,
      });
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

      const shouldPrepareIosDirectAudioGate =
        shouldUseIosDirectCallAudioGate(callType);

      if (shouldPrepareIosDirectAudioGate) {
        try {
          await prepareIosDirectCallAudioGate({
            callId,
            callType,
            callUuid,
            roomName: nextPayload.call.roomName,
          });
        } catch (prepareError) {
          if (activeConnectKeyRef.current === nextConnectKey) {
            activeConnectKeyRef.current = '';
            connectPayloadPromiseRef.current = null;
          }
          if (usesNativeCallUi(callUuid)) {
            endNativeCall(callUuid);
          }
          throw prepareError;
        }
      }

      const nextRoom = new Room(LIVEKIT_ROOM_OPTIONS);
      const handleDisconnected = (reason?: DisconnectReason) => {
        logCallDebug('room_disconnected', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          reason: reason ? String(reason) : '',
        });
        const activeSession = sessionRef.current;
        if (
          activeRoomRef.current !== nextRoom ||
          closeSentRef.current ||
          !activeSession ||
          isFinalPhase(activeSession.phase)
        ) {
          return;
        }
        finishSession({
          phase: 'error',
          error: reason
            ? `Kết nối media bị ngắt: ${String(reason)}.`
            : 'Kết nối media bị ngắt.',
        });
      };
      const handleMediaDeviceError = (error: Error) => {
        const failure = MediaDeviceFailure.getFailure(error);
        logCallDebug('media_device_error', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          failure: failure ? String(failure) : '',
          error: serializeCallDebugError(error),
        });
        patchSession({
          mediaErrorText: failure
            ? `Không mở được thiết bị media: ${String(failure)}.`
            : 'Không mở được camera hoặc micro.',
        });
      };
      const handleEncryptionError = () => {
        logCallDebug('encryption_error', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
        });
        patchSession({
          mediaErrorText: 'Không thể mã hóa kết nối media.',
        });
      };
      const handleConnected = () => {
        logCallDebug('room_connected', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          sourceRoomName: nextPayload.call.sourceRoomName,
          connectionState: String(nextRoom.state),
          localIdentity: nextRoom.localParticipant.identity,
          remoteParticipants: nextRoom.remoteParticipants.size,
        });
        nextRoom.remoteParticipants.forEach(participant => {
          requestRemoteParticipantTrackSubscriptions({
            participant,
            context: {
              callId,
              callType,
              callUuid,
              roomName: nextPayload.call.roomName,
              reason: 'room_connected',
            },
            onSubscriptionRequested: scheduleRemoteTrackSubscriptionTimeout,
            isSubscriptionPending: isRemoteTrackSubscriptionPending,
          });
        });
      };
      const handleParticipantConnected = (
        participant: RemoteParticipantLike,
      ) => {
        logCallDebug('participant_connected', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          participantIdentity: participant.identity,
          participantSid: participant.sid,
          participantName: participant.name,
          remoteParticipants: nextRoom.remoteParticipants.size,
        });
        requestRemoteParticipantTrackSubscriptions({
          participant,
          context: {
            callId,
            callType,
            callUuid,
            roomName: nextPayload.call.roomName,
            reason: 'participant_connected',
          },
          onSubscriptionRequested: scheduleRemoteTrackSubscriptionTimeout,
          isSubscriptionPending: isRemoteTrackSubscriptionPending,
        });
      };
      const handleParticipantDisconnected = () => {
        const activeSession = sessionRef.current;
        if (!activeSession || closeSentRef.current) return;
        closeSentRef.current = true;
        finishSession();
      };
      const handleTrackPublished = (
        publication?: RemoteTrackPublicationLike,
        participant?: RemoteParticipantLike,
      ) => {
        logCallDebug('track_published', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          trackKind: publication?.kind,
          trackSource: publication?.source,
          trackSid: publication?.trackSid,
          participantIdentity: participant?.identity,
          participantSid: participant?.sid,
          participantName: participant?.name,
        });
        requestRemoteTrackSubscription({
          publication,
          participant,
          context: {
            callId,
            callType,
            callUuid,
            roomName: nextPayload.call.roomName,
            reason: 'track_published',
          },
          onSubscriptionRequested: scheduleRemoteTrackSubscriptionTimeout,
          isSubscriptionPending: isRemoteTrackSubscriptionPending,
        });
      };
      const handleLocalTrackPublished = (publication?: {
        kind?: string;
        source?: string;
        trackSid?: string;
        isMuted?: boolean;
      }) => {
        logCallDebug('local_track_published', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          trackKind: publication?.kind,
          trackSource: publication?.source,
          trackSid: publication?.trackSid,
          muted: publication?.isMuted,
          participantIdentity: nextRoom.localParticipant.identity,
        });
      };
      const handleTrackSubscribed = (
        track?: { kind?: string; source?: string; sid?: string },
        publication?: RemoteTrackPublicationLike,
        participant?: RemoteParticipantLike,
      ) => {
        setRemoteAudioTrackOutputMode(
          track,
          sessionRef.current?.audioOutputMode ??
            defaultCallAudioOutputMode(callType),
        );
        const trackSid = track?.sid ?? publication?.trackSid;
        clearRemoteTrackSubscriptionTimeout(trackSid);
        const subscribedPublication = {
          ...publication,
          kind: track?.kind ?? publication?.kind,
          source: track?.source ?? publication?.source,
        };
        logCallDebug('track_subscribed', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          trackKind: track?.kind ?? publication?.kind,
          trackSource: track?.source ?? publication?.source,
          trackSid,
          isSubscribed: publication?.isSubscribed,
          isDesired: publication?.isDesired,
          subscriptionStatus: debugValue(publication?.subscriptionStatus),
          permissionStatus: debugValue(publication?.permissionStatus),
          participantIdentity: participant?.identity,
          participantSid: participant?.sid,
          participantName: participant?.name,
        });
        if (isRemoteMicrophonePublication(subscribedPublication)) {
          logCallDebug('remote_audio_ready', {
            callId,
            callType,
            callUuid,
            roomName: nextPayload.call.roomName,
            trackSid,
            participantIdentity: participant?.identity,
            participantSid: participant?.sid,
          });
          const activeSession = sessionRef.current;
          patchSessionForCurrentCall(nextRoom, callId, callUuid, {
            hasRemoteParticipant: true,
            isRemoteMicrophoneMuted: publication?.isMuted ?? false,
            mediaErrorText:
              activeSession?.mediaErrorText ===
              REMOTE_AUDIO_SUBSCRIPTION_ERROR
                ? ''
                : (activeSession?.mediaErrorText ?? ''),
          });
        }
      };
      const handleTrackSubscriptionFailed = (
        trackSid?: string,
        participant?: RemoteParticipantLike,
      ) => {
        logCallDebug('track_subscription_sdk_failed', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          trackSid,
          participantIdentity: participant?.identity,
          participantSid: participant?.sid,
          participantName: participant?.name,
        });
      };
      const handleTrackSubscriptionStatusChanged = (
        publication?: RemoteTrackPublicationLike,
        status?: unknown,
        participant?: RemoteParticipantLike,
      ) => {
        if (publication?.isSubscribed) {
          clearRemoteTrackSubscriptionTimeout(publication.trackSid);
        }
        logCallDebug('track_subscription_status_changed', {
          ...remoteSubscriptionDebugPayload(
            {
              callId,
              callType,
              callUuid,
              roomName: nextPayload.call.roomName,
              reason: 'sdk_status_changed',
            },
            publication,
            participant,
          ),
          status: debugValue(status),
        });
      };
      const handleTrackSubscriptionPermissionChanged = (
        publication?: RemoteTrackPublicationLike,
        status?: unknown,
        participant?: RemoteParticipantLike,
      ) => {
        logCallDebug('track_subscription_permission_changed', {
          ...remoteSubscriptionDebugPayload(
            {
              callId,
              callType,
              callUuid,
              roomName: nextPayload.call.roomName,
              reason: 'sdk_permission_changed',
            },
            publication,
            participant,
          ),
          status: debugValue(status),
        });
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
        .on(RoomEvent.Connected, handleConnected)
        .on(RoomEvent.Disconnected, handleDisconnected)
        .on(RoomEvent.MediaDevicesError, handleMediaDeviceError)
        .on(RoomEvent.EncryptionError, handleEncryptionError)
        .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .on(RoomEvent.TrackPublished, handleTrackPublished)
        .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
        .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .on(RoomEvent.TrackSubscriptionFailed, handleTrackSubscriptionFailed)
        .on(
          RoomEvent.TrackSubscriptionStatusChanged,
          handleTrackSubscriptionStatusChanged,
        )
        .on(
          RoomEvent.TrackSubscriptionPermissionChanged,
          handleTrackSubscriptionPermissionChanged,
        )
        .on(RoomEvent.DataReceived, handleDataReceived);
      roomEventCleanupRef.current = () => {
        nextRoom
          .off(RoomEvent.Connected, handleConnected)
          .off(RoomEvent.Disconnected, handleDisconnected)
          .off(RoomEvent.MediaDevicesError, handleMediaDeviceError)
          .off(RoomEvent.EncryptionError, handleEncryptionError)
          .off(RoomEvent.ParticipantConnected, handleParticipantConnected)
          .off(
            RoomEvent.ParticipantDisconnected,
            handleParticipantDisconnected,
          )
          .off(RoomEvent.TrackPublished, handleTrackPublished)
          .off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
          .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
          .off(
            RoomEvent.TrackSubscriptionFailed,
            handleTrackSubscriptionFailed,
          )
          .off(
            RoomEvent.TrackSubscriptionStatusChanged,
            handleTrackSubscriptionStatusChanged,
          )
          .off(
            RoomEvent.TrackSubscriptionPermissionChanged,
            handleTrackSubscriptionPermissionChanged,
          )
          .off(RoomEvent.DataReceived, handleDataReceived);
      };

      activeRoomRef.current = nextRoom;
      setActiveRoom(nextRoom);
      setSession(existingSession => {
        const next: LiveKitCallSession | null = existingSession
          ? {
              ...existingSession,
              callId,
              callType,
              payload: nextPayload,
              iosNativeAudioReady: shouldPrepareIosDirectAudioGate,
              peer: nextPayload.peer || existingSession.peer,
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
        logCallDebug('room_connect_start', {
          callId,
          callType,
          callUuid,
          wsUrl: nextPayload.wsUrl,
          roomName: nextPayload.call.roomName,
          autoSubscribe: LIVEKIT_CONNECT_OPTIONS.autoSubscribe,
          adaptiveStream: LIVEKIT_ROOM_OPTIONS.adaptiveStream,
          dynacast: LIVEKIT_ROOM_OPTIONS.dynacast,
          singlePeerConnection: LIVEKIT_ROOM_OPTIONS.singlePeerConnection,
        });
        await nextRoom.connect(nextPayload.wsUrl, nextPayload.token, LIVEKIT_CONNECT_OPTIONS);
        await applyCallAudioOutputMode(
          nextRoom,
          sessionRef.current?.audioOutputMode ?? initialAudioOutputMode,
        );
        logCallDebug('room_connect_success', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          connectionState: String(nextRoom.state),
        });
      } catch (caught) {
        logCallDebug('room_connect_error', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          error: serializeCallDebugError(caught),
        });
        if (shouldPrepareIosDirectAudioGate) {
          setIosVoiceCallAudioActive(false, {
            callId,
            callType,
            callUuid,
            roomName: nextPayload.call.roomName,
            stage: 'ios_direct_room_error',
          });
          logIosAudioDeviceState({
            callId,
            callType,
            callUuid,
            roomName: nextPayload.call.roomName,
            stage: 'ios_direct_room_error',
            checkpoint: 'room_connect_error',
          });
          if (usesNativeCallUi(callUuid)) {
            endNativeCall(callUuid);
          }
        }
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
        isLocalMicrophoneEnabled: false,
        isLocalCameraEnabled: false,
      });
      if (callUuid) markNativeCallConnected(callUuid);
      publishLocalCallMedia({
        room: nextRoom,
        callId,
        callType,
        callUuid,
        roomName: nextPayload.call.roomName,
      }).catch(error => {
        logCallDebug('local_media_publish_error', {
          callId,
          callType,
          callUuid,
          roomName: nextPayload.call.roomName,
          error: serializeCallDebugError(error),
        });
      });
    },
    [
      clearRemoteTrackSubscriptionTimeout,
      disconnectActiveRoom,
      finishSession,
      isRemoteTrackSubscriptionPending,
      patchSession,
      patchSessionForCurrentCall,
      prepareIosDirectCallAudioGate,
      publishLocalCallMedia,
      repository,
      scheduleRemoteTrackSubscriptionTimeout,
    ],
  );

  const joinAnsweredOutgoingCall = useCallback(
    async (
      callId: string,
      callType: LiveKitCallType,
      callUuid: string,
      timing?: LiveKitCallRealtimeTiming,
    ): Promise<boolean> => {
      const current = sessionRef.current;
      const nextConnectKey = buildDirectCallConnectKey({
        callId,
        callType,
        callUuid,
      });
      const currentConnectKey = buildDirectCallConnectKey(current);
      if (
        current &&
        currentConnectKey === nextConnectKey &&
        (current.phase === 'connecting' ||
          current.phase === 'connected' ||
          Boolean(current.payload))
      ) {
        return true;
      }
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
        const isIosNativeCall =
          Platform.OS === 'ios' && usesNativeCallUi(current.nativeCallUuid);
        if (isIosNativeCall && current.nativeCallUuid) {
          endNativeCall(current.nativeCallUuid);
        }
        disconnectActiveRoom();
        resetMediaState({ stopAudioSession: !isIosNativeCall });
        if (!isIosNativeCall && current.nativeCallUuid) {
          endNativeCall(current.nativeCallUuid);
        }
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
          const activeSession = sessionRef.current;
          const roomState = activeRoomRef.current?.state;
          const isAlreadyJoiningOrConnected =
            activeSession?.phase === 'connecting' ||
            activeSession?.phase === 'connected' ||
            Boolean(activeSession?.payload) ||
            (roomState !== undefined &&
              roomState !== ConnectionState.Disconnected);

          if (isAlreadyJoiningOrConnected) return true;
          if (
            !activeSession ||
            activeSession.direction !== 'outgoing' ||
            activeSession.callId !== nextCallId ||
            activeSession.phase !== 'ringing'
          ) {
            return true;
          }

          const status = await repository
            .checkCall({
              callId: nextCallId,
              callType: params.callType,
            })
            .catch(() => null);
          if (status && (status.finished || isTerminalCallStatus(status.status))) {
            closeSentRef.current = true;
            finishSession();
            return true;
          }

          if (status && status.status === 'answered') {
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
    async (call: IncomingLiveKitCall) => {
      const current = sessionRef.current;
      if (current && !isFinalPhase(current.phase)) {
        patchSession({ isMinimized: false });
        return true;
      }

      closeSentRef.current = false;
      clearRingTimers();
      const nextUuid = createNativeCallUuid(call.callId, call.callType);
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
        logCallDebug('media_permission_result', {
          callId: call.callId,
          callType: call.callType,
          granted: isGranted,
        });
        if (!isGranted) {
          throw new Error(formatPermissionError(call.callType));
        }
        patchSession({ hasMediaPermissions: true });

        patchSession({ nativeCallUuid: nextUuid });
        logCallDebug('callkit_answer_start', {
          callId: call.callId,
          callType: call.callType,
          callUuid: nextUuid,
          peerId: call.peer.id,
          peerName: call.peer.name,
        });
        logCallDebug('answer_request', {
          callId: call.callId,
          callType: call.callType,
          callUuid: nextUuid,
        });
        let answerTiming: LiveKitCallCheckResult;
        try {
          answerTiming = await repository.answerCall({
            callId: call.callId,
            callType: call.callType,
          });
        } catch (answerError) {
          logCallDebug('answer_error', {
            callId: call.callId,
            callType: call.callType,
            callUuid: nextUuid,
            error: serializeCallDebugError(answerError),
          });
          endNativeCall(nextUuid);
          throw answerError;
        }
        logCallDebug('answer_response', {
          callId: call.callId,
          callType: call.callType,
          callUuid: nextUuid,
          status: answerTiming.status,
          active: answerTiming.active,
          finished: answerTiming.finished,
          startedAt: answerTiming.startedAt,
          startedAtMs: answerTiming.startedAtMs,
          elapsedSeconds: answerTiming.elapsedSeconds,
          elapsedMs: answerTiming.elapsedMs,
          serverNow: answerTiming.serverNow,
          serverNowMs: answerTiming.serverNowMs,
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

      try {
        await boot();
        return true;
      } catch (caught) {
        logCallDebug('incoming_boot_error', {
          callId: call.callId,
          callType: call.callType,
          error: serializeCallDebugError(caught),
        });
        endNativeCall(nextUuid);
        patchSession({
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Không thể trả lời cuộc gọi.',
          hasMediaPermissions: false,
        });
        exitCallRoomIfFocused();
        return false;
      }
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

  const setAudioOutputMode = useCallback(async (mode: CallAudioOutputMode) => {
    await applyCallAudioOutputMode(activeRoomRef.current, mode);
    patchSession({ audioOutputMode: mode });
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
      async function syncCallStatus() {
        const current = sessionRef.current;
        if (!current || !current.callId || isFinalPhase(current.phase)) {
          return;
        }

        // Skip if the call is still initializing (no callId yet)
        // or if we're in the process of answering (brief transient phase)
        if (current.phase === 'initializing' || current.phase === 'answering') {
          return;
        }

        const status = await repository
          .checkCall({
            callId: current.callId,
            callType: current.callType,
          })
          .catch(checkError => {
            logCallDebug('check_error', {
              callId: current.callId,
              callType: current.callType,
              phase: current.phase,
              error: serializeCallDebugError(checkError),
            });
            return null;
          });
        if (!status) return;
        logCallDebug('check_response', {
          callId: current.callId,
          callType: current.callType,
          phase: current.phase,
          status: status.status,
          active: status.active,
          finished: status.finished,
          startedAt: status.startedAt,
          startedAtMs: status.startedAtMs,
          elapsedSeconds: status.elapsedSeconds,
          elapsedMs: status.elapsedMs,
          serverNow: status.serverNow,
          serverNowMs: status.serverNowMs,
        });

        if (status.finished) {
          closeSentRef.current = true;
          finishSession();
          return;
        }

        if (isTerminalCallStatus(status.status)) {
          closeSentRef.current = true;
          finishSession();
          return;
        }

        // Timer drift correction only applies during connected phase
        if (current.phase === 'connected' && status.status === 'answered') {
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

      syncCallStatus().catch(() => undefined);
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
        if (Platform.OS === 'ios' && usesNativeCallUi(current.nativeCallUuid)) {
          ensureIosCallKitAudioSessionStarted({
            callId: current.callId,
            callType: current.callType,
            callUuid: current.nativeCallUuid,
            roomName: current.payload?.call.roomName ?? '',
            stage: 'app_foreground',
            preferSpeakerOutput: current.audioOutputMode === 'speaker',
          })
            .then(() =>
              applyCallAudioOutputMode(
                activeRoomRef.current,
                current.audioOutputMode,
              ),
            )
            .catch(() => undefined);
          logIosAudioDeviceState({
            callId: current.callId,
            callType: current.callType,
            callUuid: current.nativeCallUuid,
            roomName: current.payload?.call.roomName ?? '',
            stage: 'app_foreground',
            checkpoint: 'app_foreground',
          });
        } else {
          AudioSession.startAudioSession()
            .then(() =>
              applyCallAudioOutputMode(
                activeRoomRef.current,
                current.audioOutputMode,
              ),
            )
            .catch(() => undefined);
        }
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
          if (status && (status.finished || isTerminalCallStatus(status.status))) {
            closeSentRef.current = true;
            finishSession();
            return true;
          }

          if (status && status.status === 'answered') {
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
  }, [finishSession, joinAnsweredOutgoingCall, repository]);

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
      setAudioOutputMode,
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
      setAudioOutputMode,
    ],
  );

  return (
    <LiveKitCallSessionContext.Provider value={value}>
      {children}
      {session?.payload &&
      session.hasMediaPermissions &&
      activeRoom ? (
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
