import { useEffect, useState } from 'react';

// Keep enough recently loaded assets to protect short FlashList recycle loops,
// without keeping hundreds of native image views alive during a long session.
const MAX_RETAINED_MEDIA_KEYS = 64;
const retainedMediaKeys = new Map<string, true>();
const listenersByMediaKey = new Map<string, Set<() => void>>();

function normalizeMediaKey(mediaKey?: string) {
  return mediaKey?.trim() ?? '';
}

export function isFeedMediaLoaded(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  return Boolean(normalizedKey && retainedMediaKeys.has(normalizedKey));
}

export function isFeedMediaRetained(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  return Boolean(normalizedKey && retainedMediaKeys.has(normalizedKey));
}

function notifyMediaKey(normalizedKey: string) {
  listenersByMediaKey.get(normalizedKey)?.forEach(listener => listener());
}

function retainLoadedMediaKey(normalizedKey: string) {
  const wasRetained = retainedMediaKeys.has(normalizedKey);
  retainedMediaKeys.delete(normalizedKey);
  retainedMediaKeys.set(normalizedKey, true);

  if (!wasRetained) notifyMediaKey(normalizedKey);

  while (retainedMediaKeys.size > MAX_RETAINED_MEDIA_KEYS) {
    const oldestKey = retainedMediaKeys.keys().next().value as
      | string
      | undefined;
    if (!oldestKey) break;
    retainedMediaKeys.delete(oldestKey);
    notifyMediaKey(oldestKey);
  }
}

export function markFeedMediaRequested(_mediaKey?: string) {
  // Requests are intentionally not retained globally. If a row leaves the
  // viewport before loading finishes, React Native may cancel that request
  // instead of keeping an offscreen image view and its bitmap alive.
}

export function markFeedMediaLoaded(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  if (!normalizedKey) return;
  retainLoadedMediaKey(normalizedKey);
}

export function releaseFeedMedia(mediaKey?: string) {
  const normalizedKey = normalizeMediaKey(mediaKey);
  if (!normalizedKey || !retainedMediaKeys.delete(normalizedKey)) return;
  notifyMediaKey(normalizedKey);
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
    const listener = () => {
      setLoadedKey(isFeedMediaLoaded(normalizedKey) ? normalizedKey : '');
    };
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
