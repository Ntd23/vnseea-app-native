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

const socketModule = require('socket.io-client-v4') as {
  io?: SocketFactory;
  default?: SocketFactory;
} & SocketFactory;
const createSocket: SocketFactory =
  socketModule.io ?? socketModule.default ?? socketModule;

export const MESSAGE_INVALIDATION_DEBOUNCE_MS = 150;

const invalidationListeners = new Set<
  (event: MessageRealtimeInvalidation) => void
>();
const connectionListeners = new Set<(connected: boolean) => void>();
const typingListeners = new Set<(event: MessageTypingRealtimeEvent) => void>();

let socket: SocketLike | null = null;
let accessToken = '';
let connecting = false;
let connected = false;
let appState: AppStateStatus = AppState.currentState;
let invalidationTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTypingEvents: Array<{
  event: 'message:typing' | 'message:typing-stop';
  recipientId: string;
}> = [];

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

function bindSocket(nextSocket: SocketLike) {
  nextSocket.on('connect', () => {
    setConnected(true);
    pendingTypingEvents.splice(0).forEach(pending => {
      nextSocket.emit(pending.event, { recipientId: pending.recipientId });
    });
    publishInvalidation('reconnect');
  });
  nextSocket.on('disconnect', () => setConnected(false));
  nextSocket.on('connect_error', () => setConnected(false));
  nextSocket.on('messages:count', () => publishInvalidation('event'));
  nextSocket.on('message:typing', payload => publishTyping(payload, true));
  nextSocket.on('message:typing-stop', payload =>
    publishTyping(payload, false),
  );
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
  } finally {
    connecting = false;
  }
}

AppState.addEventListener('change', nextState => {
  appState = nextState;
  if (nextState === 'active' && invalidationListeners.size > 0) {
    ensureConnected().catch(() => undefined);
  }
});

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
