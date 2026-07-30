import type { LiveStreamItem } from '../../domain/types/live.types';

export const LIVE_DISCOVERY_STALE_MS = 25_000;
export const LIVE_POST_SNAPSHOT_STALE_MS = 8_000;

export type LiveDiscoverySnapshot = {
  liveStreams?: LiveStreamItem[];
  friendsLive?: LiveStreamItem[];
};

type ResourceEntry<T> = {
  hasValue: boolean;
  value: T | undefined;
  fetchedAt: number;
  inFlight: Promise<T> | null;
};

type LoadResourceOptions = {
  force?: boolean;
  staleMs?: number;
};

const discoveryEntries = new Map<
  string,
  ResourceEntry<LiveDiscoverySnapshot>
>();
const postEntries = new Map<
  number,
  ResourceEntry<LiveStreamItem | null>
>();

function createEntry<T>(): ResourceEntry<T> {
  return {
    hasValue: false,
    value: undefined,
    fetchedAt: 0,
    inFlight: null,
  };
}

function loadResource<TKey, TValue>(
  entries: Map<TKey, ResourceEntry<TValue>>,
  key: TKey,
  loader: () => Promise<TValue>,
  options: LoadResourceOptions,
) {
  let entry = entries.get(key);
  if (!entry) {
    entry = createEntry<TValue>();
    entries.set(key, entry);
  }

  const staleMs = options.staleMs ?? 0;
  if (
    !options.force &&
    entry.hasValue &&
    Date.now() - entry.fetchedAt < staleMs
  ) {
    return Promise.resolve(entry.value as TValue);
  }
  if (entry.inFlight) return entry.inFlight;

  const request = loader()
    .then(value => {
      entry!.hasValue = true;
      entry!.value = value;
      entry!.fetchedAt = Date.now();
      return value;
    })
    .catch(error => {
      if (entry!.hasValue) return entry!.value as TValue;
      throw error;
    })
    .finally(() => {
      if (entry!.inFlight === request) entry!.inFlight = null;
    });

  entry.inFlight = request;
  return request;
}

export function loadLiveDiscoverySnapshot(
  key: string,
  loader: () => Promise<LiveDiscoverySnapshot>,
  options: LoadResourceOptions = {},
) {
  return loadResource(discoveryEntries, key, loader, {
    staleMs: LIVE_DISCOVERY_STALE_MS,
    ...options,
  });
}

export function loadLivePostSnapshot(
  postId: number,
  loader: () => Promise<LiveStreamItem | null>,
  options: LoadResourceOptions = {},
) {
  return loadResource(postEntries, postId, loader, {
    staleMs: LIVE_POST_SNAPSHOT_STALE_MS,
    ...options,
  });
}

export function invalidateLiveDiscoverySnapshot(key: string) {
  discoveryEntries.delete(key);
}

export function invalidateLivePostSnapshot(postId: number) {
  postEntries.delete(postId);
}

export function clearLiveRequestResource() {
  discoveryEntries.clear();
  postEntries.clear();
}
