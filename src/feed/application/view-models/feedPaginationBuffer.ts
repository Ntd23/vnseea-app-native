// Description: Small, deterministic helpers for progressively revealing
// prefetched Home feed posts without losing cursor-fetched rows.

export type FeedPaginationItem = {
  id: string;
};

export function mergeFeedPrefetchQueue<T extends FeedPaginationItem>(
  queued: readonly T[],
  incoming: readonly T[],
  excludedIds: ReadonlySet<string> = new Set<string>(),
): T[] {
  const seen = new Set(excludedIds);
  const merged: T[] = [];

  for (const item of [...queued, ...incoming]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function takeFeedPrefetchBatch<T extends FeedPaginationItem>(
  queued: readonly T[],
  excludedIds: ReadonlySet<string>,
  requestedBatchSize: number,
): { batch: T[]; remaining: T[] } {
  const available = mergeFeedPrefetchQueue([], queued, excludedIds);
  const batchSize = Math.max(1, Math.floor(requestedBatchSize));

  return {
    batch: available.slice(0, batchSize),
    remaining: available.slice(batchSize),
  };
}
