import type { ReelsItem, ReelsPage } from '../../domain/types/reels.types';

const DEFAULT_MAX_REQUESTS = 3;
const DEFAULT_TARGET_COUNT = 5;

type FetchDistinctReelsBatchOptions = {
  cursor: string;
  existingIds: Iterable<string>;
  fetchPage: (cursor: string) => Promise<ReelsPage>;
  filterItems?: (items: ReelsItem[]) => ReelsItem[];
  maxRequests?: number;
  targetCount?: number;
};

export type DistinctReelsBatch = {
  items: ReelsItem[];
  nextCursor: string | null;
  hasMore: boolean;
  shouldRetry: boolean;
  error: unknown | null;
};

export async function fetchDistinctReelsBatch({
  cursor,
  existingIds,
  fetchPage,
  filterItems = items => items,
  maxRequests = DEFAULT_MAX_REQUESTS,
  targetCount = DEFAULT_TARGET_COUNT,
}: FetchDistinctReelsBatchOptions): Promise<DistinctReelsBatch> {
  const seen = new Set(Array.from(existingIds, String));
  const freshItems: ReelsItem[] = [];
  let requestCursor = cursor;
  let nextCursor: string | null = cursor;
  let hasMore = true;

  for (
    let requestIndex = 0;
    requestIndex < Math.max(1, maxRequests);
    requestIndex += 1
  ) {
    let page: ReelsPage;
    try {
      page = await fetchPage(requestCursor);
    } catch (error) {
      return {
        items: freshItems,
        nextCursor: requestCursor,
        hasMore: true,
        shouldRetry: true,
        error,
      };
    }

    for (const item of filterItems(page.items)) {
      const id = String(item.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      freshItems.push(item);
    }

    const pageCursor = page.nextCursor;
    const cursorAdvanced =
      pageCursor !== null && pageCursor !== requestCursor;
    nextCursor = pageCursor;
    hasMore = cursorAdvanced;

    if (
      freshItems.length >= Math.max(1, targetCount) ||
      pageCursor === null ||
      !cursorAdvanced
    ) {
      break;
    }

    requestCursor = pageCursor;
  }

  return {
    items: freshItems,
    nextCursor,
    hasMore,
    shouldRetry: freshItems.length === 0 && hasMore,
    error: null,
  };
}
