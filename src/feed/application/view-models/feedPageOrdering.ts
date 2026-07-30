import type { FeedPost } from '../../domain/types/feed.types';

function getTimestamp(post: FeedPost) {
  const timestamp = Number(post.postedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function canAppendFeedPageWithoutResort(
  existingPosts: readonly FeedPost[],
  candidates: readonly FeedPost[],
) {
  const existingTimestamps = existingPosts
    .map(getTimestamp)
    .filter(timestamp => timestamp > 0);
  if (existingTimestamps.length === 0) return true;

  const oldestExistingTimestamp = Math.min(...existingTimestamps);
  return candidates.every(post => {
    const timestamp = getTimestamp(post);
    return timestamp <= 0 || timestamp <= oldestExistingTimestamp;
  });
}
