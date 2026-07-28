import type { LiveRepository } from '../../domain/repositories/LiveRepository';
import type {
  LiveSession,
  LiveStreamItem,
} from '../../domain/types/live.types';
import { createLiveRepository } from '../../infrastructure/repositories/ApiLiveRepository';

const DEFAULT_INLINE_LIVE_SESSION_TTL_MS = 45_000;

export class InlineLiveEndedError extends Error {
  constructor() {
    super('Inline live has ended.');
    this.name = 'InlineLiveEndedError';
  }
}

export class InlineLiveUnavailableError extends Error {
  constructor(
    readonly reason: 'offline' | 'not-ready' = 'not-ready',
  ) {
    super('Inline live is not ready.');
    this.name = 'InlineLiveUnavailableError';
  }
}

type InlineLiveSessionEntry = {
  expiresAt: number;
  session: LiveSession;
};

export function getInlineLiveSessionKey(
  item: Pick<LiveStreamItem, 'postId' | 'streamName'>,
) {
  return `${item.postId}:${item.streamName}`;
}

export function createInlineLiveSessionCache(
  repository: Pick<LiveRepository, 'getLivePost' | 'joinLive'>,
  ttlMs = DEFAULT_INLINE_LIVE_SESSION_TTL_MS,
) {
  const entries = new Map<string, InlineLiveSessionEntry>();
  const inFlight = new Map<string, Promise<LiveSession>>();
  const versions = new Map<string, number>();

  const peek = (
    item: Pick<LiveStreamItem, 'postId' | 'streamName'>,
    now = Date.now(),
  ) => {
    const key = getInlineLiveSessionKey(item);
    const cached = entries.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= now) {
      entries.delete(key);
      return null;
    }
    return cached.session;
  };

  const load = async (
    item: Pick<LiveStreamItem, 'postId' | 'streamName'>,
  ) => {
    const cached = peek(item);
    if (cached) return cached;

    const key = getInlineLiveSessionKey(item);
    const pending = inFlight.get(key);
    if (pending) return pending;

    const version = versions.get(key) ?? 0;
    const request = repository
      .getLivePost(item.postId)
      .then(stream => {
        if (!stream) {
          throw new InlineLiveEndedError();
        }
        if (stream.state === 'offline') {
          throw new InlineLiveUnavailableError('offline');
        }
        return repository.joinLive(
          item.postId,
          stream.streamName || item.streamName,
        );
      })
      .then(session => {
        if ((versions.get(key) ?? 0) !== version) return session;
        entries.set(key, {
          expiresAt: Date.now() + ttlMs,
          session,
        });
        return session;
      })
      .finally(() => {
        if (inFlight.get(key) === request) {
          inFlight.delete(key);
        }
      });

    inFlight.set(key, request);
    return request;
  };

  return {
    clear() {
      const keys = new Set([
        ...entries.keys(),
        ...inFlight.keys(),
        ...versions.keys(),
      ]);
      keys.forEach(key => {
        versions.set(key, (versions.get(key) ?? 0) + 1);
      });
      entries.clear();
      inFlight.clear();
    },
    invalidate(item: Pick<LiveStreamItem, 'postId' | 'streamName'>) {
      const key = getInlineLiveSessionKey(item);
      versions.set(key, (versions.get(key) ?? 0) + 1);
      entries.delete(key);
      inFlight.delete(key);
    },
    load,
    peek,
  };
}

export const inlineLiveSessionCache = createInlineLiveSessionCache(
  createLiveRepository(),
);
