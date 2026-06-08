// Description: Maps WoWonder LiveKit group call API responses into Messages group call domain types.
import type { LiveKitCallType } from '../../domain/types/call.types';
import type {
  GroupLiveKitCallStatus,
  GroupLiveKitCallSummary,
  GroupLiveKitCreateResult,
  GroupLiveKitGroup,
  GroupLiveKitJoinPayload,
  GroupLiveKitParticipant,
  GroupLiveKitPeer,
  GroupLiveKitSyncResult,
  IncomingGroupLiveKitCall,
} from '../../domain/types/groupCall.types';

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

function normalizeCallType(value: unknown): LiveKitCallType {
  return value === 'audio' ? 'audio' : 'video';
}

function normalizeStatus(value: unknown): GroupLiveKitCallStatus {
  const status = resolveString(value, 'unknown');
  return status === 'active' || status === 'ended' ? status : 'unknown';
}

function elapsedFromCall(call: GroupLiveKitCallSummary) {
  if (call.startedAt <= 0 || call.serverNow <= 0) return 0;
  return Math.max(0, call.serverNow - call.startedAt);
}

export function mapGroupLiveKitPeer(value: unknown): GroupLiveKitPeer {
  const raw = asRecord(value);
  return {
    id: resolveString(raw.id ?? raw.user_id),
    name: resolveString(raw.name, 'Người dùng'),
    avatar: resolveString(raw.avatar),
    username: resolveString(raw.username),
  };
}

function mapGroup(value: unknown): GroupLiveKitGroup {
  const raw = asRecord(value);
  return {
    id: resolveString(raw.id ?? raw.group_id),
    name: resolveString(raw.name ?? raw.group_name, 'Nhóm'),
    avatar: resolveString(raw.avatar ?? raw.group_avatar),
  };
}

function mapParticipant(value: unknown): GroupLiveKitParticipant {
  const raw = asRecord(value);
  return {
    ...mapGroupLiveKitPeer(raw),
    joinedAt: resolveNumber(raw.joined_at ?? raw.joinedAt),
  };
}

function mapParticipants(value: unknown): GroupLiveKitParticipant[] {
  return Array.isArray(value) ? value.map(mapParticipant) : [];
}

function mapCall(value: unknown): GroupLiveKitCallSummary {
  const raw = asRecord(value);
  return {
    id: resolveString(raw.id ?? raw.call_id),
    groupId: resolveString(raw.group_id),
    callType: normalizeCallType(raw.call_type),
    provider: 'livekit',
    roomName: resolveString(raw.room_name),
    status: normalizeStatus(raw.status ?? raw.call_status),
    startedAt: resolveNumber(raw.started_at),
    serverNow: resolveNumber(raw.server_now),
    participantCount: resolveNumber(raw.participant_count),
  };
}

export function mapGroupLiveKitCreateResponse(
  response: unknown,
): GroupLiveKitCreateResult {
  const raw = asRecord(response);
  return {
    call: mapCall(raw.call),
    group: mapGroup(raw.group),
    isExisting: resolveBoolean(raw.is_existing),
  };
}

export function mapGroupLiveKitJoinPayload(
  response: unknown,
): GroupLiveKitJoinPayload {
  const raw = asRecord(response);
  const call = mapCall(raw.call);
  const livekit = asRecord(raw.livekit);
  return {
    call,
    group: mapGroup(raw.group),
    currentUser: mapGroupLiveKitPeer(raw.current_user),
    wsUrl: resolveString(livekit.ws_url),
    token: resolveString(livekit.token),
    participants: mapParticipants(raw.participants),
    elapsedSeconds: elapsedFromCall(call),
  };
}

export function mapGroupLiveKitSyncResponse(
  response: unknown,
): GroupLiveKitSyncResult {
  const raw = asRecord(response);
  const call = mapCall(raw.call);
  return {
    call,
    group: mapGroup(raw.group),
    participants: mapParticipants(raw.participants),
    elapsedSeconds: elapsedFromCall(call),
  };
}

export function mapIncomingGroupLiveKitCall(
  response: unknown,
): IncomingGroupLiveKitCall | null {
  const raw = asRecord(response);
  const incoming = asRecord(raw.incoming_call);
  if (!incoming.call_id && !incoming.id) return null;

  return {
    callId: resolveString(incoming.call_id ?? incoming.id),
    groupId: resolveString(incoming.group_id),
    callType: normalizeCallType(incoming.call_type),
    provider: 'livekit',
    roomName: resolveString(incoming.room_name),
    group: mapGroup(incoming.group),
    caller: mapGroupLiveKitPeer(incoming.caller),
    participantCount: resolveNumber(incoming.participant_count),
  };
}

export function mapGroupLiveKitCandidates(
  response: unknown,
): GroupLiveKitParticipant[] {
  return mapParticipants(asRecord(response).candidates);
}

export function mapAddedGroupLiveKitMembers(response: unknown): string[] {
  const raw = asRecord(response);
  return Array.isArray(raw.invited_user_ids)
    ? raw.invited_user_ids.map(item => resolveString(item)).filter(Boolean)
    : [];
}
