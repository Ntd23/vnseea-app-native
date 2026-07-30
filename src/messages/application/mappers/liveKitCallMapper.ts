// Description: Maps WoWonder LiveKit call API responses into Messages call domain types.
import type {
  CallDeliveryChannelState,
  CallDeliveryState,
  IncomingLiveKitCall,
  LiveKitCallCheckResult,
  LiveKitCallCreateResult,
  LiveKitCallPeer,
  LiveKitCallStatus,
  LiveKitCallSummary,
  LiveKitCallType,
  LiveKitJoinPayload,
} from '../../domain/types/call.types';

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function resolveString(value: unknown, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function resolveNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function resolveBoolean(value: unknown) {
  return value === true || value === 1 || value === '1';
}

function resolveExplicitFalse(value: unknown) {
  return value === false || value === 0 || value === '0' || value === 'false';
}

function normalizeDeliveryChannel(
  value: unknown,
): CallDeliveryChannelState {
  return value === 'accepted' || value === 'failed' ? value : 'unavailable';
}

export function mapCallDeliveryState(value: unknown): CallDeliveryState {
  const raw = asRecord(value);
  const channels = asRecord(raw.channels);
  const state =
    raw.state === 'accepted' ||
    raw.state === 'partial' ||
    raw.state === 'failed'
      ? raw.state
      : 'accepted';
  return {
    state,
    channels: {
      realtime: normalizeDeliveryChannel(channels.realtime),
      onesignal: normalizeDeliveryChannel(channels.onesignal),
      voip: normalizeDeliveryChannel(channels.voip),
    },
  };
}

export function normalizeLiveKitCallType(value: unknown): LiveKitCallType {
  return value === 'audio' ? 'audio' : 'video';
}

export function normalizeLiveKitCallStatus(value: unknown): LiveKitCallStatus {
  const status = resolveString(value, 'unknown');
  if (
    [
      'calling',
      'answered',
      'declined',
      'cancelled',
      'no_answer',
      'missed',
      'busy',
      'ended',
      'finished',
      'not_answered',
      'not_configured',
    ].includes(status)
  ) {
    return status as LiveKitCallStatus;
  }
  return 'unknown';
}

export function mapLiveKitPeer(value: unknown): LiveKitCallPeer {
  const raw = asRecord(value);
  return {
    id: resolveString(raw.id ?? raw.user_id),
    name: resolveString(raw.name, 'Người dùng'),
    avatar: resolveString(raw.avatar),
    username: resolveString(raw.username),
  };
}

function mapCallSummary(value: unknown): LiveKitCallSummary {
  const raw = asRecord(value);
  const startedAt = resolveNumber(raw.started_at);
  const startedAtMs = resolveNumber(raw.started_at_ms, startedAt * 1000);
  return {
    id: resolveString(raw.id),
    type: normalizeLiveKitCallType(raw.type),
    provider: 'livekit',
    roomName: resolveString(raw.room_name),
    sourceRoomName: resolveString(raw.source_room_name ?? raw.room_name),
    status: normalizeLiveKitCallStatus(raw.status),
    startedAt,
    startedAtMs,
  };
}

export function mapLiveKitCreateResponse(
  response: unknown,
): LiveKitCallCreateResult {
  const raw = asRecord(response);
  return {
    callId: resolveString(raw.id ?? raw.call_id),
    callType: normalizeLiveKitCallType(raw.call_type),
    provider: 'livekit',
    roomName: resolveString(raw.room_name),
    status: normalizeLiveKitCallStatus(raw.call_status ?? raw.status),
    busy: resolveBoolean(raw.busy),
    peer: raw.peer ? mapLiveKitPeer(raw.peer) : undefined,
    delivery: mapCallDeliveryState(raw.delivery),
  };
}

export function mapLiveKitCheckResponse(
  response: unknown,
): LiveKitCallCheckResult {
  const raw = asRecord(response);
  const status = normalizeLiveKitCallStatus(raw.call_status ?? raw.status);
  const startedAt = resolveNumber(raw.started_at);
  const serverNow = resolveNumber(raw.server_now);
  const elapsedSeconds = resolveNumber(raw.elapsed);
  return {
    callId: resolveString(raw.id ?? raw.call_id),
    callType: normalizeLiveKitCallType(raw.call_type),
    status,
    active: resolveBoolean(raw.active),
    finished:
      resolveBoolean(raw.finished) ||
      [
        'declined',
        'cancelled',
        'no_answer',
        'missed',
        'ended',
        'finished',
      ].includes(status),
    startedAt,
    startedAtMs: resolveNumber(raw.started_at_ms, startedAt * 1000),
    serverNow,
    serverNowMs: resolveNumber(raw.server_now_ms, serverNow * 1000),
    elapsedSeconds,
    elapsedMs: resolveNumber(raw.elapsed_ms, elapsedSeconds * 1000),
  };
}

export function mapLiveKitJoinPayload(response: unknown): LiveKitJoinPayload {
  const raw = asRecord(response);
  if (resolveExplicitFalse(raw.join_ready)) {
    const message = resolveString(raw.message || raw.error);
    throw new Error(
      message
        ? `LiveKit join payload is not ready: ${message}`
        : 'LiveKit join payload is not ready.',
    );
  }

  const livekit = asRecord(raw.livekit);
  const serverNow = resolveNumber(raw.server_now);
  const elapsedSeconds = resolveNumber(raw.elapsed);
  const call = mapCallSummary(raw.call);
  const wsUrl = resolveString(livekit.ws_url);
  const token = resolveString(livekit.token);
  if (!wsUrl || !token || !call.roomName) {
    throw new Error(
      'Missing LiveKit join payload: wsUrl, token, and roomName are required.',
    );
  }

  return {
    call,
    currentUser: mapLiveKitPeer(raw.current_user),
    peer: mapLiveKitPeer(raw.peer),
    wsUrl,
    token,
    serverNow,
    serverNowMs: resolveNumber(raw.server_now_ms, serverNow * 1000),
    elapsedSeconds,
    elapsedMs: resolveNumber(raw.elapsed_ms, elapsedSeconds * 1000),
  };
}

export function mapIncomingLiveKitCall(
  response: unknown,
): IncomingLiveKitCall | null {
  const raw = asRecord(response);
  const incoming = asRecord(raw.incoming_call);
  if (!incoming.call_id && !incoming.id) {
    return null;
  }
  return {
    callId: resolveString(incoming.call_id ?? incoming.id),
    callType: normalizeLiveKitCallType(incoming.call_type),
    provider: 'livekit',
    roomName: resolveString(incoming.room_name),
    peer: mapLiveKitPeer(incoming.peer),
    actionToken: resolveString(incoming.action_token) || undefined,
    expiresAt: resolveNumber(incoming.expires_at) || undefined,
    apiUrl: resolveString(incoming.api_url) || undefined,
  };
}
