// Description: Provides foreground socket signaling for direct and group LiveKit call state.
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  IncomingLiveKitCall,
  LiveKitCallPeer,
  LiveKitCallType,
} from '../../domain/types/call.types';
import type {
  GroupLiveKitGroup,
  GroupLiveKitParticipant,
  IncomingGroupLiveKitCall,
} from '../../domain/types/groupCall.types';

type SocketLike = {
  connected?: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, payload?: unknown, callback?: () => void) => void;
  on: (event: string, listener: (payload?: unknown) => void) => SocketLike;
  off?: (event: string, listener: (payload?: unknown) => void) => SocketLike;
  removeListener?: (
    event: string,
    listener: (payload?: unknown) => void,
  ) => SocketLike;
};

export type LiveKitCallRealtimeTiming = {
  startedAt?: number;
  startedAtMs?: number;
  serverNow?: number;
  serverNowMs?: number;
  elapsedSeconds?: number;
  elapsedMs?: number;
};

export type LiveKitCallRealtimeEvent = LiveKitCallRealtimeTiming & {
  callId: string;
  callType: LiveKitCallType;
  status?: string;
  active?: boolean;
  finished?: boolean;
  peerId?: string;
  peer?: LiveKitCallPeer;
};

export type GroupLiveKitCallRealtimeEvent = LiveKitCallRealtimeTiming & {
  callId: string;
  groupId: string;
  callType: LiveKitCallType;
  status?: string;
  group?: GroupLiveKitGroup;
  participants: GroupLiveKitParticipant[];
  participantCount?: number;
  leftUserId?: string;
  declinedUserId?: string;
};

export type LiveKitCallCreatedPayload = {
  callId: string;
  callType: LiveKitCallType;
  recipientId: string;
  roomName: string;
  peer?: LiveKitCallPeer;
};

export type LiveKitCallAnsweredPayload = LiveKitCallRealtimeTiming & {
  callId: string;
  callType: LiveKitCallType;
  recipientId: string;
};

export type LiveKitCallClosedPayload = {
  callId: string;
  callType: LiveKitCallType;
  recipientId: string;
  status: 'ended' | 'cancelled' | 'declined' | 'no_answer' | 'missed';
  duration: number;
};

type Listener<T> = (event: T) => void;
type EventName =
  | 'incoming'
  | 'answered'
  | 'declined'
  | 'closed'
  | 'groupIncoming'
  | 'groupSync'
  | 'groupClosed';
type SocketIoClient = (
  uri: string,
  options: Record<string, unknown>,
) => SocketLike;

const SOCKET_PATH = '/mobile-socket/socket.io';
const socketIoClient = require('socket.io-client') as SocketIoClient;

const listeners = {
  incoming: new Set<Listener<IncomingLiveKitCall>>(),
  answered: new Set<Listener<LiveKitCallRealtimeEvent>>(),
  declined: new Set<Listener<LiveKitCallRealtimeEvent>>(),
  closed: new Set<Listener<LiveKitCallRealtimeEvent>>(),
  groupIncoming: new Set<Listener<IncomingGroupLiveKitCall>>(),
  groupSync: new Set<Listener<GroupLiveKitCallRealtimeEvent>>(),
  groupClosed: new Set<Listener<GroupLiveKitCallRealtimeEvent>>(),
};

let socket: SocketLike | null = null;
let socketToken = '';
let joinedToken = '';
let pendingEmits: Array<{ event: string; payload: Record<string, unknown> }> =
  [];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeCallType(value: unknown): LiveKitCallType {
  return value === 'audio' ? 'audio' : 'video';
}

function mapPeer(value: unknown): LiveKitCallPeer {
  const raw = asRecord(value);
  return {
    id: readString(raw.id ?? raw.user_id),
    name: readString(raw.name, 'Người dùng'),
    avatar: readString(raw.avatar),
    username: readString(raw.username) || undefined,
  };
}

function mapGroup(value: unknown): GroupLiveKitGroup {
  const raw = asRecord(value);
  return {
    id: readString(raw.id ?? raw.group_id),
    name: readString(raw.name ?? raw.group_name, 'Nhóm'),
    avatar: readString(raw.avatar ?? raw.group_avatar),
  };
}

function mapGroupParticipant(value: unknown): GroupLiveKitParticipant {
  const raw = asRecord(value);
  return {
    id: readString(raw.id ?? raw.user_id),
    name: readString(raw.name, 'Người dùng'),
    avatar: readString(raw.avatar),
    username: readString(raw.username) || undefined,
    joinedAt: readNumber(raw.joined_at ?? raw.joinedAt) ?? 0,
  };
}

function mapGroupParticipants(value: unknown): GroupLiveKitParticipant[] {
  return Array.isArray(value) ? value.map(mapGroupParticipant) : [];
}

function mapIncomingCall(value: unknown): IncomingLiveKitCall | null {
  const raw = asRecord(value);
  const callId = readString(raw.call_id ?? raw.callId);
  if (!callId) return null;

  return {
    callId,
    callType: normalizeCallType(raw.call_type ?? raw.callType),
    provider: 'livekit',
    roomName: readString(raw.room_name ?? raw.roomName),
    peer: mapPeer(raw.peer),
    actionToken: readString(raw.action_token ?? raw.actionToken) || undefined,
    expiresAt: readNumber(raw.expires_at ?? raw.expiresAt),
    apiUrl: readString(raw.api_url ?? raw.apiUrl) || undefined,
  };
}

function mapIncomingGroupCall(value: unknown): IncomingGroupLiveKitCall | null {
  const raw = asRecord(value);
  const callId = readString(raw.call_id ?? raw.callId);
  const groupId = readString(raw.group_id ?? raw.groupId);
  if (!callId || !groupId) return null;

  const ringMode = readString(raw.ring_mode ?? raw.ringMode);
  return {
    callId,
    groupId,
    callType: normalizeCallType(raw.call_type ?? raw.callType),
    provider: 'livekit',
    roomName: readString(raw.room_name ?? raw.roomName),
    group: mapGroup(raw.group),
    caller: mapPeer(raw.caller),
    participantCount: readNumber(raw.participant_count ?? raw.participantCount) ?? 0,
    actionToken: readString(raw.action_token ?? raw.actionToken) || undefined,
    expiresAt: readNumber(raw.expires_at ?? raw.expiresAt),
    apiUrl: readString(raw.api_url ?? raw.apiUrl) || undefined,
    ringMode:
      ringMode === 'fullscreen' || ringMode === 'passive'
        ? ringMode
        : undefined,
  };
}

function mapRealtimeEvent(value: unknown): LiveKitCallRealtimeEvent | null {
  const raw = asRecord(value);
  const callId = readString(raw.call_id ?? raw.callId);
  if (!callId) return null;

  return {
    callId,
    callType: normalizeCallType(raw.call_type ?? raw.callType),
    status: readString(raw.status ?? raw.call_status),
    active: raw.active === true || raw.active === 1 || raw.active === '1',
    finished:
      raw.finished === true || raw.finished === 1 || raw.finished === '1',
    startedAt: readNumber(raw.started_at ?? raw.startedAt),
    startedAtMs: readNumber(raw.started_at_ms ?? raw.startedAtMs),
    serverNow: readNumber(raw.server_now ?? raw.serverNow),
    serverNowMs: readNumber(raw.server_now_ms ?? raw.serverNowMs),
    elapsedSeconds: readNumber(raw.elapsed ?? raw.elapsedSeconds),
    elapsedMs: readNumber(raw.elapsed_ms ?? raw.elapsedMs),
    peerId: readString(raw.peer_id ?? raw.peerId),
    peer: raw.peer ? mapPeer(raw.peer) : undefined,
  };
}

function mapGroupRealtimeEvent(
  value: unknown,
): GroupLiveKitCallRealtimeEvent | null {
  const raw = asRecord(value);
  const callId = readString(raw.call_id ?? raw.callId);
  const groupId = readString(raw.group_id ?? raw.groupId);
  if (!callId || !groupId) return null;

  return {
    callId,
    groupId,
    callType: normalizeCallType(raw.call_type ?? raw.callType),
    status: readString(raw.status ?? raw.call_status),
    group: raw.group ? mapGroup(raw.group) : undefined,
    participants: mapGroupParticipants(raw.participants),
    participantCount: readNumber(raw.participant_count ?? raw.participantCount),
    startedAt: readNumber(raw.started_at ?? raw.startedAt),
    startedAtMs: readNumber(raw.started_at_ms ?? raw.startedAtMs),
    serverNow: readNumber(raw.server_now ?? raw.serverNow),
    serverNowMs: readNumber(raw.server_now_ms ?? raw.serverNowMs),
    elapsedSeconds: readNumber(raw.elapsed ?? raw.elapsedSeconds),
    elapsedMs: readNumber(raw.elapsed_ms ?? raw.elapsedMs),
    leftUserId: readString(raw.left_user_id ?? raw.leftUserId),
    declinedUserId: readString(raw.declined_user_id ?? raw.declinedUserId),
  };
}

function removeSocketListener(
  target: SocketLike | null,
  event: string,
  listener: (payload?: unknown) => void,
) {
  if (!target) return;
  if (target.off) {
    target.off(event, listener);
    return;
  }
  target.removeListener?.(event, listener);
}

function dispatch<T>(eventName: EventName, payload: T) {
  for (const listener of listeners[eventName] as Set<Listener<T>>) {
    listener(payload);
  }
}

function socketUrl() {
  return (apiConfig.socketUrl || apiConfig.webBaseUrl).replace(/\/+$/, '');
}

function describeSocketError(value: unknown) {
  const raw = asRecord(value);
  const context = asRecord(raw.context);
  return {
    message: readString(raw.message),
    type: readString(raw.type),
    description: readString(raw.description),
    status: readNumber(context.status),
    responseText: readString(context.responseText).slice(0, 160),
    socketUrl: socketUrl(),
  };
}

function buildJoinPayload(token: string) {
  return {
    username: '',
    user_id: token,
    recipient_ids: [],
    recipient_group_ids: [],
  };
}

function flushPendingEmits() {
  const currentSocket = socket;
  if (!currentSocket || !currentSocket.connected) return;
  if (!socketToken || joinedToken !== socketToken) return;

  const nextPending = pendingEmits;
  pendingEmits = [];
  for (const item of nextPending) {
    currentSocket.emit(item.event, item.payload);
  }
}

function joinSocket(nextSocket: SocketLike) {
  const token = sessionStorage.getAccessToken();
  if (!token) return;

  socketToken = token;
  nextSocket.emit('join', buildJoinPayload(token), () => {
    if (socket !== nextSocket) return;
    joinedToken = token;
    console.log('[LiveKitRealtime] joined socket');
    flushPendingEmits();
  });
}

function bindSocketEvents(nextSocket: SocketLike) {
  nextSocket.on('connect', () => {
    console.log('[LiveKitRealtime] socket connected');
    joinedToken = '';
    joinSocket(nextSocket);
  });
  nextSocket.on('connect_error', payload => {
    console.warn(
      '[LiveKitRealtime] socket connect_error',
      describeSocketError(payload),
    );
  });
  nextSocket.on('disconnect', payload => {
    console.warn('[LiveKitRealtime] socket disconnected', payload);
  });
  nextSocket.on('livekit_call_incoming', payload => {
    console.log('[LiveKitRealtime] incoming event received');
    const call = mapIncomingCall(payload);
    if (call) dispatch('incoming', call);
  });
  nextSocket.on('livekit_call_answered', payload => {
    console.log('[LiveKitRealtime] answered event received');
    const event = mapRealtimeEvent(payload);
    if (event) dispatch('answered', event);
  });
  nextSocket.on('livekit_call_declined', payload => {
    console.log('[LiveKitRealtime] declined event received');
    const event = mapRealtimeEvent(payload);
    if (event) dispatch('declined', event);
  });
  nextSocket.on('livekit_call_closed', payload => {
    console.log('[LiveKitRealtime] closed event received');
    const event = mapRealtimeEvent(payload);
    if (event) dispatch('closed', event);
  });
  nextSocket.on('livekit_group_call_incoming', payload => {
    console.log('[LiveKitRealtime] group incoming event received');
    const call = mapIncomingGroupCall(payload);
    if (call) dispatch('groupIncoming', call);
  });
  nextSocket.on('livekit_group_call_sync', payload => {
    console.log('[LiveKitRealtime] group sync event received');
    const event = mapGroupRealtimeEvent(payload);
    if (event) dispatch('groupSync', event);
  });
  nextSocket.on('livekit_group_call_closed', payload => {
    console.log('[LiveKitRealtime] group closed event received');
    const event = mapGroupRealtimeEvent(payload);
    if (event) dispatch('groupClosed', event);
  });
}

export function connectLiveKitCallRealtime() {
  const token = sessionStorage.getAccessToken();
  if (!token) return null;

  if (socket && socketToken === token) {
    if (!socket.connected) socket.connect();
    else if (joinedToken !== token) joinSocket(socket);
    return socket;
  }

  socket?.disconnect();
  socketToken = token;
  joinedToken = '';
  pendingEmits = [];
  try {
    console.log('[LiveKitRealtime] connecting socket', {
      socketUrl: socketUrl(),
      path: SOCKET_PATH,
    });
    socket = socketIoClient(socketUrl(), {
      path: SOCKET_PATH,
      transports: ['websocket'],
      upgrade: false,
      forceNew: true,
      reconnection: true,
      query: {
        hash: token,
      },
    });
  } catch (error) {
    console.warn('[LiveKitRealtime] socket create failed', error);
    socket = null;
    return null;
  }
  bindSocketEvents(socket);
  return socket;
}

export function disconnectLiveKitCallRealtime() {
  socket?.disconnect();
  socket = null;
  socketToken = '';
  joinedToken = '';
  pendingEmits = [];
}

function emitLiveKitCallRealtimeEvent(
  event: string,
  payload: Record<string, unknown>,
) {
  const token = sessionStorage.getAccessToken();
  const currentSocket = connectLiveKitCallRealtime();
  if (!token || !currentSocket) return;

  const nextPayload = {
    ...payload,
    user_id: token,
  };

  if (currentSocket.connected && joinedToken === token) {
    currentSocket.emit(event, nextPayload);
    return;
  }

  pendingEmits.push({ event, payload: nextPayload });
}

export function onLiveKitCallIncoming(
  listener: Listener<IncomingLiveKitCall>,
) {
  listeners.incoming.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.incoming.delete(listener);
  };
}

export function onLiveKitCallAnswered(
  listener: Listener<LiveKitCallRealtimeEvent>,
) {
  listeners.answered.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.answered.delete(listener);
  };
}

export function onLiveKitCallDeclined(
  listener: Listener<LiveKitCallRealtimeEvent>,
) {
  listeners.declined.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.declined.delete(listener);
  };
}

export function onLiveKitCallClosed(
  listener: Listener<LiveKitCallRealtimeEvent>,
) {
  listeners.closed.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.closed.delete(listener);
  };
}

export function onLiveKitGroupCallIncoming(
  listener: Listener<IncomingGroupLiveKitCall>,
) {
  listeners.groupIncoming.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.groupIncoming.delete(listener);
  };
}

export function onLiveKitGroupCallSync(
  listener: Listener<GroupLiveKitCallRealtimeEvent>,
) {
  listeners.groupSync.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.groupSync.delete(listener);
  };
}

export function onLiveKitGroupCallClosed(
  listener: Listener<GroupLiveKitCallRealtimeEvent>,
) {
  listeners.groupClosed.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.groupClosed.delete(listener);
  };
}

export function emitLiveKitCallCreated(payload: LiveKitCallCreatedPayload) {
  emitLiveKitCallRealtimeEvent('livekit_call_created', {
    call_id: payload.callId,
    call_type: payload.callType,
    to_id: payload.recipientId,
    room_name: payload.roomName,
    peer: payload.peer,
  });
}

export function emitLiveKitCallAnswered(payload: LiveKitCallAnsweredPayload) {
  emitLiveKitCallRealtimeEvent('livekit_call_answered', {
    call_id: payload.callId,
    call_type: payload.callType,
    to_id: payload.recipientId,
    started_at: payload.startedAt,
    started_at_ms: payload.startedAtMs,
    server_now: payload.serverNow,
    server_now_ms: payload.serverNowMs,
    elapsed: payload.elapsedSeconds,
    elapsed_ms: payload.elapsedMs,
  });
}

export function emitLiveKitCallClosed(payload: LiveKitCallClosedPayload) {
  emitLiveKitCallRealtimeEvent('livekit_call_closed', {
    call_id: payload.callId,
    call_type: payload.callType,
    to_id: payload.recipientId,
    status: payload.status,
    duration: payload.duration,
  });
}

export function emitLiveKitCallDeclined(
  payload: Omit<LiveKitCallClosedPayload, 'status'>,
) {
  emitLiveKitCallClosed({
    ...payload,
    status: 'declined',
  });
}

export function removeLiveKitCallRealtimeListener(
  event: string,
  listener: (payload?: unknown) => void,
) {
  removeSocketListener(socket, event, listener);
}
