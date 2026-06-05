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
const VIDEO_PAGE_SIZE = 10;
const VIDEO_INSERT_INTERVAL = 5;

/**
 * Re-sort by `postedAt` desc so optimistic prepends and updates keep
 * the merged feed in chronological order. Posts without a timestamp
 * (very rare — defensive) bubble to the bottom.
 */
function sortByTime(posts: FeedPost[]): FeedPost[] {
  return [...posts].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
}

function isLightFeedPost(post: FeedPost): post is Exclude<FeedPost, FeedVideoPost> {
  return post.kind !== 'video' && post.kind !== 'product' && post.kind !== 'event' && post.kind !== 'job';
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function interleaveVideos(
  lightPosts: FeedPost[],
  videoPosts: FeedVideoPost[],
): FeedPost[] {
  const lightIds = new Set(lightPosts.map(post => post.id));
  const usableVideos = uniqueById(videoPosts)
    .filter(video => !lightIds.has(video.id))
    .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  const result: FeedPost[] = [];
  let videoIndex = 0;

  lightPosts.forEach((post, index) => {
    result.push(post);
    if ((index + 1) % VIDEO_INSERT_INTERVAL === 0 && videoIndex < usableVideos.length) {
      result.push(usableVideos[videoIndex]);
      videoIndex += 1;
    }
  });

  return result;
}

function cacheLightPostsAfterInteractions(posts: FeedPost[]) {
  const snapshot = posts.slice(0, 50);
  InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedPosts(snapshot);
  });
}

function cacheVideoPostsAfterInteractions(posts: FeedVideoPost[]) {
  const snapshot = posts.slice(0, 30);
  InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedVideoPosts(snapshot);
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
    const cachedLightPosts = feedCacheStorage
      .getCachedPosts()
      .filter(isLightFeedPost);
    const cachedVideoPosts = feedCacheStorage.getCachedVideoPosts();
    return interleaveVideos(cachedLightPosts, cachedVideoPosts);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lightPostsRef = useRef<FeedPost[]>(
    feedCacheStorage.getCachedPosts().filter(isLightFeedPost),
  );
  const videoPostsRef = useRef<FeedVideoPost[]>(
    feedCacheStorage.getCachedVideoPosts(),
  );

  // ── Prefetch buffer ────────────────────────────────────────────────
  // Holds the pre-fetched next page so `loadMorePosts` can merge it
  // instantly without waiting for a network round-trip.
  const prefetchBufferRef = useRef<FeedPost[] | null>(null);
  const isPrefetchingRef = useRef(false);
  const isFetchingVideosRef = useRef(false);

  const commitFeedSources = useCallback(
    (nextLightPosts: FeedPost[], nextVideoPosts: FeedVideoPost[]) => {
      const cleanLightPosts = uniqueById(nextLightPosts)
        .filter(isLightFeedPost)
        .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
      const cleanVideoPosts = uniqueById(nextVideoPosts).sort(
        (a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0),
      );

      lightPostsRef.current = cleanLightPosts;
      videoPostsRef.current = cleanVideoPosts;
      setPosts(interleaveVideos(cleanLightPosts, cleanVideoPosts));
      cacheLightPostsAfterInteractions(cleanLightPosts);
      cacheVideoPostsAfterInteractions(cleanVideoPosts);
    },
    [],
  );

  const updatePostEverywhere = useCallback((updater: (post: FeedPost) => FeedPost) => {
    lightPostsRef.current = lightPostsRef.current
      .map(updater)
      .filter(isLightFeedPost);
    videoPostsRef.current = videoPostsRef.current
      .map(updater)
      .filter((post): post is FeedVideoPost => post.kind === 'video');
    setPosts(prev => prev.map(updater));
    cacheLightPostsAfterInteractions(lightPostsRef.current);
    cacheVideoPostsAfterInteractions(videoPostsRef.current);
  }, []);

  const ensureVideoBuffer = useCallback(
    (lightCount: number) => {
      if (isFetchingVideosRef.current) return;
      const requiredVideos = Math.floor(lightCount / VIDEO_INSERT_INTERVAL) + 2;
      if (videoPostsRef.current.length >= requiredVideos) return;

      const lastVideo = videoPostsRef.current[videoPostsRef.current.length - 1];
      isFetchingVideosRef.current = true;
      repository
        .getVideoPosts(VIDEO_PAGE_SIZE, lastVideo?.id)
        .then(nextVideos => {
          if (nextVideos.length === 0) return;
          const existingIds = new Set(videoPostsRef.current.map(post => post.id));
          const freshVideos = nextVideos.filter(post => !existingIds.has(post.id));
          if (freshVideos.length === 0) return;
          commitFeedSources(lightPostsRef.current, [
            ...videoPostsRef.current,
            ...freshVideos,
          ]);
        })
        .catch(err => {
          // Video is a secondary lane; a failure must not blank or block feed.
          console.warn('[feed] video background fetch failed:', err);
        })
        .finally(() => {
          isFetchingVideosRef.current = false;
        });
    },
    [commitFeedSources],
  );

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
      .getLightPosts(PAGE_SIZE, lastPost.id)
      .then(nextPosts => {
        if (nextPosts.length === 0) {
          prefetchBufferRef.current = null;
          console.log('[feed] prefetch: server returned 0 → no more pages');
        } else {
          prefetchBufferRef.current = nextPosts.filter(isLightFeedPost);
        }
      })
      .catch(err => {
        // Non-critical — the user will still get a normal fetch on scroll.
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
      const freshPosts = (await repository.getLightPosts(PAGE_SIZE)).filter(
        isLightFeedPost,
      );
      commitFeedSources(freshPosts, videoPostsRef.current);
      ensureVideoBuffer(freshPosts.length);

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
  }, [commitFeedSources, ensureVideoBuffer, prefetchNextPage]);

  const loadMorePosts = useCallback(async () => {
    const currentLightPosts = lightPostsRef.current;
    if (isLoading || isLoadingMore || isAllLoaded || currentLightPosts.length === 0) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      // ── Fast path: use prefetch buffer if available ──────────────
      const buffered = prefetchBufferRef.current;
      if (buffered && buffered.length > 0) {
        prefetchBufferRef.current = null; // Consume the buffer

        console.log('[feed] loadMore: using prefetch buffer →', buffered.length, 'posts');

        // Merge synchronously — buffer data is already in memory,
        // no need to defer via InteractionManager (which was causing
        // a race where isLoadingMore was reset before merge happened).
        const existingIds = new Set(currentLightPosts.map(p => p.id));
        const newPosts = buffered.filter(p => !existingIds.has(p.id));
        if (newPosts.length === 0) {
          setTimeout(() => prefetchNextPage(lightPostsRef.current), 0);
          setIsLoadingMore(false);
          return;
        }
        const merged = [...currentLightPosts, ...newPosts];
        commitFeedSources(merged, videoPostsRef.current);
        ensureVideoBuffer(merged.length);
        setTimeout(() => prefetchNextPage(lightPostsRef.current), 0);

        setIsLoadingMore(false);
        return;
      }

      // ── Slow path: no buffer → fetch from network ───────────────
      console.log('[feed] loadMore: no buffer, fetching from network');

      const lastPost = currentLightPosts[currentLightPosts.length - 1];
      if (!lastPost) {
        setIsLoadingMore(false);
        return;
      }

      const lastPostId = lastPost.id;
      const olderPosts = (await repository.getLightPosts(PAGE_SIZE, lastPostId)).filter(
        isLightFeedPost,
      );

      if (olderPosts.length === 0) {
        setIsAllLoaded(true);
      } else {
        const existingIds = new Set(currentLightPosts.map(p => p.id));
        const newPosts = olderPosts.filter(p => !existingIds.has(p.id));
        if (newPosts.length === 0) {
          setTimeout(() => prefetchNextPage(lightPostsRef.current), 0);
          return;
        }
        const merged = [...currentLightPosts, ...newPosts];
        commitFeedSources(merged, videoPostsRef.current);
        ensureVideoBuffer(merged.length);
        setTimeout(() => prefetchNextPage(lightPostsRef.current), 0);
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
  }, [
    commitFeedSources,
    ensureVideoBuffer,
    isAllLoaded,
    isLoading,
    isLoadingMore,
    prefetchNextPage,
  ]);

  useEffect(() => {
    loadPosts();
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
    if (post.kind === 'video') {
      if (videoPostsRef.current.some(p => p.id === post.id)) return;
      commitFeedSources(lightPostsRef.current, sortByTime([
        post,
        ...videoPostsRef.current,
      ]) as FeedVideoPost[]);
      return;
    }

    if (lightPostsRef.current.some(p => p.id === post.id)) return;
    commitFeedSources(sortByTime([post, ...lightPostsRef.current]), videoPostsRef.current);
  }, [commitFeedSources]);

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

      updatePostEverywhere(post => {
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
        });

      try {
        await repository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          updatePostEverywhere(post => (post.id === postId ? original : post));
        }
      }
    },
    [updatePostEverywhere],
  );

  /**
   * Increment / decrement a post's `commentCount` (used by the comments
   * sheet for optimistic +1 on send, -1 on delete). Works on any post
   * kind — the unified posts array makes this trivial.
   */
  const updateCommentCount = useCallback(
    (postId: string, delta: number) => {
      updatePostEverywhere(post => {
          if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
            return post;
          }
          const typedPost = post as FeedTextPost | FeedVideoPost | FeedPollPost;
          return { ...post, commentCount: Math.max(0, typedPost.commentCount + delta) };
        });
    },
    [updatePostEverywhere],
  );

  const votePoll = useCallback(
    async (postId: string, optionId: string) => {
      let snapshot: FeedPost | undefined;
      
      // Optimistic update
      updatePostEverywhere(post => {
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
        });
      
      try {
        const response = await pollRepository.votePoll(optionId);
        
        // Update with actual response data
        updatePostEverywhere(post => {
            if (post.id !== postId || post.kind !== 'poll') return post;
            return {
              ...post,
              options: response.options,
              votedId: optionId,
              totalVotes: getPollTotalVotes(response.options),
            };
          });
      } catch (err) {
        console.error('[useFeedViewModel] votePoll error:', err);
        // Rollback
        if (snapshot) {
          const original = snapshot;
          updatePostEverywhere(post => (post.id === postId ? original : post));
        }
      }
    },
    [updatePostEverywhere]
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
