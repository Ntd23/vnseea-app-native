import type { FeedPost } from '../types/feed.types';

export function isFeedPostShareable(
  post: FeedPost | null | undefined,
): boolean {
  return post?.permissions?.canShare === true;
}
