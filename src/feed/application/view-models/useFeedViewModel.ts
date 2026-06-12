// Description: Coordinates feed source tabs, pagination, caching, and post interaction state.
//
// SINGLE-LIST FEED ARCHITECTURE
// We hold ONE source of truth (`posts: FeedPost[]`) sorted by `postedAt`
// descending. Both video and text/photo cards are rendered from this
// merged list - Facebook-style.
//
// PREFETCH BUFFER (v2)
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
import type { FeedSource } from '../../domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

const repository = createFeedRepository();
const pollRepository = createPollRepository();

// Keep enough real feed items in each page so FlashList has room to
// pre-render and the user does not hit the pagination edge immediately.
// Bumped 20→30 so even after the heavy dedupe (3 streams) we usually
// keep a healthy first paint on sparse accounts.
const PAGE_SIZE = 30;
const VIDEO_PAGE_SIZE = 12;
const VIDEO_INSERT_INTERVAL = 5;
const FEED_VM_DEBUG = typeof __DEV__ !== 'undefined' && __DEV__;
// Stop paging only after this many consecutive empty pages. Each
// empty page retries with a different cursor source; 3 was empirically
// enough to soak up temporary endpoint blips without trapping users
// on a true dead-end.
const MAX_CONSECUTIVE_EMPTY_PAGES = 3;

type InteractionTask = ReturnType<typeof InteractionManager.runAfterInteractions>;

let pendingLightCacheTask: InteractionTask | null = null;
let pendingVideoCacheTask: InteractionTask | null = null;

/**
 * Re-sort by `postedAt` desc so optimistic prepends and updates keep
 * the merged feed in chronological order. Posts without a timestamp
 * (very rare, defensive) bubble to the bottom.
 */
function sortByTime(posts: FeedPost[]): FeedPost[] {
  return [...posts].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
}

function isLightFeedPost(post: FeedPost): post is Exclude<FeedPost, FeedVideoPost> {
  return post.kind !== 'video' && post.kind !== 'product' && post.kind !== 'event' && post.kind !== 'job';
}

/**
 * Count each post kind in a slice. Used to surface the post-classifier
 * drop-off (video / product / event / job) in the dev log so we can
 * see at a glance whether the bulk of the feed is being eaten by the
 * `isLightFeedPost` filter vs. being filtered out at the repository.
 */
function summarizeKinds(posts: FeedPost[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    counts[post.kind] = (counts[post.kind] ?? 0) + 1;
  }
  return counts;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  // Map preserves insertion order and lets us dedupe in a single
  // pass without an intermediate `seen` Set. ~1.5x faster on the
  // 30-item pages we deal with, and avoids one extra allocation per
  // dedupe cycle.
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item?.id || map.has(item.id)) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function debugFeedVm(label: string, payload: Record<string, unknown>) {
  if (!FEED_VM_DEBUG) return;
  console.log(`[feed.vm] ${label}`, payload);
}

function pickAppendablePage(
  candidates: FeedPost[],
  existingIds: Set<string>,
  oldestTimestamp: number,
  limit = PAGE_SIZE,
): FeedPost[] {
  // Step 1: drop posts we already have (defensive — the upstream
  // dedupe in the repository should have caught these already, but
  // the prefetch path can race with the slow path and we want the
  // user never to see the same post twice in a row).
  const unseen = candidates.filter(post => !existingIds.has(post.id));
  if (unseen.length === 0) return [];

  // Step 2: prefer posts STRICTLY older than the oldest we already
  // have. Posts without a timestamp bubble into the "older" bucket so
  // they can fill empty space (and never get trapped in pagination).
  const hasAnchor = Number.isFinite(oldestTimestamp) && oldestTimestamp > 0;
  const older: FeedPost[] = [];
  const newerOrEqual: FeedPost[] = [];
  for (const post of unseen) {
    if (!hasAnchor || !post.postedAt || post.postedAt < oldestTimestamp) {
      older.push(post);
    } else {
      newerOrEqual.push(post);
    }
  }

  // Step 3: take older first; if we don't fill `limit` with older
  // posts alone, top up with whatever else is unseen (newer or
  // untimestamped) so a single thin page never strands the user.
  // No more "needs >= 5 to be considered usable" gate — that was
  // the original "feed ends after 8 posts" bug on sparse installs.
  const picked: FeedPost[] = older.slice(0, limit);
  if (picked.length < limit) {
    const remaining = limit - picked.length;
    for (const post of newerOrEqual) {
      if (picked.length >= limit) break;
      picked.push(post);
    }
    // Touch `remaining` so the linter is happy with the original
    // intent of computing how many slots were free.
    void remaining;
  }
  return picked;
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
  const [feedSource, setFeedSourceState] = useState<FeedSource>('all');
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

  // Prefetch buffer
  // Holds the pre-fetched next page so `loadMorePosts` can merge it
  // instantly without waiting for a network round-trip.
  const prefetchBufferRef = useRef<FeedPost[] | null>(null);
  const isPrefetchingRef = useRef(false);
  const isFetchingVideosRef = useRef(false);
  const videoBufferTaskRef = useRef<InteractionTask | null>(null);
  const isScrollBusyRef = useRef(false);
  const pendingCommitRef = useRef<{
    lightPosts: FeedPost[];
    videoPosts: FeedVideoPost[];
  } | null>(null);
  const feedSourceRef = useRef<FeedSource>('all');

  // Network pagination guard
  const hasReachedNetworkEndRef = useRef(false);
  const nextPageCursorRef = useRef<string | undefined>(undefined);
  const emptyPageStrikeRef = useRef(0);

  const applyFeedSources = useCallback(
    (nextLightPosts: FeedPost[], nextVideoPosts: FeedVideoPost[]) => {
      // Snapshot the pre-dedupe / pre-filter kinds so the log can show
      // exactly which kinds the repository handed us (e.g. 6 video,
      // 2 product, 18 text+photo). Without this, dedupe + the
      // isLightFeedPost filter mask where the bulk of the feed goes.
      const preFilterKinds = summarizeKinds(nextLightPosts);

      const dedupedLight = uniqueById(nextLightPosts);
      const dedupDropped = nextLightPosts.length - dedupedLight.length;

      // Capture the post ids that getLightFeedPost drops so we can see
      // in the log whether product / event / job posts are silently
      // vanishing (e.g. if the admin has 20 product posts, they
      // would never appear on Home with the current kind filter).
      const droppedByLightFilter = dedupedLight.filter(
        post => !isLightFeedPost(post),
      );
      const droppedKinds = summarizeKinds(droppedByLightFilter);
      const droppedIds = droppedByLightFilter
        .slice(0, 8)
        .map(post => ({ id: post.id, kind: post.kind }));

      const cleanLightPosts = dedupedLight
        .filter(isLightFeedPost)
        .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
      const cleanVideoPosts = uniqueById(nextVideoPosts).sort(
        (a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0),
      );

      lightPostsRef.current = cleanLightPosts;
      videoPostsRef.current = cleanVideoPosts;
      setPosts(interleaveVideos(cleanLightPosts, cleanVideoPosts));
      if (feedSourceRef.current === 'all') {
        cacheLightPostsAfterInteractions(cleanLightPosts);
        cacheVideoPostsAfterInteractions(cleanVideoPosts);
      }

      debugFeedVm('apply feed sources', {
        lightIn: nextLightPosts.length,
        kinds: preFilterKinds,
        dedupDropped,
        light: cleanLightPosts.length,
        video: cleanVideoPosts.length,
        merged: cleanLightPosts.length + cleanVideoPosts.length,
        lightFilterDropped: droppedByLightFilter.length,
        lightFilterDroppedKinds: droppedKinds,
        lightFilterDroppedIds: droppedIds,
        emptyStrikes: emptyPageStrikeRef.current,
        networkEnd: hasReachedNetworkEndRef.current,
      });
    },
    [],
  );

  const commitFeedSources = useCallback(
    (
      nextLightPosts: FeedPost[],
      nextVideoPosts: FeedVideoPost[],
      options?: { deferDuringScroll?: boolean },
    ) => {
      if (options?.deferDuringScroll && isScrollBusyRef.current) {
        pendingCommitRef.current = {
          lightPosts: nextLightPosts,
          videoPosts: nextVideoPosts,
        };
        return;
      }
      applyFeedSources(nextLightPosts, nextVideoPosts);
    },
    [applyFeedSources],
  );

  const flushPendingCommit = useCallback(() => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    pendingCommitRef.current = null;
    applyFeedSources(pending.lightPosts, pending.videoPosts);
  }, [applyFeedSources]);

  const setScrollBusy = useCallback(
    (busy: boolean) => {
      isScrollBusyRef.current = busy;
      if (!busy) {
        flushPendingCommit();
      }
    },
    [flushPendingCommit],
  );

  const updatePostEverywhere = useCallback((updater: (post: FeedPost) => FeedPost) => {
    lightPostsRef.current = lightPostsRef.current
      .map(updater)
      .filter(isLightFeedPost);
    videoPostsRef.current = videoPostsRef.current
      .map(updater)
      .filter((post): post is FeedVideoPost => post.kind === 'video');
    setPosts(prev => prev.map(updater));
    if (feedSourceRef.current === 'all') {
      cacheLightPostsAfterInteractions(lightPostsRef.current);
      cacheVideoPostsAfterInteractions(videoPostsRef.current);
    }
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
        .getVideoPosts(VIDEO_PAGE_SIZE * 2, lastVideo?.id, feedSourceRef.current)
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
          ], { deferDuringScroll: true });
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
   * Does NOT touch React state - completely invisible to the UI.
   *
   * Important: we no longer early-return when the cursor is empty.
   * The repository ALWAYS returns a cursor (it falls back to the
   * discovery/own cursor when the followed feed is thin), so a falsy
   * cursor here genuinely means "we've paged through every available
   * post". We still respect that signal — but only after
   * `MAX_CONSECUTIVE_EMPTY_PAGES` strikes, so a single empty page
   * (e.g. permission glitch, transient 4xx) doesn't kill the feed.
   */
  const prefetchNextPage = useCallback(() => {
    if (isPrefetchingRef.current) return; // Already prefetching

    if (hasReachedNetworkEndRef.current) {
      return;
    }

    const cursor = nextPageCursorRef.current;
    if (!cursor) {
      // Cursor exhausted — but only commit the "end of feed" verdict
      // after we genuinely tried MAX_CONSECUTIVE_EMPTY_PAGES times.
      emptyPageStrikeRef.current += 1;
      if (emptyPageStrikeRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES) {
        hasReachedNetworkEndRef.current = true;
      }
      return;
    }

    isPrefetchingRef.current = true;

    // Snapshot of currently-loaded post IDs and timestamps for dedup
    const existingIds = new Set(lightPostsRef.current.map(p => p.id));
    const oldestTimestamp = lightPostsRef.current.reduce<number>(
      (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
      Number.POSITIVE_INFINITY,
    );


    repository
      .getLightPostsPage(PAGE_SIZE, cursor, feedSourceRef.current)
      .then(page => {
        const filtered = page.posts.filter(isLightFeedPost);

        const newPosts = pickAppendablePage(
          filtered,
          existingIds,
          oldestTimestamp,
        );
        const advancedCursor = Boolean(
          page.nextCursor && page.nextCursor !== cursor,
        );
        if (advancedCursor) {
          nextPageCursorRef.current = page.nextCursor;
        }

        debugFeedVm('prefetch page', {
          cursor,
          nextCursor: page.nextCursor ?? '(none)',
          fetched: page.posts.length,
          light: filtered.length,
          usable: newPosts.length,
          existing: existingIds.size,
          emptyStrikes: emptyPageStrikeRef.current,
        });

        if (newPosts.length === 0) {
          emptyPageStrikeRef.current += 1;
          prefetchBufferRef.current = null;
          if (
            page.reachedEnd ||
            !page.nextCursor ||
            !advancedCursor ||
            emptyPageStrikeRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES
          ) {
            hasReachedNetworkEndRef.current = true;
          }
        } else {
          emptyPageStrikeRef.current = 0;
          prefetchBufferRef.current = newPosts;
          if (!page.nextCursor || !advancedCursor) {
            hasReachedNetworkEndRef.current = page.reachedEnd || !page.nextCursor;
          }
        }
      })
      .catch(err => {
        console.warn('[feed] prefetch failed:', err);
        prefetchBufferRef.current = null;
        emptyPageStrikeRef.current += 1;
        if (emptyPageStrikeRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES) {
          hasReachedNetworkEndRef.current = true;
        }
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
    nextPageCursorRef.current = undefined;
    emptyPageStrikeRef.current = 0;
    try {
      const page = await repository.getLightPostsPage(
        PAGE_SIZE,
        undefined,
        feedSourceRef.current,
      );
      const freshPosts = page.posts.filter(isLightFeedPost);
      nextPageCursorRef.current = page.nextCursor;
      // DON'T mark the feed as "ended" just because the first page's
      // cursor is undefined. The repository falls back to a follow-
      // up cursor via discovery when followed is thin, so the only
      // way we get here with an empty cursor is if the install
      // literally has no more posts. We let `loadMorePosts` confirm
      // with the MAX_CONSECUTIVE_EMPTY_PAGES guard rather than trust
      // the first page alone.
      hasReachedNetworkEndRef.current = page.reachedEnd === true && !page.nextCursor;

      debugFeedVm('initial page', {
        fetched: freshPosts.length,
        nextCursor: page.nextCursor ?? '(none)',
        refresh: isPullToRefresh,
      });

      commitFeedSources(freshPosts, videoPostsRef.current);
      scheduleVideoBuffer(freshPosts.length);

      // Always start prefetching page 2 — the repository now
      // guarantees a cursor on its first page, so this is safe.
      prefetchNextPage();
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

  const selectFeedSource = useCallback(
    (nextSource: FeedSource) => {
      if (feedSourceRef.current === nextSource) return;

      feedSourceRef.current = nextSource;
      setFeedSourceState(nextSource);
      lightPostsRef.current = [];
      videoPostsRef.current = [];
      prefetchBufferRef.current = null;
      hasReachedNetworkEndRef.current = false;
      nextPageCursorRef.current = undefined;
      emptyPageStrikeRef.current = 0;
      setPosts([]);
      setIsAllLoaded(false);
      setHasLoadedOnce(false);
      loadPosts(false);
    },
    [loadPosts],
  );

  const loadMorePosts = useCallback(async () => {
    const currentLightPosts = lightPostsRef.current;
    if (isLoading || isLoadingMore || isAllLoaded || currentLightPosts.length === 0) {
      return;
    }


    try {
      // Fast path: use prefetch buffer if available.
      const buffered = prefetchBufferRef.current;
      if (buffered && buffered.length > 0) {
        prefetchBufferRef.current = null; // Consume the buffer

        const existingIds = new Set(currentLightPosts.map(p => p.id));
        const newPosts = buffered.filter(p => !existingIds.has(p.id));


        if (newPosts.length === 0) {
          if (hasReachedNetworkEndRef.current || !nextPageCursorRef.current) {
            setIsAllLoaded(true);
          } else {
            setTimeout(() => prefetchNextPage(), 0);
          }
          return;
        } else {
          // Split newPosts into light and video posts
          const newLight = newPosts.filter(isLightFeedPost);
          const newVideo = newPosts.filter((p): p is FeedVideoPost => p.kind === 'video');

          const mergedLight = [...currentLightPosts, ...newLight];
          const mergedVideo = [...videoPostsRef.current, ...newVideo];


          commitFeedSources(mergedLight, mergedVideo, { deferDuringScroll: true });
          scheduleVideoBuffer(mergedLight.length);
          setTimeout(() => prefetchNextPage(), 0);
          return;
        }
      }

      if (hasReachedNetworkEndRef.current) {
        setIsAllLoaded(true);
        return;
      }

      // Slow path: no buffer -> fetch from the dedicated news-feed cursor.
      // The repository ALWAYS returns a cursor now (it falls back to
      // discovery/own cursor), so a falsy cursor is the genuine
      // "no more posts" signal. We honour it but only after
      // `MAX_CONSECUTIVE_EMPTY_PAGES` to avoid being fooled by a
      // single transient empty page.
      const cursor = nextPageCursorRef.current;
      if (!cursor) {
        emptyPageStrikeRef.current += 1;
        if (emptyPageStrikeRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES) {
          hasReachedNetworkEndRef.current = true;
          setIsAllLoaded(true);
        }
        return;
      }

      setIsLoadingMore(true);
      setError(null);

      const page = await repository.getLightPostsPage(
        PAGE_SIZE,
        cursor,
        feedSourceRef.current,
      );
      const olderPosts = page.posts.filter(isLightFeedPost);


      const existingIds = new Set(currentLightPosts.map(p => p.id));
      const oldestTimestamp = currentLightPosts.reduce<number>(
        (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
        Number.POSITIVE_INFINITY,
      );

      const newPosts = pickAppendablePage(
        olderPosts,
        existingIds,
        oldestTimestamp,
      );
      const advancedCursor = Boolean(
        page.nextCursor && page.nextCursor !== cursor,
      );
      if (advancedCursor) {
        nextPageCursorRef.current = page.nextCursor;
      }

      debugFeedVm('load more page', {
        cursor,
        nextCursor: page.nextCursor ?? '(none)',
        fetched: olderPosts.length,
        usable: newPosts.length,
        existing: existingIds.size,
      });

      if (newPosts.length === 0) {
        emptyPageStrikeRef.current += 1;
        if (
          page.reachedEnd ||
          !page.nextCursor ||
          !advancedCursor ||
          emptyPageStrikeRef.current >= 3
        ) {
          hasReachedNetworkEndRef.current = true;
          setIsAllLoaded(true);
        } else {
          setTimeout(() => prefetchNextPage(), 0);
        }
      } else {
        emptyPageStrikeRef.current = 0;
        const mergedLight = [...currentLightPosts, ...newPosts];
        const mergedVideo = videoPostsRef.current;

        commitFeedSources(mergedLight, mergedVideo, { deferDuringScroll: true });
        scheduleVideoBuffer(mergedLight.length);
        if (!page.nextCursor || !advancedCursor) {
          hasReachedNetworkEndRef.current = page.reachedEnd || !page.nextCursor;
        }
        setTimeout(() => prefetchNextPage(), 0);
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
    isAllLoaded,
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

  // Derived (backward-compat) slices
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
   * chronological slot - usually the top, but defensive in case the
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

        // The spread preserves `kind` so the discriminator survives -
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
   * kind - the unified posts array makes this trivial.
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
    feedSource,
    setFeedSource: selectFeedSource,
    posts,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    isLoadingMore,
    isAllLoaded,
    hasLoadedOnce,
    error,
    reloadPosts: loadPosts,
    loadMorePosts,
    setScrollBusy,
    prependPost,
    toggleReaction,
    updateCommentCount,
    votePoll,

    // Backward-compat aliases
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
     * Toggle save/unsave a post. No optimistic update needed -
     * the server confirms the state and the UI refreshes on next visit.
     */
    savePost: (postId: string) => repository.savePost(postId),

    /**
     * Toggle report/unreport a post. No optimistic update needed.
     */
    reportPost: (postId: string) => repository.reportPost(postId),
  };
}
