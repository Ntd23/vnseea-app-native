// Description: Maps WoWonder LiveKit call API responses into Messages call domain types.
import type {
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
  return {
    id: resolveString(raw.id),
    type: normalizeLiveKitCallType(raw.type),
    provider: 'livekit',
    roomName: resolveString(raw.room_name),
    sourceRoomName: resolveString(raw.source_room_name ?? raw.room_name),
    status: normalizeLiveKitCallStatus(raw.status),
    startedAt: resolveNumber(raw.started_at),
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
  };
}

export function mapLiveKitCheckResponse(
  response: unknown,
): LiveKitCallCheckResult {
  const raw = asRecord(response);
  const status = normalizeLiveKitCallStatus(raw.call_status ?? raw.status);
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
  };
}

export function mapLiveKitJoinPayload(response: unknown): LiveKitJoinPayload {
  const raw = asRecord(response);
  const livekit = asRecord(raw.livekit);
  return {
    call: mapCallSummary(raw.call),
    currentUser: mapLiveKitPeer(raw.current_user),
    peer: mapLiveKitPeer(raw.peer),
    wsUrl: resolveString(livekit.ws_url),
    token: resolveString(livekit.token),
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
  };
}
