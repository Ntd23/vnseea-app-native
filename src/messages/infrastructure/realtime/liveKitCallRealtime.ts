// Description: Maps canonical LiveKit call events from the shared Socket.IO v4 runtime.
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  IncomingLiveKitCall,
  LiveKitCallPeer,
  LiveKitCallType,
} from '../../domain/types/call.types';
import type {
  GroupLiveKitCallType,
  GroupLiveKitGroup,
  GroupLiveKitParticipant,
  IncomingGroupLiveKitCall,
} from '../../domain/types/groupCall.types';
import {
  connectMessageRealtime,
  disconnectMessageRealtime,
  emitMessageTyping,
  emitMessageTypingDone,
  onMessageTyping,
  subscribeToMessageRealtimeEvent,
  watchMessagePresence,
} from './messageRealtimeRuntime';

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
  callType: GroupLiveKitCallType;
  status?: string;
  group?: GroupLiveKitGroup;
  participants: GroupLiveKitParticipant[];
  participantCount?: number;
  leftUserId?: string;
  declinedUserId?: string;
  activeUserId?: string;
};

export type ChatTypingRealtimeEvent = {
  recipientId: string;
  senderId: string;
  isTyping: boolean;
};

export type UserOnlineStatusRealtimeEvent = {
  userId: string;
  isOnline: boolean;
};

type Listener<T> = (event: T) => void;
type EventName =
  | 'userStatus'
  | 'incoming'
  | 'answered'
  | 'declined'
  | 'closed'
  | 'groupIncoming'
  | 'groupSync'
  | 'groupClosed';
type WebTypingStateResponse = {
  enabled?: boolean;
  typing?: boolean;
  activeUserIds?: Array<number | string>;
};

const listeners = {
  userStatus: new Set<Listener<UserOnlineStatusRealtimeEvent>>(),
  incoming: new Set<Listener<IncomingLiveKitCall>>(),
  answered: new Set<Listener<LiveKitCallRealtimeEvent>>(),
  declined: new Set<Listener<LiveKitCallRealtimeEvent>>(),
  closed: new Set<Listener<LiveKitCallRealtimeEvent>>(),
  groupIncoming: new Set<Listener<IncomingGroupLiveKitCall>>(),
  groupSync: new Set<Listener<GroupLiveKitCallRealtimeEvent>>(),
  groupClosed: new Set<Listener<GroupLiveKitCallRealtimeEvent>>(),
};

let realtimeUnsubscribers: Array<() => void> = [];

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
    callType: 'video',
    provider: 'livekit',
    roomName: readString(raw.room_name ?? raw.roomName),
    group: mapGroup(raw.group),
    caller: mapPeer(raw.caller),
    participantCount:
      readNumber(raw.participant_count ?? raw.participantCount) ?? 0,
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
    callType: 'video',
    status: readString(raw.status ?? raw.call_status),
    group: raw.group ? mapGroup(raw.group) : undefined,
    participants: Array.isArray(raw.participants)
      ? raw.participants.map(mapGroupParticipant)
      : [],
    participantCount: readNumber(raw.participant_count ?? raw.participantCount),
    startedAt: readNumber(raw.started_at ?? raw.startedAt),
    startedAtMs: readNumber(raw.started_at_ms ?? raw.startedAtMs),
    serverNow: readNumber(raw.server_now ?? raw.serverNow),
    serverNowMs: readNumber(raw.server_now_ms ?? raw.serverNowMs),
    elapsedSeconds: readNumber(raw.elapsed ?? raw.elapsedSeconds),
    elapsedMs: readNumber(raw.elapsed_ms ?? raw.elapsedMs),
    leftUserId: readString(raw.left_user_id ?? raw.leftUserId),
    declinedUserId: readString(raw.declined_user_id ?? raw.declinedUserId),
    activeUserId: readString(raw.active_user_id ?? raw.activeUserId),
  };
}

function dispatch<T>(eventName: EventName, payload: T) {
  for (const listener of listeners[eventName] as Set<Listener<T>>) {
    listener(payload);
  }
}

function bindCanonicalEvents() {
  if (realtimeUnsubscribers.length > 0) return;
  realtimeUnsubscribers = [
    subscribeToMessageRealtimeEvent('message:presence', payload => {
      const raw = asRecord(payload);
      const userId = readString(raw.userId ?? raw.user_id);
      if (userId && typeof raw.online === 'boolean') {
        dispatch('userStatus', { userId, isOnline: raw.online });
      }
    }),
    subscribeToMessageRealtimeEvent('livekit_call_incoming', payload => {
      const call = mapIncomingCall(payload);
      if (call) dispatch('incoming', call);
    }),
    subscribeToMessageRealtimeEvent('livekit_call_answered', payload => {
      const event = mapRealtimeEvent(payload);
      if (event) dispatch('answered', event);
    }),
    subscribeToMessageRealtimeEvent('livekit_call_declined', payload => {
      const event = mapRealtimeEvent(payload);
      if (event) dispatch('declined', event);
    }),
    subscribeToMessageRealtimeEvent('livekit_call_closed', payload => {
      const event = mapRealtimeEvent(payload);
      if (event) dispatch('closed', event);
    }),
    subscribeToMessageRealtimeEvent('livekit_group_call_incoming', payload => {
      const call = mapIncomingGroupCall(payload);
      if (call) dispatch('groupIncoming', call);
    }),
    subscribeToMessageRealtimeEvent('livekit_group_call_sync', payload => {
      const event = mapGroupRealtimeEvent(payload);
      if (event) dispatch('groupSync', event);
    }),
    subscribeToMessageRealtimeEvent('livekit_group_call_closed', payload => {
      const event = mapGroupRealtimeEvent(payload);
      if (event) dispatch('groupClosed', event);
    }),
  ];
}

function nuxtApiUrl(path: string) {
  return `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/_api/${path.replace(
    /^\/+/,
    '',
  )}`;
}

function isGroupRecipientId(recipientId: string) {
  return /^group\d+$/i.test(recipientId);
}

function groupIdFromRecipientId(recipientId: string) {
  return recipientId.replace(/^group/i, '');
}

async function postNuxtTypingApi(
  path: string,
  body: Record<string, unknown>,
): Promise<WebTypingStateResponse | null> {
  const accessToken = sessionStorage.getAccessToken();
  if (!accessToken) return null;
  const response = await fetch(nuxtApiUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return (await response.json()) as WebTypingStateResponse;
}

export function connectLiveKitCallRealtime() {
  bindCanonicalEvents();
  connectMessageRealtime();
}

export function disconnectLiveKitCallRealtime() {
  realtimeUnsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
  watchMessagePresence([]);
  disconnectMessageRealtime();
}

export function watchUserOnlineStatuses(userIds: Array<string | number>) {
  bindCanonicalEvents();
  watchMessagePresence(userIds);
}

export function updateWebTypingState(recipientId: string, isTyping: boolean) {
  if (!recipientId) return;
  if (isGroupRecipientId(recipientId)) {
    const groupId = Number(groupIdFromRecipientId(recipientId));
    if (Number.isFinite(groupId) && groupId > 0) {
      postNuxtTypingApi('messages/group/typing', {
        action: isTyping ? 'start' : 'stop',
        groupId,
      }).catch(() => undefined);
    }
    return;
  }
  const userId = Number(recipientId);
  if (Number.isFinite(userId) && userId > 0) {
    postNuxtTypingApi('messages/typing', {
      action: isTyping ? 'start' : 'stop',
      userId,
    }).catch(() => undefined);
  }
}

export async function getWebTypingState(recipientId: string) {
  if (!recipientId) return null;
  if (isGroupRecipientId(recipientId)) {
    const groupId = Number(groupIdFromRecipientId(recipientId));
    if (!Number.isFinite(groupId) || groupId <= 0) return null;
    return postNuxtTypingApi('messages/group/typing', {
      action: 'status',
      groupId,
    });
  }
  const userId = Number(recipientId);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return postNuxtTypingApi('messages/typing', {
    action: 'status',
    userId,
  });
}

export function onChatTyping(listener: Listener<ChatTypingRealtimeEvent>) {
  return onMessageTyping(listener);
}

export function onUserOnlineStatus(
  listener: Listener<UserOnlineStatusRealtimeEvent>,
) {
  listeners.userStatus.add(listener);
  connectLiveKitCallRealtime();
  return () => {
    listeners.userStatus.delete(listener);
  };
}

export const emitChatTyping = emitMessageTyping;
export const emitChatTypingDone = emitMessageTypingDone;

export function onLiveKitCallIncoming(listener: Listener<IncomingLiveKitCall>) {
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
