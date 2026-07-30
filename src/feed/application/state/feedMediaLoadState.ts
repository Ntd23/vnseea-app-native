import { useEffect, useState } from 'react';

const MAX_RETAINED_MEDIA_KEYS = 600;
type RetainedMediaState = 'requested' | 'loaded';
const retainedMediaKeys = new Map<string, RetainedMediaState>();
const listenersByMediaKey = new Map<string, Set<() => void>>();

function normalizeMediaKey(mediaKey?: string) {
  return mediaKey?.trim() ?? '';
}

export function isFeedMediaLoaded(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  return Boolean(
    normalizedKey && retainedMediaKeys.get(normalizedKey) === 'loaded',
  );
}

export function isFeedMediaRetained(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  return Boolean(normalizedKey && retainedMediaKeys.has(normalizedKey));
}

function retainMediaKey(
  normalizedKey: string,
  state: RetainedMediaState,
) {
  const previousState = retainedMediaKeys.get(normalizedKey);
  const nextState =
    previousState === 'loaded' || state === 'loaded' ? 'loaded' : 'requested';

  retainedMediaKeys.delete(normalizedKey);
  retainedMediaKeys.set(normalizedKey, nextState);
  while (retainedMediaKeys.size > MAX_RETAINED_MEDIA_KEYS) {
    const oldestKey = retainedMediaKeys.keys().next().value as
      | string
      | undefined;
    if (!oldestKey) break;
    retainedMediaKeys.delete(oldestKey);
  }

  if (previousState !== nextState) {
    listenersByMediaKey.get(normalizedKey)?.forEach(listener => listener());
  }
}

export function markFeedMediaRequested(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  if (!normalizedKey) return;
  retainMediaKey(normalizedKey, 'requested');
}

export function markFeedMediaLoaded(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  if (!normalizedKey) return;
  retainMediaKey(normalizedKey, 'loaded');
}

export function useFeedMediaLoaded(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  const [loadedKey, setLoadedKey] = useState(() =>
    isFeedMediaLoaded(normalizedKey) ? normalizedKey : '',
  );

  useEffect(() => {
    setLoadedKey(isFeedMediaLoaded(normalizedKey) ? normalizedKey : '');
    if (!normalizedKey) return undefined;

    const listeners =
      listenersByMediaKey.get(normalizedKey) ?? new Set<() => void>();
    const listener = () => setLoadedKey(normalizedKey);
    listeners.add(listener);
    listenersByMediaKey.set(normalizedKey, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) listenersByMediaKey.delete(normalizedKey);
    };
  }, [normalizedKey]);

  return loadedKey === normalizedKey || isFeedMediaLoaded(normalizedKey);
}

export function useFeedMediaRetained(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  const [retainedKey, setRetainedKey] = useState(() =>
    isFeedMediaRetained(normalizedKey) ? normalizedKey : '',
  );

  useEffect(() => {
    setRetainedKey(isFeedMediaRetained(normalizedKey) ? normalizedKey : '');
    if (!normalizedKey) return undefined;

    const listeners =
      listenersByMediaKey.get(normalizedKey) ?? new Set<() => void>();
    const listener = () => {
      setRetainedKey(isFeedMediaRetained(normalizedKey) ? normalizedKey : '');
    };
    listeners.add(listener);
    listenersByMediaKey.set(normalizedKey, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) listenersByMediaKey.delete(normalizedKey);
    };
  }, [normalizedKey]);

  return retainedKey === normalizedKey || isFeedMediaRetained(normalizedKey);
}

export function resetFeedMediaLoadStateForTests() {
  retainedMediaKeys.clear();
  listenersByMediaKey.clear();
}
