import { useCallback, useEffect, useState } from 'react';

export type InlineLiveVideoDimensions = {
  width: number;
  height: number;
};

// Facebook-style portrait cap: keep the whole 9:16 frame visible with
// `contain`, but do not let one live card become taller than 4:5.
export const DEFAULT_INLINE_LIVE_ASPECT_RATIO = 4 / 5;
const MIN_INLINE_LIVE_ASPECT_RATIO = 4 / 5;
const MAX_INLINE_LIVE_ASPECT_RATIO = 16 / 9;
const ASPECT_CHANGE_EPSILON = 0.02;
const aspectRatioCache = new Map<string, number>();

export function normalizeInlineLiveAspectRatio(
  width: number,
  height: number,
): number | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  if (width <= 0 || height <= 0) return undefined;

  return Math.min(
    MAX_INLINE_LIVE_ASPECT_RATIO,
    Math.max(MIN_INLINE_LIVE_ASPECT_RATIO, width / height),
  );
}

function cacheAspectRatio(key: string, aspectRatio: number) {
  if (!key) return;
  aspectRatioCache.delete(key);
  aspectRatioCache.set(key, aspectRatio);
  if (aspectRatioCache.size > 120) {
    const oldestKey = aspectRatioCache.keys().next().value;
    if (oldestKey) aspectRatioCache.delete(oldestKey);
  }
}

function getCachedAspectRatio(key: string) {
  return aspectRatioCache.get(key);
}

export function useInlineLiveAspectRatio(cacheKey: string) {
  const [aspectRatio, setAspectRatio] = useState(
    () => getCachedAspectRatio(cacheKey) ?? DEFAULT_INLINE_LIVE_ASPECT_RATIO,
  );

  useEffect(() => {
    const cached = getCachedAspectRatio(cacheKey);
    setAspectRatio(cached ?? DEFAULT_INLINE_LIVE_ASPECT_RATIO);
  }, [cacheKey]);

  const handleVideoDimensionsChange = useCallback(
    ({ width, height }: InlineLiveVideoDimensions) => {
      const next = normalizeInlineLiveAspectRatio(width, height);
      if (next === undefined) return;
      cacheAspectRatio(cacheKey, next);
      setAspectRatio(previous =>
        Math.abs(previous - next) > ASPECT_CHANGE_EPSILON ? next : previous,
      );
    },
    [cacheKey],
  );

  return { aspectRatio, handleVideoDimensionsChange };
}
