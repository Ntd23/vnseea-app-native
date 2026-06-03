// Feed - useFeedViewModel ViewModel
//
// SINGLE-LIST FEED ARCHITECTURE
// ─────────────────────────────
// We hold ONE source of truth (`posts: FeedPost[]`) sorted by `postedAt`
// descending. Both video and text/photo cards are rendered from this
// merged list — Facebook-style.
//
// PREFETCH BUFFER (v2)
// ────────────────────
// After every page load we immediately fire a background fetch for the
// NEXT page and store it in `prefetchBufferRef`. When the FlatList's
// `onEndReached` triggers `loadMorePosts`, we:
//   1. Merge the buffer instantly (zero network wait for the user).
//   2. Start prefetching the NEXT-next page into the buffer.
// This keeps the user perpetually one page ahead, matching Facebook's
// scroll behavior.
//
// Backward-compat exports `videoPosts` and `textPosts` as DERIVED
// (`useMemo`) slices so existing UI code that consumed them keeps
// working while the home screen is being refactored. Once the UI uses
// `posts` directly, those derived exports can be deleted.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import type {
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
  FeedPollPost,
} from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

const repository = createFeedRepository();
const pollRepository = createPollRepository();

// Page size — bumped from 10 to 15 so a single network trip fills
// more than one screen worth of content.
const PAGE_SIZE = 15;

/**
 * Re-sort by `postedAt` desc so optimistic prepends and updates keep
 * the merged feed in chronological order. Posts without a timestamp
 * (very rare — defensive) bubble to the bottom.
 */
function sortByTime(posts: FeedPost[]): FeedPost[] {
  return [...posts].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
}

function cachePostsAfterInteractions(posts: FeedPost[]) {
  const snapshot = posts.slice(0, 50);
  InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedPosts(snapshot);
  });
}

function getPollTotalVotes(options: FeedPollPost['options']) {
  const apiTotal = Math.max(0, ...options.map(option => Number(option.all) || 0));
  if (apiTotal > 0) return apiTotal;
  return options.reduce(
    (sum, option) => sum + (Number(option.optionVotes) || 0),
    0,
  );
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

  // ── Prefetch buffer ────────────────────────────────────────────────
  // Holds the pre-fetched next page so `loadMorePosts` can merge it
  // instantly without waiting for a network round-trip.
  const prefetchBufferRef = useRef<FeedPost[] | null>(null);
  const isPrefetchingRef = useRef(false);

  /**
   * Background-fetch the next page and stash it in `prefetchBufferRef`.
   * Does NOT touch React state — completely invisible to the UI.
   */
  const prefetchNextPage = useCallback((currentPosts: FeedPost[]) => {
    if (isPrefetchingRef.current) return; // Already prefetching
    const lastPost = currentPosts[currentPosts.length - 1];
    if (!lastPost) return;

    isPrefetchingRef.current = true;

    repository
      .getAllPosts(PAGE_SIZE, lastPost.id)
      .then(nextPosts => {
        if (nextPosts.length === 0) {
          prefetchBufferRef.current = null;
          console.log('[feed] prefetch: server returned 0 → no more pages');
        } else {
          prefetchBufferRef.current = nextPosts;
        }
      })
      .catch(err => {
        // Non-critical — the user will still get a normal fetch on scroll.
        // eslint-disable-next-line no-console
        console.warn('[feed] prefetch failed:', err);
        prefetchBufferRef.current = null;
      })
      .finally(() => {
        isPrefetchingRef.current = false;
      });
  }, []);

  const loadPosts = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setIsAllLoaded(false); // Reset pagination
    prefetchBufferRef.current = null; // Clear stale buffer
    try {
      const freshPosts = await repository.getAllPosts(PAGE_SIZE);
      setPosts(freshPosts);
      cachePostsAfterInteractions(freshPosts);

      // Immediately start prefetching page 2 into the buffer
      if (freshPosts.length >= PAGE_SIZE) {
        prefetchNextPage(freshPosts);
      }
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
  }, [prefetchNextPage]);

  const loadMorePosts = useCallback(async () => {
    if (isLoading || isLoadingMore || isAllLoaded || posts.length === 0) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      // ── Fast path: use prefetch buffer if available ──────────────
      const buffered = prefetchBufferRef.current;
      if (buffered && buffered.length > 0) {
        prefetchBufferRef.current = null; // Consume the buffer

        // eslint-disable-next-line no-console
        console.log('[feed] loadMore: using prefetch buffer →', buffered.length, 'posts');

        // Merge synchronously — buffer data is already in memory,
        // no need to defer via InteractionManager (which was causing
        // a race where isLoadingMore was reset before merge happened).
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = buffered.filter(p => !existingIds.has(p.id));
          if (newPosts.length === 0) {
            // Buffer had no new posts, probably because they were already loaded or cached.
            // Do NOT set isAllLoaded to true, just kick off the next prefetch using current tail.
            setTimeout(() => prefetchNextPage(prev), 0);
            return prev;
          }
          const merged = [...prev, ...newPosts];
          cachePostsAfterInteractions(merged);

          // Kick off prefetch for the NEXT page using the merged list
          // as the cursor source. Runs after this setPosts completes.
          setTimeout(() => prefetchNextPage(merged), 0);

          return merged;
        });

        setIsLoadingMore(false);
        return;
      }

      // ── Slow path: no buffer → fetch from network ───────────────
      // eslint-disable-next-line no-console
      console.log('[feed] loadMore: no buffer, fetching from network');

      const lastPost = posts[posts.length - 1];
      if (!lastPost) {
        setIsLoadingMore(false);
        return;
      }

      const lastPostId = lastPost.id;
      const olderPosts = await repository.getAllPosts(PAGE_SIZE, lastPostId);

      if (olderPosts.length === 0) {
        setIsAllLoaded(true);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = olderPosts.filter(p => !existingIds.has(p.id));
          if (newPosts.length === 0) {
            // No new posts in this slice, but the server returned data, so don't block future pages.
            // Queue next prefetch from existing posts.
            setTimeout(() => prefetchNextPage(prev), 0);
            return prev;
          }
          const merged = [...prev, ...newPosts];
          cachePostsAfterInteractions(merged);

          // Prefetch next page from the merged tail
          setTimeout(() => prefetchNextPage(merged), 0);

          return merged;
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
  }, [isLoading, isLoadingMore, isAllLoaded, posts, prefetchNextPage]);

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
          if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
            return post;
          }

          snapshot = post;
          const typedPost = post as FeedTextPost | FeedVideoPost | FeedPollPost;
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
          if (!prevReaction && typedPost.likeCount <= 0) {
            newTopReactions = [];
          }
          if (prevReaction && prevReaction !== targetReaction) {
            newTopReactions = newTopReactions.filter(t => t !== prevReaction);
          }
          if (targetReaction && !newTopReactions.includes(targetReaction)) {
            newTopReactions = [targetReaction, ...newTopReactions].slice(0, 3);
          }
          const likeCount = Math.max(0, typedPost.likeCount + countDelta);
          if (likeCount === 0) {
            newTopReactions = [];
          }

          // The spread preserves `kind` so the discriminator survives —
          // TypeScript narrows correctly when consumers read the post.
          return {
            ...post,
            myReaction: targetReaction,
            isLiked: willBeReacted,
            likeCount,
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
          if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
            return post;
          }
          const typedPost = post as FeedTextPost | FeedVideoPost | FeedPollPost;
          return { ...post, commentCount: Math.max(0, typedPost.commentCount + delta) };
        }),
      );
    },
    [],
  );

  const votePoll = useCallback(
    async (postId: string, optionId: string) => {
      let snapshot: FeedPost | undefined;
      
      // Optimistic update
      setPosts(prev =>
        prev.map(post => {
          if (post.id !== postId || post.kind !== 'poll') return post;
          snapshot = post;
          
          const updatedOptions = post.options.map(opt => {
            const isVoted = opt.id === optionId;
            const wasVoted = post.votedId === opt.id;
            
            let votes = opt.optionVotes;
            if (isVoted && !wasVoted) {
              votes += 1;
            } else if (!isVoted && wasVoted) {
              votes = Math.max(0, votes - 1);
            }
            
            return {
              ...opt,
              optionVotes: votes,
              all: votes,
            };
          });
          
          const totalVotes = updatedOptions.reduce(
            (sum, option) => sum + option.optionVotes,
            0,
          );
          const reCalculated = updatedOptions.map(opt => {
            const pct = totalVotes > 0 ? (opt.optionVotes / totalVotes) * 100 : 0;
            return {
              ...opt,
              all: totalVotes,
              percentage: `${Math.round(pct)}%`,
              percentageNum: Math.round(pct),
            };
          });
          
          return {
            ...post,
            options: reCalculated,
            votedId: optionId,
            totalVotes,
          };
        })
      );
      
      try {
        const response = await pollRepository.votePoll(optionId);
        
        // Update with actual response data
        setPosts(prev =>
          prev.map(post => {
            if (post.id !== postId || post.kind !== 'poll') return post;
            return {
              ...post,
              options: response.options,
              votedId: optionId,
              totalVotes: getPollTotalVotes(response.options),
            };
          })
        );
      } catch (err) {
        console.error('[useFeedViewModel] votePoll error:', err);
        // Rollback
        if (snapshot) {
          const original = snapshot;
          setPosts(prev =>
            prev.map(post => (post.id === postId ? original : post))
          );
        }
      }
    },
    []
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
    votePoll,

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
