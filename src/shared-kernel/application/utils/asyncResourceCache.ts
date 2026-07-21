// Description: Coalesces duplicate async reads and keeps a small in-memory TTL/LRU cache.
export type AsyncResourceCacheOptions = {
  ttlMs: number;
  maxEntries?: number;
};

type CacheEntry<TValue> = {
  value: TValue;
  expiresAt: number;
};

export function createAsyncResourceCache<TValue>({
  ttlMs,
  maxEntries = 64,
}: AsyncResourceCacheOptions) {
  const values = new Map<string, CacheEntry<TValue>>();
  const inFlight = new Map<string, Promise<TValue>>();

  const read = (key: string) => {
    const entry = values.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      values.delete(key);
      return undefined;
    }

    // Refresh insertion order so the Map also behaves as a compact LRU cache.
    values.delete(key);
    values.set(key, entry);
    return entry.value;
  };

  const write = (key: string, value: TValue) => {
    values.delete(key);
    values.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    while (values.size > maxEntries) {
      const oldestKey = values.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      values.delete(oldestKey);
    }

    return value;
  };

  const getOrLoad = (key: string, loader: () => Promise<TValue>) => {
    const cached = read(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    const existingRequest = inFlight.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    const request = Promise.resolve()
      .then(loader)
      .then(value => write(key, value))
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
      values.clear();
      inFlight.clear();
    },
    get: read,
    getOrLoad,
    set: write,
  };
}
