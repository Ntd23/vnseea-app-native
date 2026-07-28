// Shared first-page comment cache used by Feed and PostDetail.
//
// Keeping this cache outside the hook is intentional: opening a post from the
// feed creates a new PostDetail instance, so a useRef cache would otherwise be
// lost during navigation. The small TTL keeps repeat opens instant while the
// realtime scope continues to provide fresh updates while a screen is open.
import { createAsyncResourceCache } from '../../shared-kernel/application/utils/asyncResourceCache';
import { sessionStorage } from '../../shared-kernel/infrastructure/storage/sessionStorage';
import { createReelsRepository } from '../../reels/infrastructure/repositories/ApiReelsRepository';
import type { ReelComment } from '../../reels/domain/types/reels.types';

export const FEED_COMMENT_PAGE_SIZE = 20;

export type FeedCommentsCacheEntry = {
  comments: ReelComment[];
  hasMore: boolean;
  offset: number;
  updatedAt: number;
};

const commentsRepository = createReelsRepository();
const commentsCache = createAsyncResourceCache<FeedCommentsCacheEntry>({
  // Comments are also refreshed by the realtime scope. This TTL is only for
  // the short transition/reopen window and avoids a blocking skeleton.
  ttlMs: 60_000,
  maxEntries: 80,
});

export function normalizeFeedCommentPostId(postId: string) {
  return postId.replace(/_rc\d+_\d+$/, '');
}

function getCacheKey(postId: string) {
  const session = sessionStorage.getSession();
  // A few legacy sessions do not persist userId. Falling back to the token
  // still keeps one account's reaction/owner flags out of another account's
  // cache namespace.
  const viewerId = session?.userId || session?.accessToken || 'anonymous';
  return `${String(viewerId)}:${normalizeFeedCommentPostId(postId)}`;
}

export function readFeedCommentsCache(postId: string) {
  return commentsCache.get(getCacheKey(postId));
}

export function writeFeedCommentsCache(
  postId: string,
  comments: ReelComment[],
  hasMore: boolean,
  offset: number,
) {
  return commentsCache.set(getCacheKey(postId), {
    comments,
    hasMore,
    offset,
    updatedAt: Date.now(),
  });
}

/**
 * Loads the first page once per post. Concurrent Feed/PostDetail requests
 * share the same promise, so a fast tap or a screen transition cannot start
 * duplicate network calls.
 */
export function loadFeedCommentsPage(postId: string) {
  const cleanPostId = normalizeFeedCommentPostId(postId);
  return commentsCache.getOrLoad(getCacheKey(cleanPostId), async () => {
    const comments = await commentsRepository.getComments(cleanPostId, {
      limit: FEED_COMMENT_PAGE_SIZE,
      offset: 0,
    });
    const lastComment = comments[comments.length - 1];
    return {
      comments,
      hasMore: comments.length >= FEED_COMMENT_PAGE_SIZE,
      offset: Number(lastComment?.id ?? 0) || 0,
      updatedAt: Date.now(),
    };
  });
}

/** Starts loading without making navigation wait for the request. */
export function prefetchFeedComments(postId: string) {
  if (!postId)
    return Promise.resolve<FeedCommentsCacheEntry | undefined>(undefined);
  return loadFeedCommentsPage(postId).catch(() => undefined);
}

/** Realtime/manual refresh bypasses the TTL but writes back to the shared cache. */
export async function refreshFeedComments(postId: string) {
  const cleanPostId = normalizeFeedCommentPostId(postId);
  const comments = await commentsRepository.getComments(cleanPostId, {
    limit: FEED_COMMENT_PAGE_SIZE,
    offset: 0,
  });
  const lastComment = comments[comments.length - 1];
  return writeFeedCommentsCache(
    cleanPostId,
    comments,
    comments.length >= FEED_COMMENT_PAGE_SIZE,
    Number(lastComment?.id ?? 0) || 0,
  );
}
