import { useEffect, useMemo, useState } from 'react';
import {
  getInlineLiveSessionKey,
  inlineLiveSessionCache,
} from '../../application/services/inlineLiveSessionCache';
import type {
  LiveSession,
  LiveStreamItem,
} from '../../domain/types/live.types';

export function useInlineLiveSession(
  item: LiveStreamItem,
  enabled: boolean,
) {
  const sessionTarget = useMemo(
    () => ({ postId: item.postId, streamName: item.streamName }),
    [item.postId, item.streamName],
  );
  const sessionKey = getInlineLiveSessionKey(sessionTarget);
  const [session, setSession] = useState<LiveSession | null>(() =>
    inlineLiveSessionCache.peek(item),
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = inlineLiveSessionCache.peek(sessionTarget);

    if (cached) {
      setSession(cached);
    } else if (!enabled) {
      setSession(null);
    }

    if (!enabled || item.state !== 'live') {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (cached) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    inlineLiveSessionCache
      .load(sessionTarget)
      .then(nextSession => {
        if (cancelled) return;
        setSession(nextSession);
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, item.state, sessionKey, sessionTarget]);

  return { isLoading, session };
}
