import { useCallback, useEffect, useState } from 'react';

type CartCountListener = (count: number) => void;

const listeners = new Set<CartCountListener>();
let cachedCartCount = 0;
let hasKnownCartCount = false;

function normalizeCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : undefined;
}

function emitCartCount(count: number) {
  cachedCartCount = count;
  hasKnownCartCount = true;
  listeners.forEach(listener => listener(cachedCartCount));
}

export function getCachedCartCount() {
  return cachedCartCount;
}

export function setSyncedCartCount(nextCount?: unknown, fallbackDelta = 0) {
  const normalizedCount = normalizeCount(nextCount);
  const count =
    normalizedCount !== undefined
      ? normalizedCount
      : Math.max(0, cachedCartCount + fallbackDelta);

  emitCartCount(count);
  return count;
}

export function subscribeCartCount(listener: CartCountListener) {
  listeners.add(listener);
  if (hasKnownCartCount) {
    listener(cachedCartCount);
  }

  return () => {
    listeners.delete(listener);
  };
}

export function useSyncedCartCount(initialCount = 0) {
  const [cartCount, setCartCount] = useState(
    hasKnownCartCount ? cachedCartCount : initialCount,
  );

  useEffect(() => subscribeCartCount(setCartCount), []);

  const syncCartCount = useCallback((nextCount?: unknown, fallbackDelta = 0) => {
    return setSyncedCartCount(nextCount, fallbackDelta);
  }, []);

  return { cartCount, syncCartCount };
}
