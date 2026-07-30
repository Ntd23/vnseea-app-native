import type {
  FeedPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';

function appendMissingById<T extends { id: string }>(
  latestItems: readonly T[],
  pendingItems: readonly T[],
): T[] {
  const merged = [...latestItems];
  const seenIds = new Set(latestItems.map(item => item.id));

  for (const item of pendingItems) {
    if (!item?.id || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    merged.push(item);
  }

  return merged;
}

/**
 * Resolves a background video commit after scrolling finishes.
 *
 * Pagination is allowed to append light posts while the video lane is being
 * prepared. The latest light/video refs therefore own membership and order;
 * the deferred snapshot may only contribute newly prepared video rows.
 */
export function resolveDeferredFeedCommit(input: {
  latestLightPosts: readonly FeedPost[];
  latestVideoPosts: readonly FeedVideoPost[];
  pendingVideoPosts: readonly FeedVideoPost[];
}) {
  return {
    lightPosts: [...input.latestLightPosts],
    videoPosts: appendMissingById(
      input.latestVideoPosts,
      input.pendingVideoPosts,
    ),
  };
}

export function mergePendingVideoSnapshots(
  previousPendingVideos: readonly FeedVideoPost[],
  nextPendingVideos: readonly FeedVideoPost[],
) {
  return appendMissingById(previousPendingVideos, nextPendingVideos);
}
