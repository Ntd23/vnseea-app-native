import type { LiveRepository } from '../../domain/repositories/LiveRepository';
import type {
  LiveSession,
  LiveStreamItem,
} from '../../domain/types/live.types';
import { createLiveRepository } from '../../infrastructure/repositories/ApiLiveRepository';

const DEFAULT_INLINE_LIVE_SESSION_TTL_MS = 45_000;

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
  repository: Pick<LiveRepository, 'joinLive'>,
  ttlMs = DEFAULT_INLINE_LIVE_SESSION_TTL_MS,
) {
  const entries = new Map<string, InlineLiveSessionEntry>();
  const inFlight = new Map<string, Promise<LiveSession>>();

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

    const request = repository
      .joinLive(item.postId, item.streamName)
      .then(session => {
        entries.set(key, {
          expiresAt: Date.now() + ttlMs,
          session,
        });
        return session;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, request);
    return request;
  };

  return {
    clear() {
      entries.clear();
      inFlight.clear();
    },
    load,
    peek,
  };
}

export const inlineLiveSessionCache = createInlineLiveSessionCache(
  createLiveRepository(),
);
