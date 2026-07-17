import { AppState, type AppStateStatus } from 'react-native';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createFeedRepository } from '../repositories/ApiFeedRepository';
import type { FeedPost } from '../../domain/types/feed.types';
import {
  createPostRealtimeCoordinator,
  type PostChangedEvent,
  type PostRealtimeEvent,
} from '../../application/realtime/postRealtimeCoordinator';

type SocketLike = {
  connected: boolean;
  connect(): void;
  disconnect(): void;
  emit(event: string, payload?: unknown): void;
  on(event: string, listener: (payload?: unknown) => void): SocketLike;
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

const socketModule = require('socket.io-client-v4') as {
  io?: SocketFactory;
  default?: SocketFactory;
} & SocketFactory;
const createSocket: SocketFactory =
  socketModule.io ?? socketModule.default ?? socketModule;
const repository = createFeedRepository();
const POLL_INTERVAL_MS = 15_000;

let socket: SocketLike | null = null;
let connecting = false;
let accessToken = '';
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appState: AppStateStatus = AppState.currentState;

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
  return { token: result.token, url: result.url.replace(/\/+$/, '') };
}

function normalizeChange(payload: unknown): PostChangedEvent | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const raw = payload as Record<string, unknown>;
  const mutation = String(raw.mutation ?? '');
  const postId = String(raw.postId ?? '').trim();
  const eventId = String(raw.eventId ?? '').trim();
  if (
    !eventId ||
    !/^[1-9][0-9]*$/.test(postId) ||
    !['reaction', 'comment', 'share', 'deleted'].includes(mutation)
  ) {
    return null;
  }
  return {
    eventId,
    postId,
    mutation: mutation as PostChangedEvent['mutation'],
    occurredAt: Number(raw.occurredAt) || Date.now(),
  };
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function updatePolling() {
  const shouldPoll =
    appState === 'active' &&
    !socket?.connected &&
    coordinator.getWatchedPostIds().length > 0;
  if (!shouldPoll) {
    stopPolling();
    return;
  }
  if (!pollTimer) {
    pollTimer = setInterval(() => {
      coordinator.refreshWatchedPosts();
      void ensureConnected();
    }, POLL_INTERVAL_MS);
  }
}

const coordinator = createPostRealtimeCoordinator<FeedPost>({
  fetchPost: async postId => {
    const result = await repository.getPostById(postId, {
      fetchComments: false,
      addView: false,
    });
    return result.post;
  },
  watch(postIds) {
    socket?.emit('posts:watch', { postIds });
    updatePolling();
  },
  unwatch(postIds) {
    socket?.emit('posts:unwatch', { postIds });
    updatePolling();
  },
  initiallyConnected: false,
});

function bindSocket(nextSocket: SocketLike) {
  nextSocket.on('connect', () => {
    coordinator.setConnected(true);
    stopPolling();
  });
  nextSocket.on('disconnect', () => {
    coordinator.setConnected(false);
    updatePolling();
  });
  nextSocket.on('connect_error', () => {
    if (socket === nextSocket) {
      nextSocket.disconnect();
      socket = null;
      accessToken = '';
    }
    coordinator.setConnected(false);
    updatePolling();
  });
  nextSocket.on('post:changed', payload => {
    const change = normalizeChange(payload);
    if (change) coordinator.handleChanged(change);
  });
}

async function ensureConnected() {
  const token = sessionStorage.getAccessToken();
  if (!token || connecting) return;
  if (socket && accessToken === token) {
    if (!socket.connected) socket.connect();
    return;
  }
  connecting = true;
  try {
    const auth = await requestToken(token);
    if (!auth) {
      updatePolling();
      return;
    }
    socket?.disconnect();
    accessToken = token;
    socket = createSocket(auth.url, {
      auth: { token: auth.token },
      transports: ['websocket'],
      timeout: 5000,
      reconnection: true,
    });
    bindSocket(socket);
  } catch {
    coordinator.setConnected(false);
    updatePolling();
  } finally {
    connecting = false;
  }
}

AppState.addEventListener('change', nextState => {
  appState = nextState;
  updatePolling();
  if (nextState === 'active' && coordinator.getWatchedPostIds().length > 0) {
    void ensureConnected();
  }
});

export const postRealtimeRuntime = {
  watchPosts(postIds: Array<string | number>) {
    const release = coordinator.watchPosts(postIds);
    void ensureConnected();
    updatePolling();
    return () => {
      release();
      updatePolling();
    };
  },
  subscribe(listener: (event: PostRealtimeEvent<FeedPost>) => void) {
    return coordinator.subscribe(listener);
  },
};
