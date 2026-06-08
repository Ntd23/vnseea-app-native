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

type InteractionTask = ReturnType<typeof InteractionManager.runAfterInteractions>;

let pendingLightCacheTask: InteractionTask | null = null;
let pendingVideoCacheTask: InteractionTask | null = null;

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
  pendingLightCacheTask?.cancel();
  pendingLightCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedPosts(snapshot);
    pendingLightCacheTask = null;
  });
}

function cacheVideoPostsAfterInteractions(posts: FeedVideoPost[]) {
  const snapshot = posts.slice(0, 30);
  pendingVideoCacheTask?.cancel();
  pendingVideoCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedVideoPosts(snapshot);
    pendingVideoCacheTask = null;
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
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
  const videoBufferTaskRef = useRef<InteractionTask | null>(null);

  // ── Client-side Infinite Scroll Recycling ────────────────────────
  const hasReachedNetworkEndRef = useRef(false);

  const commitFeedSources = useCallback(
    (nextLightPosts: FeedPost[], nextVideoPosts: FeedVideoPost[]) => {
      // DEBUG: Detect duplicates entering the commit
      const lightIds = nextLightPosts.map(p => p.id);
      const lightDupes = lightIds.filter((id, idx) => lightIds.indexOf(id) !== idx);
      const videoIds = nextVideoPosts.map(p => p.id);
      const videoDupes = videoIds.filter((id, idx) => videoIds.indexOf(id) !== idx);
      // Cross-lane dupes: posts present in BOTH light and video arrays
      const crossLaneDupes = nextVideoPosts
        .filter(v => lightIds.includes(v.id))
        .map(v => v.id);

      if (lightDupes.length > 0 || videoDupes.length > 0 || crossLaneDupes.length > 0) {
        console.warn(
          '[FEED DEBUG] commitFeedSources — duplicates detected!',
          {
            inputLightCount: nextLightPosts.length,
            inputVideoCount: nextVideoPosts.length,
            intraLightDupes: Array.from(new Set(lightDupes)),
            intraVideoDupes: Array.from(new Set(videoDupes)),
            crossLaneDupes: Array.from(new Set(crossLaneDupes)),
            timestamp: Date.now(),
          },
        );
      }

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

      // DEBUG: report final state
      console.log('[FEED DEBUG] commitFeedSources — committed', {
        lightCount: cleanLightPosts.length,
        videoCount: cleanVideoPosts.length,
        finalLightIds: cleanLightPosts.slice(0, 5).map(p => p.id),
        finalVideoIds: cleanVideoPosts.slice(0, 3).map(p => p.id),
        finalPostsCount: cleanLightPosts.length + cleanVideoPosts.length,
        timestamp: Date.now(),
      });
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

      // Snapshot timestamps to enforce strict "older than what we have"
      const existingVideoIds = new Set(videoPostsRef.current.map(post => post.id));
      const oldestVideoTimestamp = videoPostsRef.current.reduce<number>(
        (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
        Number.POSITIVE_INFINITY,
      );

      repository
        .getVideoPosts(VIDEO_PAGE_SIZE * 2, lastVideo?.id)
        .then(nextVideos => {
          const freshVideos = nextVideos.filter(post => {
            if (existingVideoIds.has(post.id)) return false;
            if (
              post.postedAt &&
              oldestVideoTimestamp !== Number.POSITIVE_INFINITY
            ) {
              return post.postedAt < oldestVideoTimestamp;
            }
            return true;
          }).slice(0, VIDEO_PAGE_SIZE);

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

  const scheduleVideoBuffer = useCallback(
    (lightCount: number) => {
      videoBufferTaskRef.current?.cancel();
      videoBufferTaskRef.current = InteractionManager.runAfterInteractions(() => {
        videoBufferTaskRef.current = null;
        ensureVideoBuffer(lightCount);
      });
    },
    [ensureVideoBuffer],
  );

  /**
   * Background-fetch the next page and stash it in `prefetchBufferRef`.
   * Does NOT touch React state — completely invisible to the UI.
   */
  const prefetchNextPage = useCallback((currentPosts: FeedPost[]) => {
    if (isPrefetchingRef.current) return; // Already prefetching

    if (hasReachedNetworkEndRef.current) {
      return;
    }

    // Find the last real post to use as the network fetch cursor
    const lastRealPost = [...currentPosts].reverse().find(p => p.kind !== 'ad');
    if (!lastRealPost) return;

    isPrefetchingRef.current = true;

    // Snapshot of currently-loaded post IDs and timestamps for dedup
    const existingIds = new Set(lightPostsRef.current.map(p => p.id));
    const oldestTimestamp = lightPostsRef.current.reduce<number>(
      (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
      Number.POSITIVE_INFINITY,
    );

    console.log('[FEED DEBUG] prefetchNextPage:start', {
      cursor: lastRealPost.id,
      cursorTimestamp: lastRealPost.postedAt,
      existingCount: existingIds.size,
      oldestKnownTs: oldestTimestamp,
      timestamp: Date.now(),
    });

    repository
      .getLightPosts(PAGE_SIZE * 2, lastRealPost.id)
      .then(nextPosts => {
        const filtered = nextPosts.filter(isLightFeedPost);

        // DEBUG: log raw prefetch response
        console.log('[FEED DEBUG] prefetchNextPage:api-response', {
          receivedFromApi: filtered.length,
          ids: filtered.map(p => p.id),
          timestamps: filtered.map(p => p.postedAt),
          hasInternalDuplicates:
            filtered.length !== new Set(filtered.map(p => p.id)).size,
        });

        // Strict dedup: skip posts we already have OR that are not
        // strictly older than what we already loaded. The backend's
        // `after_post_id` is a soft cursor (it can return the same page
        // if the page size is small or the server normalises results),
        // so we enforce a hard "older than oldest known" filter here.
        const newPosts = filtered.filter(post => {
          if (existingIds.has(post.id)) return false;
          if (post.postedAt && oldestTimestamp !== Number.POSITIVE_INFINITY) {
            return post.postedAt < oldestTimestamp;
          }
          return true;
        });

        const droppedById = filtered.filter(p => existingIds.has(p.id));
        const droppedByTime = filtered.filter(
          p => !existingIds.has(p.id) && p.postedAt && oldestTimestamp !== Number.POSITIVE_INFINITY && p.postedAt >= oldestTimestamp,
        );
        console.log('[FEED DEBUG] prefetchNextPage:dedup', {
          raw: filtered.length,
          droppedById: droppedById.length,
          droppedByTime: droppedByTime.length,
          kept: newPosts.length,
          newIds: newPosts.map(p => p.id),
        });

        if (newPosts.length === 0) {
          hasReachedNetworkEndRef.current = true;
          prefetchBufferRef.current = null;
        } else {
          prefetchBufferRef.current = newPosts;
        }
      })
      .catch(err => {
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
    hasReachedNetworkEndRef.current = false;
    try {
      const freshPosts = (await repository.getLightPosts(PAGE_SIZE)).filter(
        isLightFeedPost,
      );

      // DEBUG: log initial page 1 result
      console.log('[FEED DEBUG] loadPosts:page1', {
        isPullToRefresh,
        requested: PAGE_SIZE,
        receivedFromApi: freshPosts.length,
        ids: freshPosts.map(p => p.id),
        timestamps: freshPosts.map(p => p.postedAt),
        uniqueIds: new Set(freshPosts.map(p => p.id)).size,
        timestamp: Date.now(),
      });

      commitFeedSources(freshPosts, videoPostsRef.current);
      scheduleVideoBuffer(freshPosts.length);

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
      setHasLoadedOnce(true);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [commitFeedSources, prefetchNextPage, scheduleVideoBuffer]);

  // ── Auto-recycle guard ────────────────────────────────────────────
  // When the server runs out of posts we reload from page 1 instead
  // of permanently stopping. This flag prevents double-recycling.
  const isRecyclingRef = useRef(false);

  const loadMorePosts = useCallback(async () => {
    const currentLightPosts = lightPostsRef.current;
    if (isLoading || isLoadingMore || currentLightPosts.length === 0) {
      return;
    }

    // DEBUG: snapshot current state when loadMore is called
    console.log('[FEED DEBUG] loadMorePosts:enter', {
      currentLightCount: currentLightPosts.length,
      currentVideoCount: videoPostsRef.current.length,
      bufferedLength: prefetchBufferRef.current?.length ?? 0,
      hasReachedEnd: hasReachedNetworkEndRef.current,
      oldestTimestamp: currentLightPosts.reduce<number>(
        (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
        Number.POSITIVE_INFINITY,
      ),
      firstLightId: currentLightPosts[0]?.id,
      lastLightId: currentLightPosts[currentLightPosts.length - 1]?.id,
      timestamp: Date.now(),
    });

    try {
      // ── Fast path: use prefetch buffer if available ──────────────
      const buffered = prefetchBufferRef.current;
      if (buffered && buffered.length > 0) {
        prefetchBufferRef.current = null; // Consume the buffer

        const existingIds = new Set(currentLightPosts.map(p => p.id));
        const newPosts = buffered.filter(p => !existingIds.has(p.id));

        // DEBUG: report buffer consumption
        console.log('[FEED DEBUG] loadMorePosts:fast-path', {
          bufferedCount: buffered.length,
          afterDedup: newPosts.length,
          droppedByIdFilter: buffered.length - newPosts.length,
          newIds: newPosts.map(p => p.id),
        });

        if (newPosts.length === 0) {
          hasReachedNetworkEndRef.current = true;
          // Don't set isAllLoaded — we'll auto-recycle below
        } else {
          // Split newPosts into light and video posts
          const newLight = newPosts.filter(isLightFeedPost);
          const newVideo = newPosts.filter((p): p is FeedVideoPost => p.kind === 'video');

          const mergedLight = [...currentLightPosts, ...newLight];
          const mergedVideo = [...videoPostsRef.current, ...newVideo];

          // DEBUG: log merge sizes BEFORE dedup
          console.log('[FEED DEBUG] loadMorePosts:fast-path-merge', {
            mergedLightCount: mergedLight.length,
            mergedVideoCount: mergedVideo.length,
            addedLight: newLight.length,
            addedVideo: newVideo.length,
          });

          commitFeedSources(mergedLight, mergedVideo);
          scheduleVideoBuffer(mergedLight.length);
          setTimeout(() => prefetchNextPage(lightPostsRef.current), 0);
          return;
        }
      }

      // ── Auto-recycle: server ran out → reload from page 1 ───────
      if (hasReachedNetworkEndRef.current) {
        if (isRecyclingRef.current) return;
        isRecyclingRef.current = true;

        // Brief delay so we don't spam the API on fast scrolls
        await new Promise<void>(resolve => setTimeout(resolve, 500));

        // Reset state and reload fresh
        hasReachedNetworkEndRef.current = false;
        prefetchBufferRef.current = null;
        isRecyclingRef.current = false;

        setIsLoadingMore(true);
        try {
          const freshPosts = (await repository.getLightPosts(PAGE_SIZE)).filter(
            isLightFeedPost,
          );
          if (freshPosts.length > 0) {
            commitFeedSources(freshPosts, videoPostsRef.current);
            scheduleVideoBuffer(freshPosts.length);
            if (freshPosts.length >= PAGE_SIZE) {
              prefetchNextPage(freshPosts);
            }
          }
        } finally {
          setIsLoadingMore(false);
        }
        return;
      }

      // ── Slow path: no buffer → fetch from network ───────────────
      const lastRealPost = [...currentLightPosts].reverse().find(p => p.kind !== 'ad');
      if (!lastRealPost) {
        return;
      }

      setIsLoadingMore(true);
      setError(null);

      // Request 2x page size so we can still fill PAGE_SIZE posts after
      // the strict "must be older than what we already have" filter.
      const olderPosts = (await repository.getLightPosts(PAGE_SIZE * 2, lastRealPost.id)).filter(
        isLightFeedPost,
      );

      // DEBUG: log raw API response BEFORE any dedup
      console.log('[FEED DEBUG] loadMorePosts:slow-path:api-response', {
        cursor: lastRealPost.id,
        requested: PAGE_SIZE * 2,
        receivedFromApi: olderPosts.length,
        ids: olderPosts.map(p => p.id),
        timestamps: olderPosts.map(p => p.postedAt),
        uniqueIdsInResponse: new Set(olderPosts.map(p => p.id)).size,
        anyDuplicatesInRawResponse:
          olderPosts.length !== new Set(olderPosts.map(p => p.id)).size,
      });

      const existingIds = new Set(currentLightPosts.map(p => p.id));
      const oldestTimestamp = currentLightPosts.reduce<number>(
        (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
        Number.POSITIVE_INFINITY,
      );

      // Strict dedup: drop posts we already have AND any post that
      // isn't strictly older than our oldest loaded post. This prevents
      // the server's "soft cursor" from returning overlapping pages.
      const newPosts = olderPosts.filter(post => {
        if (existingIds.has(post.id)) return false;
        if (post.postedAt && oldestTimestamp !== Number.POSITIVE_INFINITY) {
          return post.postedAt < oldestTimestamp;
        }
        return true;
      }).slice(0, PAGE_SIZE);

      // DEBUG: report dedup outcome
      const droppedById = olderPosts.filter(p => existingIds.has(p.id));
      const droppedByTime = olderPosts.filter(
        p => !existingIds.has(p.id) && p.postedAt && oldestTimestamp !== Number.POSITIVE_INFINITY && p.postedAt >= oldestTimestamp,
      );
      console.log('[FEED DEBUG] loadMorePosts:slow-path:dedup', {
        raw: olderPosts.length,
        afterIdFilter: olderPosts.length - droppedById.length,
        afterTimeFilter: olderPosts.length - droppedById.length - droppedByTime.length,
        finalNewPosts: newPosts.length,
        droppedById: droppedById.map(p => p.id),
        droppedByTime: droppedByTime.map(p => ({ id: p.id, ts: p.postedAt, oldest: oldestTimestamp })),
        oldestKnownTs: oldestTimestamp,
        newIds: newPosts.map(p => p.id),
      });

      if (newPosts.length === 0) {
        hasReachedNetworkEndRef.current = true;
        // Don't set isAllLoaded — auto-recycle will handle it on next call
      } else {
        const mergedLight = [...currentLightPosts, ...newPosts];
        const mergedVideo = videoPostsRef.current;

        commitFeedSources(mergedLight, mergedVideo);
        scheduleVideoBuffer(mergedLight.length);
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
    isLoading,
    isLoadingMore,
    prefetchNextPage,
    scheduleVideoBuffer,
  ]);

  useEffect(() => {
    // Delay feed load to avoid competing with other initial API calls
    // that mount at the same time (stories, current user, etc.)
    const timer = setTimeout(() => {
      loadPosts();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadPosts]);

  useEffect(() => {
    return () => {
      videoBufferTaskRef.current?.cancel();
    };
  }, []);

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
        if (post.id !== postId) return post;
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
    [updatePostEverywhere],
  );

  return {
    posts,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    isLoadingMore,
    isAllLoaded,
    hasLoadedOnce,
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
