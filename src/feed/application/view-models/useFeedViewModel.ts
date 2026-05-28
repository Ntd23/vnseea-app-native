// Feed - useFeedViewModel ViewModel
//
// SINGLE-LIST FEED ARCHITECTURE
// ─────────────────────────────
// We hold ONE source of truth (`posts: FeedPost[]`) sorted by `postedAt`
// descending. Both video and text/photo cards are rendered from this
// merged list — Facebook-style.
//
// Backward-compat exports `videoPosts` and `textPosts` as DERIVED
// (`useMemo`) slices so existing UI code that consumed them keeps
// working while the home screen is being refactored. Once the UI uses
// `posts` directly, those derived exports can be deleted.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { InteractionManager } from 'react-native';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import type {
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

const repository = createFeedRepository();

/**
 * Re-sort by `postedAt` desc so optimistic prepends and updates keep
 * the merged feed in chronological order. Posts without a timestamp
 * (very rare — defensive) bubble to the bottom.
 */
function sortByTime(posts: FeedPost[]): FeedPost[] {
  return [...posts].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
}

export function useFeedViewModel() {
  const [posts, setPosts] = useState<FeedPost[]>(() => {
    return feedCacheStorage.getCachedPosts();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setIsAllLoaded(false); // Reset pagination
    try {
      const freshPosts = await repository.getAllPosts(10);
      setPosts(freshPosts);
      feedCacheStorage.setCachedPosts(freshPosts);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được bảng tin.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (isLoading || isLoadingMore || isAllLoaded || posts.length === 0) return;

    setIsLoadingMore(true);
    setError(null);
    try {
      // Find the last post ID in the list to act as the cursor
      const lastPost = posts[posts.length - 1];
      if (!lastPost) return;

      const lastPostId = lastPost.id;
      // Get older posts
      const olderPosts = await repository.getAllPosts(10, lastPostId);

      if (olderPosts.length === 0) {
        setIsAllLoaded(true);
      } else {
        InteractionManager.runAfterInteractions(() => {
          setPosts(prev => {
            // Deduplicate older posts against current posts
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = olderPosts.filter(p => !existingIds.has(p.id));
            if (newPosts.length === 0) {
              setIsAllLoaded(true);
              return prev;
            }
            return [...prev, ...newPosts];
          });
        });
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được thêm bài viết.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, isAllLoaded, posts]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  // ── Derived (backward-compat) slices ─────────────────────────────
  // Older UI code reads `vm.videoPosts` / `vm.textPosts`. We keep these
  // as memoised projections of the single source of truth so the home
  // screen can migrate to `vm.posts` at its own pace.
  const videoPosts = useMemo<FeedVideoPost[]>(
    () => posts.filter((p): p is FeedVideoPost => p.kind === 'video'),
    [posts],
  );
  const textPosts = useMemo<FeedTextPost[]>(
    () => posts.filter((p): p is FeedTextPost => p.kind === 'text'),
    [posts],
  );

  /**
   * Insert a freshly-created post at the top of the merged feed.
   * Called by `useCreatePostViewModel.submit()` (for text posts) and
   * potentially `useCreateReelViewModel` (for videos, if wired up
   * later).
   *
   * Dedupe by `id` so an accidental double-emit doesn't show the same
   * post twice. Then re-sort so the new post lands in its real
   * chronological slot — usually the top, but defensive in case the
   * server returns an older `time` than we expect.
   */
  const prependPost = useCallback((post: FeedPost) => {
    setPosts(prev => {
      if (prev.some(p => p.id === post.id)) return prev;
      return sortByTime([post, ...prev]);
    });
  }, []);

  /**
   * Add, swap, or clear the viewer's reaction on a post (any kind).
   * Same Facebook-style logic the old per-slice toggle used:
   *
   *   • No reaction       + nextReaction='like' → adds 'like'
   *   • Has 'like'        + nextReaction='like' → clears (toggle off)
   *   • Has 'like'        + nextReaction='love' → swaps to 'love'
   *
   * Optimistic update first, server round-trip second. On failure we
   * roll the touched post back to its pre-toggle snapshot.
   */
  const toggleReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: FeedPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;

      setPosts(prev =>
        prev.map(post => {
          if (post.id !== postId) return post;
          // Skip product posts - they don't have reactions
          if (post.kind === 'product') return post;

          snapshot = post;
          const typedPost = post as FeedTextPost | FeedVideoPost;
          const willClear = typedPost.myReaction === nextReaction;
          targetReaction = willClear ? null : nextReaction;

          const wasReacted = typedPost.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const countDelta = Number(willBeReacted) - Number(wasReacted);

          // Optimistically update topReactions when the viewer switches
          // or clears their reaction:
          //   1. Remove the OLD reaction type if the viewer had one and
          //      it's different from the new one (or they're clearing).
          //      This stops the stale icon from lingering until reload.
          //   2. Prepend the NEW reaction type if it isn't already there.
          const prevReaction = typedPost.myReaction;
          let newTopReactions = [...typedPost.topReactions];
          if (prevReaction && prevReaction !== targetReaction) {
            newTopReactions = newTopReactions.filter(t => t !== prevReaction);
          }
          if (targetReaction && !newTopReactions.includes(targetReaction)) {
            newTopReactions = [targetReaction, ...newTopReactions].slice(0, 3);
          }

          // The spread preserves `kind` so the discriminator survives —
          // TypeScript narrows correctly when consumers read the post.
          return {
            ...post,
            myReaction: targetReaction,
            isLiked: willBeReacted,
            likeCount: Math.max(0, typedPost.likeCount + countDelta),
            topReactions: newTopReactions,
          };
        }),
      );

      try {
        await repository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          setPosts(prev =>
            prev.map(post => (post.id === postId ? original : post)),
          );
        }
      }
    },
    [],
  );

  /**
   * Increment / decrement a post's `commentCount` (used by the comments
   * sheet for optimistic +1 on send, -1 on delete). Works on any post
   * kind — the unified posts array makes this trivial.
   */
  const updateCommentCount = useCallback(
    (postId: string, delta: number) => {
      setPosts(prev =>
        prev.map(post => {
          // Skip product posts - they don't have comments in the same way
          if (post.kind === 'product') return post;
          const typedPost = post as FeedTextPost | FeedVideoPost;
          return { ...post, commentCount: Math.max(0, typedPost.commentCount + delta) };
        }),
      );
    },
    [],
  );

  return {
    // ── Primary (unified) API ─────────────────────────────────────
    posts,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    isLoadingMore,
    isAllLoaded,
    error,
    reloadPosts: loadPosts,
    loadMorePosts,
    prependPost,
    toggleReaction,
    updateCommentCount,

    // ── Backward-compat aliases ──────────────────────────────────
    // Older screen code reads these names. They are derived state
    // pointing at the same underlying `posts` array; deleting them is
    // safe once no consumer references them.
    videoPosts,
    isLoadingVideos: isLoading,
    videoError: error,
    reloadVideoPosts: loadPosts,

    textPosts,
    isLoadingTextPosts: isLoading,
    textPostsError: error,
    reloadTextPosts: loadPosts,
    prependTextPost: prependPost,
    // `toggleTextPostReaction` was a separate fn when video/text lived
    // in different state slices. With unified state it's literally the
    // same function — alias for backward compat.
    toggleTextPostReaction: toggleReaction,

    /**
     * Toggle save/unsave a post. No optimistic update needed —
     * the server confirms the state and the UI refreshes on next visit.
     */
    savePost: (postId: string) => repository.savePost(postId),

    /**
     * Toggle report/unreport a post. No optimistic update needed.
     */
    reportPost: (postId: string) => repository.reportPost(postId),
  };
}
