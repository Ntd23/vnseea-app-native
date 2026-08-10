import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'vnseea-feed-media-geometry' });
const CACHE_KEY = 'aspect-ratios.v1';
const MAX_ENTRIES = 350;

type StoredEntry = [url: string, aspectRatio: number];

let memoryCache: Map<string, number> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function readCache() {
  if (memoryCache) return memoryCache;

  const next = new Map<string, number>();
  try {
    const raw = storage.getString(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      for (const entry of parsed.slice(-MAX_ENTRIES)) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const url = typeof entry[0] === 'string' ? entry[0].trim() : '';
        const ratio = Number(entry[1]);
        if (!url || !Number.isFinite(ratio) || ratio <= 0) continue;
        next.set(url, ratio);
      }
    }
  } catch {
    storage.remove(CACHE_KEY);
  }
  memoryCache = next;
  return next;
}

function persist(cache: Map<string, number>) {
  const entries = Array.from(cache.entries()).slice(
    -MAX_ENTRIES,
  ) as StoredEntry[];
  storage.set(CACHE_KEY, JSON.stringify(entries));
}

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (memoryCache) persist(memoryCache);
  }, 500);
}

export const feedMediaGeometryStorage = {
  getAspectRatio(url?: string) {
    const key = url?.trim();
    if (!key) return undefined;
    return readCache().get(key);
  },

  remember(url: string, width: number, height: number) {
    const key = url.trim();
    const ratio = width / height;
    if (!key || !Number.isFinite(ratio) || ratio <= 0) return;

    const cache = readCache();
    const existingRatio = cache.get(key);
    if (
      existingRatio !== undefined &&
      Math.abs(existingRatio - ratio) < 0.0001
    ) {
      return;
    }
    cache.delete(key);
    cache.set(key, ratio);
    while (cache.size > MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
    schedulePersist();
  },

  clear() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    memoryCache = new Map();
    storage.remove(CACHE_KEY);
  },
};
