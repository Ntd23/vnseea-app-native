import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getInlineLiveSessionKey,
  InlineLiveEndedError,
  InlineLiveUnavailableError,
  inlineLiveSessionCache,
} from '../../application/services/inlineLiveSessionCache';
import { endedLivePostsStorage } from '../../infrastructure/storage/endedLivePostsStorage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
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
  const [sessionEntry, setSessionEntry] = useState<{
    key: string;
    session: LiveSession;
  } | null>(() => {
    const cached = inlineLiveSessionCache.peek(item);
    return cached ? { key: sessionKey, session: cached } : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorEntry, setErrorEntry] = useState<{
    error: Error;
    key: string;
  } | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const session = sessionEntry?.key === sessionKey ? sessionEntry.session : null;
  const error = errorEntry?.key === sessionKey ? errorEntry.error : null;

  const retry = useCallback(() => {
    inlineLiveSessionCache.invalidate(sessionTarget);
    setSessionEntry(null);
    setErrorEntry(null);
    setRequestVersion(current => current + 1);
  }, [sessionTarget]);

  useEffect(() => {
    let cancelled = false;
    const cached = inlineLiveSessionCache.peek(sessionTarget);

    if (cached) {
      setSessionEntry({ key: sessionKey, session: cached });
      setErrorEntry(null);
    } else {
      setSessionEntry(null);
      if (!enabled) setErrorEntry(null);
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
    setErrorEntry(null);
    inlineLiveSessionCache
      .load(sessionTarget)
      .then(nextSession => {
        if (cancelled) return;
        setSessionEntry({ key: sessionKey, session: nextSession });
        setErrorEntry(null);
      })
      .catch(loadError => {
        if (cancelled) return;
        setSessionEntry(null);
        const normalizedError =
          loadError instanceof Error
            ? loadError
            : new Error(String(loadError));
        setErrorEntry({ error: normalizedError, key: sessionKey });
        if (normalizedError instanceof InlineLiveEndedError) {
          endedLivePostsStorage.markEnded(
            item.postId,
            sessionStorage.getSession()?.userId,
          );
        } else if (
          normalizedError instanceof InlineLiveUnavailableError &&
          normalizedError.reason === 'offline'
        ) {
          endedLivePostsStorage.notifyInactive(
            item.postId,
            sessionStorage.getSession()?.userId,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    item.postId,
    item.state,
    requestVersion,
    sessionKey,
    sessionTarget,
  ]);

  return {
    error,
    hasEnded: error instanceof InlineLiveEndedError,
    isLoading,
    retry,
    session,
  };
}
