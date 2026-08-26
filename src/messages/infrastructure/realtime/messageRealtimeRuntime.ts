import { AppState, type AppStateStatus } from 'react-native';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

type SocketLike = {
  connected: boolean;
  connect(): void;
  disconnect(): void;
  emit(event: string, payload?: unknown): void;
  on(event: string, listener: (payload?: unknown) => void): SocketLike;
  off?(event: string, listener: (payload?: unknown) => void): SocketLike;
};

type SocketFactory = (
  url: string,
  options: Record<string, unknown>,
) => SocketLike;

type RealtimeTokenResponse = {
  enabled?: boolean;
  token?: string;
  url?: string;
};

export type MessageRealtimeInvalidation = {
  reason: 'event' | 'reconnect';
  occurredAt: number;
};

export type MessageTypingRealtimeEvent = {
  recipientId: string;
  senderId: string;
  isTyping: boolean;
};

export type MessageRealtimeEventName =
  | 'message:presence'
  | 'relationship:changed'
  | 'notification:new'
  | 'notification:counts-changed'
  | 'request:new'
  | 'group-chat-request:new'
  | 'navigation:counts-changed'
  | 'livekit_call_incoming'
  | 'livekit_call_answered'
  | 'livekit_call_declined'
  | 'livekit_call_closed'
  | 'livekit_group_call_incoming'
  | 'livekit_group_call_sync'
  | 'livekit_group_call_closed';

const socketModule = require('socket.io-client-v4') as {
  io?: SocketFactory;
  default?: SocketFactory;
} & SocketFactory;
const createSocket: SocketFactory =
  socketModule.io ?? socketModule.default ?? socketModule;

export const MESSAGE_INVALIDATION_DEBOUNCE_MS = 150;
const MESSAGE_RECONNECT_AUTH_RETRY_MS = 1_000;

const invalidationListeners = new Set<
  (event: MessageRealtimeInvalidation) => void
>();
const connectionListeners = new Set<(connected: boolean) => void>();
const typingListeners = new Set<(event: MessageTypingRealtimeEvent) => void>();
const eventListeners = new Map<
  MessageRealtimeEventName,
  Set<(payload: unknown) => void>
>();
const forwardedEventNames: MessageRealtimeEventName[] = [
  'message:presence',
  'relationship:changed',
  'notification:new',
  'notification:counts-changed',
  'request:new',
  'group-chat-request:new',
  'navigation:counts-changed',
  'livekit_call_incoming',
  'livekit_call_answered',
  'livekit_call_declined',
  'livekit_call_closed',
  'livekit_group_call_incoming',
  'livekit_group_call_sync',
  'livekit_group_call_closed',
];

let socket: SocketLike | null = null;
let accessToken = '';
let connecting = false;
let connected = false;
let appState: AppStateStatus = AppState.currentState;
let invalidationTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAuthTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTypingEvents: Array<{
  event: 'message:typing' | 'message:typing-stop';
  recipientId: string;
}> = [];
let watchedPresenceUserIds: string[] = [];

function nuxtApiUrl(path: string) {
  return `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/_api/${path.replace(
    /^\/+/,
    '',
  )}`;
}

async function requestToken(token: string) {
  const response = await fetch(nuxtApiUrl('realtime/token'), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  const result = (await response.json()) as RealtimeTokenResponse;
  if (!result.enabled || !result.token || !result.url) return null;
  return {
    token: result.token,
    url: result.url.replace(/\/+$/, ''),
  };
}

async function publishPresence(action: 'online' | 'offline') {
  const token = sessionStorage.getAccessToken();
  if (!token) return;
  await fetch(nuxtApiUrl('messages/presence'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  }).catch(() => undefined);
}

function hasRealtimeDemand() {
  return (
    invalidationListeners.size > 0 ||
    connectionListeners.size > 0 ||
    typingListeners.size > 0 ||
    eventListeners.size > 0
  );
}

function clearReconnectAuthTimer() {
  if (!reconnectAuthTimer) return;
  clearTimeout(reconnectAuthTimer);
  reconnectAuthTimer = null;
}

function scheduleFreshAuthReconnect() {
  if (
    reconnectAuthTimer ||
    appState !== 'active' ||
    !hasRealtimeDemand()
  ) {
    return;
  }
  reconnectAuthTimer = setTimeout(() => {
    reconnectAuthTimer = null;
    ensureConnected().catch(() => undefined);
  }, MESSAGE_RECONNECT_AUTH_RETRY_MS);
}

function setConnected(nextConnected: boolean) {
  if (connected === nextConnected) return;
  connected = nextConnected;
  connectionListeners.forEach(listener => listener(nextConnected));
}

function publishInvalidation(reason: MessageRealtimeInvalidation['reason']) {
  if (invalidationTimer) clearTimeout(invalidationTimer);
  invalidationTimer = setTimeout(() => {
    invalidationTimer = null;
    const event = { reason, occurredAt: Date.now() };
    invalidationListeners.forEach(listener => listener(event));
  }, MESSAGE_INVALIDATION_DEBOUNCE_MS);
}

function readPayloadId(payload: unknown, ...keys: string[]) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return '';
  }
  const raw = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }
  return '';
}

function publishTyping(payload: unknown, isTyping: boolean) {
  const senderId = readPayloadId(payload, 'senderId', 'sender_id', 'user_id');
  if (!senderId) return;
  const event = {
    senderId,
    recipientId: readPayloadId(payload, 'recipientId', 'recipient_id'),
    isTyping,
  };
  typingListeners.forEach(listener => listener(event));
}

function emitPresenceWatch(nextSocket: SocketLike) {
  nextSocket.emit('message:presence:watch', {
    userIds: watchedPresenceUserIds,
  });
}

function publishForwardedEvent(
  eventName: MessageRealtimeEventName,
  payload: unknown,
) {
  eventListeners.get(eventName)?.forEach(listener => listener(payload));
}

function bindSocket(nextSocket: SocketLike) {
  nextSocket.on('connect', () => {
    clearReconnectAuthTimer();
    setConnected(true);
    void publishPresence('online');
    emitPresenceWatch(nextSocket);
    pendingTypingEvents.splice(0).forEach(pending => {
      nextSocket.emit(pending.event, { recipientId: pending.recipientId });
    });
    publishInvalidation('reconnect');
  });
  nextSocket.on('disconnect', () => setConnected(false));
  nextSocket.on('connect_error', () => {
    if (socket === nextSocket) {
      nextSocket.disconnect();
      socket = null;
      accessToken = '';
    }
    setConnected(false);
    scheduleFreshAuthReconnect();
  });
  nextSocket.on('messages:count', () => publishInvalidation('event'));
  nextSocket.on('message:typing', payload => publishTyping(payload, true));
  nextSocket.on('message:typing-stop', payload =>
    publishTyping(payload, false),
  );
  forwardedEventNames.forEach(eventName => {
    nextSocket.on(eventName, payload =>
      publishForwardedEvent(eventName, payload),
    );
  });
}

async function ensureConnected() {
  const token = sessionStorage.getAccessToken();
  if (!token || connecting || appState !== 'active') return;
  if (socket && accessToken === token) {
    if (!socket.connected) socket.connect();
    return;
  }

  connecting = true;
  try {
    const auth = await requestToken(token);
    if (!auth) {
      setConnected(false);
      scheduleFreshAuthReconnect();
      return;
    }
    if (
      appState !== 'active' ||
      sessionStorage.getAccessToken() !== token ||
      !hasRealtimeDemand()
    ) {
      return;
    }
    socket?.disconnect();
    accessToken = token;
    socket = createSocket(auth.url, {
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
    });
    bindSocket(socket);
  } catch {
    setConnected(false);
    scheduleFreshAuthReconnect();
  } finally {
    connecting = false;
  }
}

AppState.addEventListener('change', nextState => {
  const previousState = appState;
  appState = nextState;
  if (nextState === 'active' && hasRealtimeDemand()) {
    void publishPresence('online');
    ensureConnected().catch(() => undefined);
    return;
  }
  if (previousState === 'active' && nextState !== 'active') {
    void publishPresence('offline');
    clearReconnectAuthTimer();
    socket?.disconnect();
    socket = null;
    accessToken = '';
    setConnected(false);
  }
});

export function connectMessageRealtime() {
  ensureConnected().catch(() => undefined);
}

export function disconnectMessageRealtime() {
  void publishPresence('offline');
  clearReconnectAuthTimer();
  socket?.disconnect();
  socket = null;
  accessToken = '';
  connecting = false;
  pendingTypingEvents = [];
  watchedPresenceUserIds = [];
  setConnected(false);
}

export function subscribeToMessageRealtimeEvent(
  eventName: MessageRealtimeEventName,
  listener: (payload: unknown) => void,
) {
  const listeners = eventListeners.get(eventName) ?? new Set();
  listeners.add(listener);
  eventListeners.set(eventName, listeners);
  ensureConnected().catch(() => undefined);
  return () => {
    const currentListeners = eventListeners.get(eventName);
    currentListeners?.delete(listener);
    if (currentListeners?.size === 0) {
      eventListeners.delete(eventName);
    }
  };
}

export function watchMessagePresence(userIds: Array<string | number>) {
  watchedPresenceUserIds = Array.from(
    new Set(
      userIds
        .map(userId => String(userId).trim())
        .filter(userId => /^[1-9][0-9]*$/.test(userId)),
    ),
  ).slice(0, 200);
  ensureConnected().catch(() => undefined);
  if (socket?.connected) {
    emitPresenceWatch(socket);
  }
}

export function subscribeToMessageInvalidations(
  listener: (event: MessageRealtimeInvalidation) => void,
) {
  invalidationListeners.add(listener);
  ensureConnected().catch(() => undefined);
  return () => {
    invalidationListeners.delete(listener);
  };
}

export function subscribeToMessageRealtimeConnection(
  listener: (isConnected: boolean) => void,
) {
  connectionListeners.add(listener);
  listener(connected);
  ensureConnected().catch(() => undefined);
  return () => {
    connectionListeners.delete(listener);
  };
}

export function isMessageRealtimeConnected() {
  return connected;
}

export function onMessageTyping(
  listener: (event: MessageTypingRealtimeEvent) => void,
) {
  typingListeners.add(listener);
  ensureConnected().catch(() => undefined);
  return () => {
    typingListeners.delete(listener);
  };
}

export function emitMessageTyping(recipientId: string) {
  if (!recipientId || recipientId.startsWith('group')) return;
  ensureConnected().catch(() => undefined);
  if (socket) {
    socket.emit('message:typing', { recipientId });
  } else {
    pendingTypingEvents = [
      ...pendingTypingEvents.slice(-19),
      { event: 'message:typing', recipientId },
    ];
  }
}

export function emitMessageTypingDone(recipientId: string) {
  if (!recipientId || recipientId.startsWith('group')) return;
  ensureConnected().catch(() => undefined);
  if (socket) {
    socket.emit('message:typing-stop', { recipientId });
  } else {
    pendingTypingEvents = [
      ...pendingTypingEvents.slice(-19),
      { event: 'message:typing-stop', recipientId },
    ];
  }
}
