// Description: Coordinates feed source tabs, pagination, caching, and post interaction state.
//
// SINGLE-LIST FEED ARCHITECTURE
// We hold ONE source of truth (`posts: FeedPost[]`) sorted by `postedAt`
// descending. Both video and text/photo cards are rendered from this
// merged list - Facebook-style.
//
// PREFETCH BUFFER (v3)
// Background pagination keeps a short ready queue (roughly three small
// pages) and drains it in render-sized chunks. This means a fast fling can
// reveal rows that are already complete while the next cursor is still on
// the wire, instead of waiting for one large page to finish.
//
// Backward-compat exports `videoPosts` and `textPosts` as DERIVED
// (`useMemo`) slices so existing UI code that consumed them keeps
// working while the home screen is being refactored. Once the UI uses
// `posts` directly, those derived exports can be deleted.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, InteractionManager } from 'react-native';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import type {
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
  FeedPollPost,
  PostPrivacy,
} from '../../domain/types/feed.types';
import type {
  FeedSource,
  ReportPostInput,
} from '../../domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { isPageFeedPublisher } from '../../domain/policies/feedPublisherIdentity';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  hiddenPostsStorage,
  LOCAL_POST_HIDDEN_EVENT,
} from '../../infrastructure/storage/hiddenPostsStorage';
import {
  endedLivePostsStorage,
  LOCAL_LIVE_ENDED_EVENT,
} from '../../../live/infrastructure/storage/endedLivePostsStorage';
import {
  mergeFeedPrefetchQueue,
  takeFeedPrefetchBatch,
} from './feedPaginationBuffer';
import { canAppendFeedPageWithoutResort } from './feedPageOrdering';
import {
  createFeedNetworkPolicy,
  getFeedPrefetchRetryDelay,
} from './feedNetworkPolicy';
import {
  applyFeedPostCaptionEdit,
  applyLocalPostCaptionEdit,
  applyLocalPostCaptionEdits,
} from '../editing/postCaptionEdit';
import { editPostWithLocalFallback } from '../editing/editPostWithLocalFallback';
import { postEditedEvents } from '../events/postEditedEvents';
import { markSharedLivePreviewEnded } from '../sharing/sharedPostPreview';

const repository = createFeedRepository();
const pollRepository = createPollRepository();

function filterLocallyHiddenPosts<T extends FeedPost>(posts: T[]): T[] {
  const currentUserId = sessionStorage.getSession()?.userId;
  const visiblePosts = hiddenPostsStorage.filterVisiblePosts(
    posts,
    currentUserId,
  );
  const endedLivePostIds = endedLivePostsStorage.getEndedPostIds(currentUserId);
  const postsWithEndedLiveShares = visiblePosts.map(post => {
    const sourcePostId = String(post.sharedPostId ?? '').trim();
    if (!sourcePostId || !endedLivePostIds.has(sourcePostId)) return post;
    return markSharedLivePreviewEnded(post, sourcePostId) as T;
  });
  const activePosts = endedLivePostsStorage.filterVisiblePosts(
    postsWithEndedLiveShares,
    currentUserId,
  );
  return applyLocalPostCaptionEdits(
    activePosts as Array<T & { caption?: string; mentionNames?: string[] }>,
  ) as T[];
}

// Home pagination is id-cursored: first page = newest posts, every
// subsequent page asks for posts older than the smallest id already shown.
// Keep the visible page at 10 items so load-more is predictable and avoids
// skipping older posts that live in the same raw API window.
const PAGE_SIZE = 10;
const HOME_VISIBLE_WARM_TARGET = 20;
const FEED_CACHE_RUNWAY_LIMIT = 30;
// A load-more page must resolve quickly. Sparse cursor windows are walked by
// the background refill loop instead of holding one visible footer through
// several sequential repository scans.
const PAGINATION_SCAN_PAGES = 1;
const PREFETCH_REFILL_DELAY_MS = 120;
const WARM_VISIBLE_FILL_DELAY_MS = 80;
const EMPTY_PAGE_RETRY_DELAY_MS = 180;
const CONSTRAINED_REVEAL_DELAY_MS = 60;
const FEED_VM_DEBUG = typeof __DEV__ !== 'undefined' && __DEV__;
// Stop paging only after this many consecutive empty pages. Each
// empty page retries with a different cursor source; 3 was empirically
// enough to soak up temporary endpoint blips without trapping users
// on a true dead-end.
const MAX_CONSECUTIVE_EMPTY_PAGES = 3;

export type FeedLoadMoreOutcome =
  | 'appended'
  | 'terminal'
  | 'retryable'
  | 'stale';

type InteractionTask = ReturnType<
  typeof InteractionManager.runAfterInteractions
>;

let pendingLightCacheTask: InteractionTask | null = null;

/**
 * Re-sort by `postedAt` desc so optimistic prepends and updates keep
 * the merged feed in chronological order. Posts without a timestamp
 * (very rare, defensive) bubble to the bottom.
 */
function sortByTime(posts: FeedPost[]): FeedPost[] {
  return [...posts].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
}

function isTimelineFeedPost(post: FeedPost) {
  return post.kind !== 'product' && post.kind !== 'event';
}

/**
 * Count each post kind in a slice. Used to surface the post-classifier
 * drop-off (video / product / event / job) in the dev log so we can
 * see at a glance whether the bulk of the feed is being eaten by the
 * timeline filter vs. being filtered out at the repository.
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

function cacheLightPostsAfterInteractions(
  posts: FeedPost[],
  pagination: { nextCursor?: string; reachedEnd: boolean },
) {
  const wasTruncated = posts.length > FEED_CACHE_RUNWAY_LIMIT;
  const snapshot = posts.slice(0, FEED_CACHE_RUNWAY_LIMIT);
  const ownerId = sessionStorage.getSession()?.userId;
  pendingLightCacheTask?.cancel();
  pendingLightCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedPostsSnapshot(
      {
        posts: snapshot,
        nextCursor: wasTruncated ? undefined : pagination.nextCursor,
        reachedEnd: wasTruncated ? false : pagination.reachedEnd,
      },
      ownerId,
    );
    pendingLightCacheTask = null;
  });
}

function getPollTotalVotes(options: FeedPollPost['options']) {
  const apiTotal = Math.max(
    0,
    ...options.map(option => Number(option.all) || 0),
  );
  if (apiTotal > 0) return apiTotal;
  return options.reduce(
    (sum, option) => sum + (Number(option.optionVotes) || 0),
    0,
  );
}

export function useFeedViewModel() {
  const [feedSource, setFeedSourceState] = useState<FeedSource | 'photos'>(
    'all',
  );
  const initialPostsCache = useMemo(
    () => feedCacheStorage.getCachedPostsSnapshot(),
    [],
  );
  const initialCachedTimelinePosts = useMemo(
    () =>
      sortByTime(
        uniqueById(
          filterLocallyHiddenPosts([
            ...(initialPostsCache?.posts ?? []),
            // One-release cache migration: older builds stored Feed videos in
            // a separate bucket. Fold them into the canonical timeline once.
            ...feedCacheStorage.getCachedVideoPosts(),
          ]),
        ).filter(isTimelineFeedPost),
      ),
    [initialPostsCache],
  );
  const [posts, setPosts] = useState<FeedPost[]>(initialCachedTimelinePosts);
  const mergedPostsRef = useRef<FeedPost[]>(posts);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // React state updates are asynchronous; this ref closes the tiny window in
  // which two end-of-list callbacks can enter `loadMorePosts` in the same
  // tick before `isLoadingMore` has re-rendered.
  const isLoadingMoreRef = useRef(false);
  const isLoadingPostsRef = useRef(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const lightPostsRef = useRef<FeedPost[]>(initialCachedTimelinePosts);
  const videoPostsRef = useRef<FeedVideoPost[]>(
    initialCachedTimelinePosts.filter(
      (post): post is FeedVideoPost => post.kind === 'video',
    ),
  );

  // Ready queue of prefetched older posts. Unlike the old single-page buffer,
  // this can stay 2-3 small pages ahead and is drained in short render batches.
  const prefetchBufferRef = useRef<FeedPost[]>([]);
  // Keep the in-flight request itself so load-more can await and consume it
  // instead of issuing a second request for the same cursor while prefetch is
  // still running. This is especially important because the UI asks for the
  // next page before the current ten-item page is exhausted.
  const prefetchPromiseRef = useRef<Promise<void> | null>(null);
  const prefetchCursorRef = useRef<string | undefined>(undefined);
  const prefetchNextPageRef = useRef<() => Promise<void> | null>(() => null);
  const schedulePrefetchRefillRef = useRef<(delayMs?: number) => void>(
    () => undefined,
  );
  const prefetchRefillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prefetchRefillDeadlineRef = useRef(0);
  const prefetchRetryAttemptRef = useRef(0);
  const isDisposedRef = useRef(false);
  const warmVisibleFillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const progressiveRevealTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const progressiveRevealRemainingRef = useRef(0);
  const loadMorePostsRef = useRef<() => Promise<FeedLoadMoreOutcome>>(() =>
    Promise.resolve('retryable'),
  );
  const scheduleProgressiveRevealRef = useRef<() => void>(() => undefined);
  const paginationNetworkPolicyRef = useRef(createFeedNetworkPolicy());
  const paginationGenerationRef = useRef(0);
  const isScrollBusyRef = useRef(false);
  const isFeedSurfaceActiveRef = useRef(true);
  const hasFeedScrolledSinceLoadRef = useRef(false);
  const pendingCommitRef = useRef<{ timelinePosts: FeedPost[] } | null>(null);
  const feedSourceRef = useRef<FeedSource>('all');
  const trackedImpressionIdsRef = useRef<Set<string>>(new Set());
  const pendingImpressionIdsRef = useRef<Set<string>>(new Set());
  const impressionFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const impressionFlushTaskRef = useRef<InteractionTask | null>(null);

  // Network pagination guard
  const hasReachedNetworkEndRef = useRef(
    initialPostsCache?.reachedEnd ?? false,
  );
  const nextPageCursorRef = useRef<string | undefined>(
    initialPostsCache?.nextCursor,
  );
  const emptyPageStrikeRef = useRef(0);

  const fetchLightPostsPage = useCallback(
    async (
      limit: number,
      afterPostId: string | undefined,
      source: FeedSource,
      maxScanPages?: number,
    ) => {
      const requestStartedAt = Date.now();
      try {
        const page = await repository.getLightPostsPage(
          limit,
          afterPostId,
          source,
          maxScanPages,
        );
        paginationNetworkPolicyRef.current.recordSuccess(
          Date.now() - requestStartedAt,
        );
        return page;
      } catch (caught) {
        paginationNetworkPolicyRef.current.recordFailure();
        throw caught;
      }
    },
    [],
  );

  const clearProgressiveReveal = useCallback(() => {
    if (progressiveRevealTimerRef.current) {
      clearTimeout(progressiveRevealTimerRef.current);
      progressiveRevealTimerRef.current = null;
    }
    progressiveRevealRemainingRef.current = 0;
  }, []);

  const scheduleWarmVisibleFill = useCallback(
    (delayMs = WARM_VISIBLE_FILL_DELAY_MS) => {
      if (
        !isFeedSurfaceActiveRef.current ||
        isScrollBusyRef.current ||
        warmVisibleFillTimerRef.current ||
        lightPostsRef.current.length >= HOME_VISIBLE_WARM_TARGET ||
        prefetchBufferRef.current.length === 0
      ) {
        return;
      }

      warmVisibleFillTimerRef.current = setTimeout(() => {
        warmVisibleFillTimerRef.current = null;
          if (
            !isFeedSurfaceActiveRef.current ||
            isScrollBusyRef.current ||
            isLoadingMoreRef.current ||
          lightPostsRef.current.length >= HOME_VISIBLE_WARM_TARGET ||
          prefetchBufferRef.current.length === 0
        ) {
          return;
        }
        void loadMorePostsRef.current();
      }, delayMs);
    },
    [],
  );

  const applyFeedSources = useCallback(
    (nextTimelinePosts: FeedPost[]) => {
      const preFilterKinds = summarizeKinds(nextTimelinePosts);
      const visiblePosts = filterLocallyHiddenPosts(nextTimelinePosts);
      const dedupedPosts = uniqueById(visiblePosts);
      const dedupDropped = nextTimelinePosts.length - dedupedPosts.length;
      const droppedByTimelineFilter = dedupedPosts.filter(
        post => !isTimelineFeedPost(post),
      );
      const droppedKinds = summarizeKinds(droppedByTimelineFilter);
      const droppedIds = droppedByTimelineFilter
        .slice(0, 8)
        .map(post => ({ id: post.id, kind: post.kind }));
      const timelinePosts = sortByTime(
        dedupedPosts.filter(isTimelineFeedPost),
      );

      lightPostsRef.current = timelinePosts;
      videoPostsRef.current = timelinePosts.filter(
        (post): post is FeedVideoPost => post.kind === 'video',
      );
      mergedPostsRef.current = timelinePosts;
      setPosts(timelinePosts);
      if (feedSourceRef.current === 'all') {
        cacheLightPostsAfterInteractions(timelinePosts, {
          nextCursor: nextPageCursorRef.current,
          reachedEnd: hasReachedNetworkEndRef.current,
        });
      }

      debugFeedVm('apply feed sources', {
        timelineIn: nextTimelinePosts.length,
        kinds: preFilterKinds,
        dedupDropped,
        timeline: timelinePosts.length,
        video: videoPostsRef.current.length,
        timelineFilterDropped: droppedByTimelineFilter.length,
        timelineFilterDroppedKinds: droppedKinds,
        timelineFilterDroppedIds: droppedIds,
        emptyStrikes: emptyPageStrikeRef.current,
        networkEnd: hasReachedNetworkEndRef.current,
      });
    },
    [],
  );

  const commitFeedSources = useCallback(
    (nextTimelinePosts: FeedPost[]) => {
      if (
        (isScrollBusyRef.current || !isFeedSurfaceActiveRef.current) &&
        mergedPostsRef.current.length > 0
      ) {
        pendingCommitRef.current = {
          timelinePosts: sortByTime(uniqueById(nextTimelinePosts)),
        };
        return;
      }
      applyFeedSources(nextTimelinePosts);
    },
    [applyFeedSources],
  );

  const appendLightPosts = useCallback(
    (candidates: FeedPost[]) => {
      const shouldDeferCommit =
        isScrollBusyRef.current || !isFeedSurfaceActiveRef.current;
      const baseTimelinePosts =
        shouldDeferCommit && pendingCommitRef.current
          ? pendingCommitRef.current.timelinePosts
          : lightPostsRef.current;
      const existingLightIds = new Set(
        baseTimelinePosts.map(post => post.id),
      );
      const appendablePosts = sortByTime(
        uniqueById(
          filterLocallyHiddenPosts(candidates).filter(isTimelineFeedPost),
        ).filter(post => !existingLightIds.has(post.id)),
      );
      if (appendablePosts.length === 0) return [];

      if (shouldDeferCommit) {
        commitFeedSources([...baseTimelinePosts, ...appendablePosts]);
        return appendablePosts;
      }

      if (
        !canAppendFeedPageWithoutResort(lightPostsRef.current, appendablePosts)
      ) {
        // A legacy/public row can be much older than the recommendation
        // cursor. If a later recommended page is newer than that tail row,
        // fall back to the chronological merge instead of appending it out of
        // order. The common strictly-older path below remains allocation-light.
        applyFeedSources([...lightPostsRef.current, ...appendablePosts]);
        return appendablePosts;
      }

      // Cursor pages that are proven older can be appended directly. This
      // avoids sorting and rebuilding the complete merged feed on every
      // fling-time reveal while keeping stable item keys.
      lightPostsRef.current = [...lightPostsRef.current, ...appendablePosts];
      videoPostsRef.current = lightPostsRef.current.filter(
        (post): post is FeedVideoPost => post.kind === 'video',
      );

      const renderedIds = new Set(mergedPostsRef.current.map(post => post.id));
      const appendableRenderedPosts = appendablePosts.filter(
        post => !renderedIds.has(post.id),
      );
      if (appendableRenderedPosts.length > 0) {
        const nextMergedPosts = [
          ...mergedPostsRef.current,
          ...appendableRenderedPosts,
        ];
        mergedPostsRef.current = nextMergedPosts;
        setPosts(nextMergedPosts);
      }

      if (feedSourceRef.current === 'all') {
        cacheLightPostsAfterInteractions(lightPostsRef.current, {
          nextCursor: nextPageCursorRef.current,
          reachedEnd: hasReachedNetworkEndRef.current,
        });
      }
      return appendablePosts;
    },
    [applyFeedSources, commitFeedSources],
  );

  const flushPendingCommit = useCallback(() => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    pendingCommitRef.current = null;
    applyFeedSources(pending.timelinePosts);
  }, [applyFeedSources]);

  const scheduleImpressionFlush = useCallback((delayMs = 900) => {
    if (impressionFlushTimerRef.current) return;

    impressionFlushTimerRef.current = setTimeout(() => {
      impressionFlushTimerRef.current = null;

      if (isScrollBusyRef.current) {
        scheduleImpressionFlush(delayMs);
        return;
      }

      const postIds = Array.from(pendingImpressionIdsRef.current);
      if (postIds.length === 0) return;

      pendingImpressionIdsRef.current.clear();
      impressionFlushTaskRef.current?.cancel();
      impressionFlushTaskRef.current = InteractionManager.runAfterInteractions(
        () => {
          impressionFlushTaskRef.current = null;
          for (const postId of postIds) {
            void repository.recordRecommendationEvent({
              event: 'impression',
              postId,
            });
          }
        },
      );
    }, delayMs);
  }, []);

  const setScrollBusy = useCallback(
    (busy: boolean) => {
      isFeedSurfaceActiveRef.current = true;
      isScrollBusyRef.current = busy;
      if (busy) hasFeedScrolledSinceLoadRef.current = true;
      if (!busy) {
        flushPendingCommit();
        scheduleImpressionFlush(150);
        scheduleWarmVisibleFill();
        schedulePrefetchRefillRef.current();
      }
    },
    [flushPendingCommit, scheduleImpressionFlush, scheduleWarmVisibleFill],
  );

  const resetScrollBusy = useCallback(() => {
    isFeedSurfaceActiveRef.current = false;
    isScrollBusyRef.current = false;
    if (prefetchRefillTimerRef.current) {
      clearTimeout(prefetchRefillTimerRef.current);
      prefetchRefillTimerRef.current = null;
      prefetchRefillDeadlineRef.current = 0;
    }
    if (warmVisibleFillTimerRef.current) {
      clearTimeout(warmVisibleFillTimerRef.current);
      warmVisibleFillTimerRef.current = null;
    }
    if (progressiveRevealTimerRef.current) {
      clearTimeout(progressiveRevealTimerRef.current);
      progressiveRevealTimerRef.current = null;
    }
  }, []);

  const markFeedScrolledSinceLoad = useCallback(() => {
    hasFeedScrolledSinceLoadRef.current = true;
  }, []);

  const updatePostEverywhere = useCallback(
    (updater: (post: FeedPost) => FeedPost) => {
      lightPostsRef.current = lightPostsRef.current
        .map(updater)
        .filter(isTimelineFeedPost);
      videoPostsRef.current = lightPostsRef.current.filter(
        (post): post is FeedVideoPost => post.kind === 'video',
      );
      if (pendingCommitRef.current) {
        pendingCommitRef.current = {
          timelinePosts: pendingCommitRef.current.timelinePosts
            .map(updater)
            .filter(isTimelineFeedPost),
        };
      }
      setPosts(prev => {
        const nextPosts = prev.map(updater);
        mergedPostsRef.current = nextPosts;
        return nextPosts;
      });
      if (feedSourceRef.current === 'all') {
        cacheLightPostsAfterInteractions(lightPostsRef.current, {
          nextCursor: nextPageCursorRef.current,
          reachedEnd: hasReachedNetworkEndRef.current,
        });
      }
    },
    [],
  );

  useEffect(
    () =>
      postEditedEvents.subscribe(({ postId, text }) => {
        updatePostEverywhere(post =>
          String(post.id) === String(postId)
            ? applyFeedPostCaptionEdit(post, text)
            : post,
        );
      }),
    [updatePostEverywhere],
  );

  const updatePublisherFollowState = useCallback(
    (publisherId: string, isFollowing: boolean) => {
      if (!publisherId) return;
      updatePostEverywhere(post => {
        if (
          isPageFeedPublisher(post.publisher) ||
          String(post.publisher?.id) !== String(publisherId)
        ) {
          return post;
        }
        return {
          ...post,
          publisher: {
            ...post.publisher,
            isFollowing,
          },
        };
      });
    },
    [updatePostEverywhere],
  );

  // Profile updates arrive through the shared session cache. Older feed
  // posts still contain the publisher snapshot returned when they were
  // fetched, so refresh the current user's avatar in every in-memory and
  // cached post as soon as the profile cache changes.
  useEffect(() => {
    const currentUserId = sessionStorage.getSession()?.userId;
    if (!currentUserId) return undefined;

    const syncCurrentUserAvatar = (
      profile: ReturnType<typeof sessionStorage.getUserProfile>,
    ) => {
      const avatarUrl = profile?.avatarUrl;
      if (!avatarUrl) return;

      updatePostEverywhere(post => {
        if (
          isPageFeedPublisher(post.publisher) ||
          String(post.publisher?.id) !== String(currentUserId) ||
          post.publisher.avatarUrl === avatarUrl
        ) {
          return post;
        }

        return {
          ...post,
          publisher: {
            ...post.publisher,
            avatarUrl,
          },
        };
      });
    };

    syncCurrentUserAvatar(sessionStorage.getUserProfile());
    return sessionStorage.subscribeToUserProfile(syncCurrentUserAvatar);
  }, [updatePostEverywhere]);

  const removePostEverywhere = useCallback((postId: string) => {
    lightPostsRef.current = lightPostsRef.current.filter(
      post => post.id !== postId,
    );
    videoPostsRef.current = lightPostsRef.current.filter(
      (post): post is FeedVideoPost => post.kind === 'video',
    );
    prefetchBufferRef.current = prefetchBufferRef.current.filter(
      post => post.id !== postId,
    );
    if (pendingCommitRef.current) {
      pendingCommitRef.current = {
        timelinePosts: pendingCommitRef.current.timelinePosts.filter(
          post => post.id !== postId,
        ),
      };
    }
    setPosts(prev => {
      const nextPosts = prev.filter(post => post.id !== postId);
      mergedPostsRef.current = nextPosts;
      return nextPosts;
    });
    if (feedSourceRef.current === 'all') {
      cacheLightPostsAfterInteractions(lightPostsRef.current, {
        nextCursor: nextPageCursorRef.current,
        reachedEnd: hasReachedNetworkEndRef.current,
      });
    }
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      LOCAL_POST_HIDDEN_EVENT,
      (event: { postId?: string; userId?: string }) => {
        const postId = String(event?.postId ?? '').trim();
        if (!postId) return;
        const currentOwnerKey = sessionStorage.getSession()?.userId || 'guest';
        if (event?.userId && event.userId !== currentOwnerKey) return;
        updatePostEverywhere(post => markSharedLivePreviewEnded(post, postId));
        removePostEverywhere(postId);
      },
    );
    return () => subscription.remove();
  }, [removePostEverywhere, updatePostEverywhere]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      LOCAL_LIVE_ENDED_EVENT,
      (event: { postId?: string; userId?: string }) => {
        const postId = String(event?.postId ?? '').trim();
        if (!postId) return;
        const currentOwnerKey = sessionStorage.getSession()?.userId || 'guest';
        if (event?.userId && event.userId !== currentOwnerKey) return;
        removePostEverywhere(postId);
      },
    );
    return () => subscription.remove();
  }, [removePostEverywhere]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'postReactionChanged',
      (event: {
        postId: string;
        myReaction: ReactionType | null;
        likeCount: number;
        topReactions: ReactionType[];
        source?: 'feed' | 'reels';
      }) => {
        if (event.source === 'feed') return;
        updatePostEverywhere(post => {
          if (post.id !== event.postId) return post;
          if (
            post.kind !== 'text' &&
            post.kind !== 'video' &&
            post.kind !== 'poll'
          ) {
            return post;
          }
          const typedPost = post as FeedTextPost | FeedVideoPost | FeedPollPost;
          if (
            typedPost.myReaction === event.myReaction &&
            typedPost.likeCount === event.likeCount
          ) {
            return post;
          }
          return {
            ...post,
            myReaction: event.myReaction,
            likeCount: event.likeCount,
            topReactions: event.topReactions,
          };
        });
      },
    );
    return () => {
      subscription.remove();
    };
  }, [updatePostEverywhere]);

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
  const schedulePrefetchRefill = useCallback(
    (delayMs = PREFETCH_REFILL_DELAY_MS) => {
      if (isDisposedRef.current || !isFeedSurfaceActiveRef.current) return;

      const normalizedDelay = Math.max(0, delayMs);
      const candidateDeadline = Date.now() + normalizedDelay;
      if (prefetchRefillTimerRef.current) {
        if (prefetchRefillDeadlineRef.current <= candidateDeadline) return;
        clearTimeout(prefetchRefillTimerRef.current);
      }
      prefetchRefillDeadlineRef.current = candidateDeadline;

      prefetchRefillTimerRef.current = setTimeout(() => {
        prefetchRefillTimerRef.current = null;
        prefetchRefillDeadlineRef.current = 0;
        if (isDisposedRef.current || !isFeedSurfaceActiveRef.current) return;
        if (
          prefetchPromiseRef.current ||
          hasReachedNetworkEndRef.current ||
          prefetchBufferRef.current.length >=
            paginationNetworkPolicyRef.current.getPolicy().bufferTarget
        ) {
          return;
        }

        void prefetchNextPageRef.current();
      }, normalizedDelay);
    },
    [],
  );

  schedulePrefetchRefillRef.current = schedulePrefetchRefill;

  const prefetchNextPage = useCallback(() => {
    if (isDisposedRef.current || !isFeedSurfaceActiveRef.current) return null;
    // Return the existing promise so callers can await the exact request
    // already in flight. Without this, an early viewability callback and
    // `onEndReached` can fetch the same cursor twice.
    if (prefetchPromiseRef.current) {
      return prefetchPromiseRef.current;
    }

    if (hasReachedNetworkEndRef.current) {
      return null;
    }

    const paginationPolicy = paginationNetworkPolicyRef.current.getPolicy();
    if (prefetchBufferRef.current.length >= paginationPolicy.bufferTarget) {
      return null;
    }

    const cursor = nextPageCursorRef.current;
    if (!cursor) {
      // Cursor exhausted — but only commit the "end of feed" verdict
      // after we genuinely tried MAX_CONSECUTIVE_EMPTY_PAGES times.
      emptyPageStrikeRef.current += 1;
      if (emptyPageStrikeRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES) {
        hasReachedNetworkEndRef.current = true;
      }
      return null;
    }

    const generation = paginationGenerationRef.current;
    const sourceAtPrefetch = feedSourceRef.current;
    let refillDelayAfterRequest: number | null = null;

    // Include already-ready rows in the anchor so a queued page cannot be
    // fetched twice while the user drains the queue.
    const paginationPosts = [
      ...lightPostsRef.current,
      ...prefetchBufferRef.current,
    ];
    const existingIds = new Set(paginationPosts.map(p => p.id));
    const oldestTimestamp = paginationPosts.reduce<number>(
      (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
      Number.POSITIVE_INFINITY,
    );

    const request = fetchLightPostsPage(
      paginationPolicy.pageSize,
      cursor,
      sourceAtPrefetch,
      PAGINATION_SCAN_PAGES,
    )
      .then(page => {
        // A refresh or source switch may have invalidated this request while
        // it was on the wire. Never let stale results repopulate the buffer.
        if (
          paginationGenerationRef.current !== generation ||
          feedSourceRef.current !== sourceAtPrefetch
        ) {
          return;
        }

        prefetchRetryAttemptRef.current = 0;
        const filtered = [
          ...page.posts,
          ...(page.prefetchedPosts ?? []),
        ].filter(isTimelineFeedPost);

        const newPosts = pickAppendablePage(
          filtered,
          existingIds,
          oldestTimestamp,
          Math.max(1, filtered.length),
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
          timeline: filtered.length,
          usable: newPosts.length,
          existing: existingIds.size,
          emptyStrikes: emptyPageStrikeRef.current,
        });

        if (newPosts.length === 0) {
          if (advancedCursor) {
            // A cursor that still moves means this was only a sparse raw
            // window. Keep walking in the background without counting it as
            // evidence that Home has exhausted all eligible posts.
            emptyPageStrikeRef.current = 0;
            refillDelayAfterRequest = EMPTY_PAGE_RETRY_DELAY_MS;
          } else {
            emptyPageStrikeRef.current += 1;
            if (emptyPageStrikeRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES) {
              hasReachedNetworkEndRef.current = true;
            } else {
              refillDelayAfterRequest = EMPTY_PAGE_RETRY_DELAY_MS;
            }
          }
        } else {
          emptyPageStrikeRef.current = 0;
          const renderedIds = new Set(
            lightPostsRef.current.map(post => post.id),
          );
          prefetchBufferRef.current = mergeFeedPrefetchQueue(
            prefetchBufferRef.current,
            newPosts,
            renderedIds,
          );
          scheduleWarmVisibleFill();
          if (page.reachedEnd && (!page.nextCursor || !advancedCursor)) {
            hasReachedNetworkEndRef.current = true;
          }
          refillDelayAfterRequest = hasReachedNetworkEndRef.current
            ? null
            : PREFETCH_REFILL_DELAY_MS;
        }
      })
      .catch(err => {
        if (
          paginationGenerationRef.current !== generation ||
          feedSourceRef.current !== sourceAtPrefetch
        ) {
          return;
        }
        console.warn('[feed] prefetch failed:', err);
        // Transport failures are retryable and must never be interpreted as
        // proof that the server has no more posts.
        prefetchRetryAttemptRef.current += 1;
        refillDelayAfterRequest = getFeedPrefetchRetryDelay(
          prefetchRetryAttemptRef.current,
        );
      })
      .finally(() => {
        // Only clear the ref if this is still the active request. A refresh
        // can deliberately replace it while the old request is finishing.
        if (prefetchPromiseRef.current === request) {
          prefetchPromiseRef.current = null;
          prefetchCursorRef.current = undefined;
        }
        if (
          refillDelayAfterRequest !== null &&
          paginationGenerationRef.current === generation &&
          feedSourceRef.current === sourceAtPrefetch
        ) {
          schedulePrefetchRefill(refillDelayAfterRequest);
        }
      });

    prefetchCursorRef.current = cursor;
    prefetchPromiseRef.current = request;
    return request;
  }, [fetchLightPostsPage, schedulePrefetchRefill, scheduleWarmVisibleFill]);

  prefetchNextPageRef.current = prefetchNextPage;

  const loadPosts = useCallback(
    async (isPullToRefresh = false) => {
      isLoadingPostsRef.current = true;
      clearProgressiveReveal();
      // Invalidate any page prefetch started for the previous feed snapshot.
      // The old request may still finish on the wire, but its generation
      // guard prevents stale posts from being inserted into the new feed.
      const generation = paginationGenerationRef.current + 1;
      paginationGenerationRef.current = generation;
      const sourceAtLoad = feedSourceRef.current;
      prefetchPromiseRef.current = null;
      prefetchCursorRef.current = undefined;
      if (prefetchRefillTimerRef.current) {
        clearTimeout(prefetchRefillTimerRef.current);
        prefetchRefillTimerRef.current = null;
      }
      if (warmVisibleFillTimerRef.current) {
        clearTimeout(warmVisibleFillTimerRef.current);
        warmVisibleFillTimerRef.current = null;
      }
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      if (!isPullToRefresh) {
        prefetchBufferRef.current = []; // Clear stale buffer on cold/source load.
        setIsAllLoaded(false); // Reset pagination on first load/source change.
        hasReachedNetworkEndRef.current = false;
        emptyPageStrikeRef.current = 0;
      }
      if (isPullToRefresh) {
        trackedImpressionIdsRef.current = new Set();
        pendingImpressionIdsRef.current.clear();
      }
      try {
        if (isPullToRefresh) {
          // A pull gesture only needs the newest head of the timeline. The
          // cursor-aware initial loader can scan up to four raw pages to fill
          // ten lightweight rows, which is useful on a cold open but makes a
          // refresh feel unnecessarily slow. Fetch one head page, merge it
          // over the visible snapshot, and leave existing pagination intact.
          const page = await fetchLightPostsPage(
            PAGE_SIZE,
            undefined,
            sourceAtLoad,
            1,
          );
          if (
            paginationGenerationRef.current !== generation ||
            feedSourceRef.current !== sourceAtLoad
          ) {
            return;
          }

          const freshPosts = page.posts.filter(isTimelineFeedPost);
          const prefetchedPosts = (page.prefetchedPosts ?? []).filter(
            isTimelineFeedPost,
          );
          const merged = sortByTime(
            uniqueById([...freshPosts, ...lightPostsRef.current]),
          );

          // Re-anchor pagination to the newly fetched head only after the
          // request succeeds. If refresh fails, the existing buffered page
          // and cursor remain usable instead of creating a gap in the feed.
          prefetchBufferRef.current = mergeFeedPrefetchQueue(
            [],
            prefetchedPosts,
            new Set(merged.map(post => post.id)),
          );
          nextPageCursorRef.current = page.nextCursor;
          hasReachedNetworkEndRef.current =
            page.reachedEnd === true && !page.nextCursor;
          emptyPageStrikeRef.current = 0;
          setIsAllLoaded(false);
          commitFeedSources(merged);
          scheduleWarmVisibleFill();
          prefetchNextPage();
          return;
        }

        const page = await fetchLightPostsPage(
          PAGE_SIZE,
          undefined,
          sourceAtLoad,
        );
        if (
          paginationGenerationRef.current !== generation ||
          feedSourceRef.current !== sourceAtLoad
        ) {
          return;
        }
        const freshPosts = page.posts.filter(isTimelineFeedPost);
        const prefetchedPosts = (page.prefetchedPosts ?? []).filter(
          isTimelineFeedPost,
        );
        // Restore only one screenful of persisted rows on cold open. Keeping
        // the full cache visible made FlashList mount and prefetch dozens of
        // media cards before the user reached them. The remaining cached
        // rows stay in the same pagination runway and are revealed normally.
        const cachedFallbackPosts = lightPostsRef.current;
        const initialCandidates = sortByTime(
          uniqueById([...freshPosts, ...cachedFallbackPosts]),
        );
        const initialPosts = initialCandidates.slice(
          0,
          HOME_VISIBLE_WARM_TARGET,
        );
        const cachedOverflow = initialCandidates.slice(
          HOME_VISIBLE_WARM_TARGET,
        );
        prefetchBufferRef.current = mergeFeedPrefetchQueue(
          [],
          sortByTime(uniqueById([...cachedOverflow, ...prefetchedPosts])),
          new Set(initialPosts.map(post => post.id)),
        );
        nextPageCursorRef.current = page.nextCursor;
        // DON'T mark the feed as "ended" just because the first page's
        // cursor is undefined. The repository falls back to a follow-
        // up cursor via discovery when followed is thin, so the only
        // way we get here with an empty cursor is if the install
        // literally has no more posts. We let `loadMorePosts` confirm
        // with the MAX_CONSECUTIVE_EMPTY_PAGES guard rather than trust
        // the first page alone.
        hasReachedNetworkEndRef.current =
          page.reachedEnd === true && !page.nextCursor;
        const isEmptyFeedTerminal =
          initialPosts.length === 0 &&
          prefetchBufferRef.current.length === 0 &&
          !page.nextCursor;
        if (isEmptyFeedTerminal) {
          hasReachedNetworkEndRef.current = true;
        }
        setIsAllLoaded(isEmptyFeedTerminal);

        debugFeedVm('initial page', {
          fetched: freshPosts.length,
          nextCursor: page.nextCursor ?? '(none)',
          refresh: isPullToRefresh,
        });

        commitFeedSources(initialPosts);
        scheduleWarmVisibleFill();

        // Always start prefetching page 2 — the repository now
        // guarantees a cursor on its first page, so this is safe.
        prefetchNextPage();
      } catch (caught) {
        if (
          paginationGenerationRef.current === generation &&
          feedSourceRef.current === sourceAtLoad
        ) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Không tải được bảng tin.',
          );
        }
      } finally {
        if (
          paginationGenerationRef.current === generation &&
          feedSourceRef.current === sourceAtLoad
        ) {
          hasLoadedOnceRef.current = true;
          setHasLoadedOnce(true);
          isLoadingPostsRef.current = false;
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      commitFeedSources,
      clearProgressiveReveal,
      fetchLightPostsPage,
      prefetchNextPage,
      scheduleWarmVisibleFill,
    ],
  );

  const peekLatestPosts = useCallback(async (limit = PAGE_SIZE) => {
    const posts = await repository.getLatestPosts(limit, feedSourceRef.current);
    return sortByTime(filterLocallyHiddenPosts(posts)).slice(0, limit);
  }, []);

  const selectFeedSource = useCallback(
    (nextSource: FeedSource | 'photos') => {
      const nextApiSource = nextSource === 'photos' ? 'all' : nextSource;
      if (feedSourceRef.current === nextApiSource) {
        if (feedSource !== nextSource) {
          // `photos` is a local projection of the already-loaded `all` feed.
          // Switching All <-> Photos must not clear the list, reconnect media,
          // or restart pagination.
          setFeedSourceState(nextSource);
        }
        return;
      }

      feedSourceRef.current = nextApiSource;
      setFeedSourceState(nextSource);
      hasFeedScrolledSinceLoadRef.current = false;
      pendingCommitRef.current = null;
      lightPostsRef.current = [];
      videoPostsRef.current = [];
      prefetchBufferRef.current = [];
      hasReachedNetworkEndRef.current = false;
      nextPageCursorRef.current = undefined;
      emptyPageStrikeRef.current = 0;
      trackedImpressionIdsRef.current = new Set();
      pendingImpressionIdsRef.current.clear();
      mergedPostsRef.current = [];
      setPosts([]);
      setIsAllLoaded(false);
      hasLoadedOnceRef.current = false;
      setHasLoadedOnce(false);
      loadPosts(false);
    },
    [loadPosts, feedSource],
  );

  const consumePrefetchBatch = useCallback(() => {
    const visibleIds = new Set(lightPostsRef.current.map(post => post.id));
    const policy = paginationNetworkPolicyRef.current.getPolicy();
    const { batch, remaining } = takeFeedPrefetchBatch(
      prefetchBufferRef.current,
      visibleIds,
      // Keep the network page together even during a fling. FlashList only
      // mounts its render window, so splitting ten ready rows into 3+3+3+1
      // adds four list-data/layout commits without reducing native work.
      policy.revealBatchSize,
    );
    prefetchBufferRef.current = remaining;
    return batch;
  }, []);

  const scheduleProgressiveReveal = useCallback(() => {
    if (
      progressiveRevealTimerRef.current ||
      progressiveRevealRemainingRef.current <= 0 ||
      paginationNetworkPolicyRef.current.getPolicy().mode !== 'constrained' ||
      (hasReachedNetworkEndRef.current &&
        prefetchBufferRef.current.length === 0)
    ) {
      return;
    }

    progressiveRevealTimerRef.current = setTimeout(() => {
      progressiveRevealTimerRef.current = null;
      if (isLoadingMoreRef.current) {
        scheduleProgressiveRevealRef.current();
        return;
      }
      void loadMorePostsRef.current();
    }, CONSTRAINED_REVEAL_DELAY_MS);
  }, []);

  scheduleProgressiveRevealRef.current = scheduleProgressiveReveal;

  const continueProgressiveReveal = useCallback(
    (revealedCount: number) => {
      const policy = paginationNetworkPolicyRef.current.getPolicy();
      if (policy.mode !== 'constrained') {
        clearProgressiveReveal();
        return;
      }
      if (revealedCount <= 0) return;

      if (progressiveRevealRemainingRef.current <= 0) {
        progressiveRevealRemainingRef.current = policy.pageSize;
      }
      progressiveRevealRemainingRef.current = Math.max(
        0,
        progressiveRevealRemainingRef.current - revealedCount,
      );
      scheduleProgressiveReveal();
    },
    [clearProgressiveReveal, scheduleProgressiveReveal],
  );

  const canStartLoadMorePosts = useCallback(() => {
    const hasAnyFeedRows =
      lightPostsRef.current.length > 0 ||
      mergedPostsRef.current.length > 0 ||
      Boolean(nextPageCursorRef.current);
    return !(
      isLoading ||
      isLoadingPostsRef.current ||
      isLoadingMore ||
      isLoadingMoreRef.current ||
      isAllLoaded ||
      !hasLoadedOnceRef.current ||
      !hasAnyFeedRows
    );
  }, [isAllLoaded, isLoading, isLoadingMore]);

  const loadMorePosts = useCallback(async (): Promise<FeedLoadMoreOutcome> => {
    let currentLightPosts = lightPostsRef.current;
    if (!canStartLoadMorePosts()) return 'retryable';

    const generationAtLoad = paginationGenerationRef.current;
    const sourceAtLoad = feedSourceRef.current;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    try {
      // Fast path: use the buffer if available. If the buffer is still being
      // filled for the exact cursor we need, await that request instead of
      // starting a duplicate page fetch in the slow path below.
      let buffered = consumePrefetchBatch();
      const inFlightPrefetch = prefetchPromiseRef.current;
      const inFlightCursor = prefetchCursorRef.current;
      const requestedCursor = nextPageCursorRef.current;
      const hasMatchingInFlightPrefetch = Boolean(
        buffered.length === 0 &&
          inFlightPrefetch &&
          inFlightCursor === requestedCursor,
      );
      if (hasMatchingInFlightPrefetch) {
        // Awaiting a promise does not block the JS scroll thread. More
        // importantly, this continuation consumes and appends the page as
        // soon as it arrives; returning while momentum is active stranded the
        // finished page in the invisible buffer until a later viewability or
        // onEndReached callback happened to fire.
        await inFlightPrefetch;
        if (
          paginationGenerationRef.current !== generationAtLoad ||
          feedSourceRef.current !== sourceAtLoad
        ) {
          return 'stale';
        }
        buffered = consumePrefetchBatch();
        currentLightPosts = lightPostsRef.current;
      }

      if (
        paginationGenerationRef.current !== generationAtLoad ||
        feedSourceRef.current !== sourceAtLoad
      ) {
        return 'stale';
      }

      if (buffered && buffered.length > 0) {
        const newPosts = buffered.filter(isTimelineFeedPost);

        if (newPosts.length === 0) {
          if (hasReachedNetworkEndRef.current || !nextPageCursorRef.current) {
            setIsAllLoaded(true);
            return 'terminal';
          } else {
            prefetchNextPage();
          }
          return 'retryable';
        } else {
          // The prefetch buffer contains canonical timeline rows, including
          // videos. Append them immediately; native media remains viewport-
          // gated by the card layer.
          const appendedPosts = appendLightPosts(newPosts);
          if (appendedPosts.length === 0) {
            prefetchNextPage();
            return 'retryable';
          }
          prefetchNextPage();
          if (
            prefetchBufferRef.current.length === 0 &&
            hasReachedNetworkEndRef.current
          ) {
            setIsAllLoaded(true);
          }
          continueProgressiveReveal(appendedPosts.length);
          return 'appended';
        }
      }

      if (hasReachedNetworkEndRef.current) {
        setIsAllLoaded(true);
        return 'terminal';
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
        return hasReachedNetworkEndRef.current ? 'terminal' : 'retryable';
      }

      const requestPolicy = paginationNetworkPolicyRef.current.getPolicy();
      const page = await fetchLightPostsPage(
        requestPolicy.pageSize,
        cursor,
        sourceAtLoad,
        PAGINATION_SCAN_PAGES,
      );
      if (
        paginationGenerationRef.current !== generationAtLoad ||
        feedSourceRef.current !== sourceAtLoad
      ) {
        return 'stale';
      }
      const olderPosts = [
        ...page.posts,
        ...(page.prefetchedPosts ?? []),
      ].filter(isTimelineFeedPost);

      // Re-read after the network await so a realtime prepend/delete that
      // happened while paging is not lost when this page is merged.
      currentLightPosts = lightPostsRef.current;
      const existingIds = new Set(currentLightPosts.map(p => p.id));
      const oldestTimestamp = currentLightPosts.reduce<number>(
        (min, post) => (post.postedAt ? Math.min(min, post.postedAt) : min),
        Number.POSITIVE_INFINITY,
      );

      const newPosts = pickAppendablePage(
        olderPosts,
        existingIds,
        oldestTimestamp,
        Math.max(1, olderPosts.length),
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
        if (advancedCursor) {
          emptyPageStrikeRef.current = 0;
          prefetchNextPage();
        } else {
          emptyPageStrikeRef.current += 1;
          if (emptyPageStrikeRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES) {
            hasReachedNetworkEndRef.current = true;
            setIsAllLoaded(true);
          } else {
            // A stalled cursor or transient empty response is retried before
            // Home commits an end-of-feed verdict.
            prefetchNextPage();
          }
        }
        return hasReachedNetworkEndRef.current ? 'terminal' : 'retryable';
      } else {
        emptyPageStrikeRef.current = 0;
        const { batch: revealPosts, remaining } = takeFeedPrefetchBatch(
          newPosts,
          new Set(currentLightPosts.map(post => post.id)),
          paginationNetworkPolicyRef.current.getPolicy().revealBatchSize,
        );
        prefetchBufferRef.current = mergeFeedPrefetchQueue(
          prefetchBufferRef.current,
          remaining,
          new Set(currentLightPosts.map(post => post.id)),
        );
        const appendedPosts = appendLightPosts(revealPosts);
        if (appendedPosts.length === 0) {
          prefetchNextPage();
          return 'retryable';
        }
        if (page.reachedEnd && (!page.nextCursor || !advancedCursor)) {
          hasReachedNetworkEndRef.current = true;
        }
        prefetchNextPage();
        if (
          prefetchBufferRef.current.length === 0 &&
          hasReachedNetworkEndRef.current
        ) {
          setIsAllLoaded(true);
        }
        continueProgressiveReveal(appendedPosts.length);
        return 'appended';
      }
    } catch (caught) {
      clearProgressiveReveal();
      if (
        paginationGenerationRef.current === generationAtLoad &&
        feedSourceRef.current === sourceAtLoad
      ) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không tải được thêm bài viết.',
        );
        return 'retryable';
      }
      return 'stale';
    } finally {
      if (
        paginationGenerationRef.current === generationAtLoad &&
        feedSourceRef.current === sourceAtLoad
      ) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
        scheduleWarmVisibleFill();
      }
    }
  }, [
    appendLightPosts,
    canStartLoadMorePosts,
    clearProgressiveReveal,
    consumePrefetchBatch,
    continueProgressiveReveal,
    fetchLightPostsPage,
    prefetchNextPage,
    scheduleWarmVisibleFill,
  ]);

  const requestLoadMorePosts = useCallback(
    (onComplete?: (outcome: FeedLoadMoreOutcome) => void) => {
      if (!canStartLoadMorePosts()) return false;
      void loadMorePosts().then(outcome => {
        onComplete?.(outcome);
      });
      return true;
    },
    [canStartLoadMorePosts, loadMorePosts],
  );

  loadMorePostsRef.current = loadMorePosts;

  useEffect(() => {
    if (!isLoading && hasLoadedOnce) {
      scheduleWarmVisibleFill();
    }
  }, [hasLoadedOnce, isLoading, posts.length, scheduleWarmVisibleFill]);

  useEffect(() => {
    // Delay feed load to avoid competing with other initial API calls
    // that mount at the same time (stories, current user, etc.)
    const timer = setTimeout(() => {
      if (isLoadingPostsRef.current || hasLoadedOnceRef.current) return;
      loadPosts();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadPosts]);

  useEffect(() => {
    return () => {
      isDisposedRef.current = true;
      paginationGenerationRef.current += 1;
      if (prefetchRefillTimerRef.current) {
        clearTimeout(prefetchRefillTimerRef.current);
        prefetchRefillTimerRef.current = null;
        prefetchRefillDeadlineRef.current = 0;
      }
      if (warmVisibleFillTimerRef.current) {
        clearTimeout(warmVisibleFillTimerRef.current);
        warmVisibleFillTimerRef.current = null;
      }
      if (progressiveRevealTimerRef.current) {
        clearTimeout(progressiveRevealTimerRef.current);
        progressiveRevealTimerRef.current = null;
      }
      impressionFlushTaskRef.current?.cancel();
      if (impressionFlushTimerRef.current) {
        clearTimeout(impressionFlushTimerRef.current);
        impressionFlushTimerRef.current = null;
      }
    };
  }, []);

  // Derived (backward-compat) slices
  // Older UI code reads `vm.videoPosts` / `vm.textPosts`. We keep these
  // as memoised projections of the single source of truth so the home
  // screen can migrate to `vm.posts` at its own pace.
  const visiblePosts = useMemo(() => {
    if (feedSource === 'photos') {
      return posts.filter(
        (post): post is FeedTextPost =>
          post.kind === 'text' &&
          Array.isArray(post.photos) &&
          post.photos.length > 0,
      );
    }
    return posts;
  }, [posts, feedSource]);

  const videoPosts = useMemo<FeedVideoPost[]>(
    () => visiblePosts.filter((p): p is FeedVideoPost => p.kind === 'video'),
    [visiblePosts],
  );
  const textPosts = useMemo<FeedTextPost[]>(
    () => visiblePosts.filter((p): p is FeedTextPost => p.kind === 'text'),
    [visiblePosts],
  );

  /**
   * Insert a freshly-created post at the top of the merged feed.
   * Called by `useCreatePostViewModel.submit()` (for text posts) and
   * potentially `useCreateReelViewModel` (for videos, if wired up
   * later).
   *
   * Dedupe by `id` so an accidental double-emit doesn't show the same
   * post twice. Unlike the normal server-page merge, this intentionally
   * puts the local post at index 0 so the user sees the content they just
   * submitted immediately instead of getting the "new posts" button or a
   * video-mix slot further down the feed.
   */
  const prependPost = useCallback((post: FeedPost) => {
    if (
      !post?.id ||
      hiddenPostsStorage.isHidden(
        String(post.id),
        sessionStorage.getSession()?.userId,
      ) ||
      mergedPostsRef.current.some(p => p.id === post.id)
    ) {
      return;
    }

    prefetchBufferRef.current = prefetchBufferRef.current.filter(
      bufferedPost => bufferedPost.id !== post.id,
    );
    if (pendingCommitRef.current) {
      pendingCommitRef.current = {
        timelinePosts: [
          post,
          ...pendingCommitRef.current.timelinePosts.filter(
            existingPost => existingPost.id !== post.id,
          ),
        ],
      };
    }

    const insertPostAtTop = () => {
      setPosts(previousPosts => {
        if (previousPosts.some(existingPost => existingPost.id === post.id)) {
          return previousPosts;
        }
        const nextPosts = [post, ...previousPosts];
        mergedPostsRef.current = nextPosts;
        return nextPosts;
      });
    };

    if (isTimelineFeedPost(post)) {
      lightPostsRef.current = sortByTime([post, ...lightPostsRef.current]);
      videoPostsRef.current = lightPostsRef.current.filter(
        (candidate): candidate is FeedVideoPost => candidate.kind === 'video',
      );
    }
    insertPostAtTop();

    if (feedSourceRef.current === 'all') {
      cacheLightPostsAfterInteractions(lightPostsRef.current, {
        nextCursor: nextPageCursorRef.current,
        reachedEnd: hasReachedNetworkEndRef.current,
      });
    }
  }, []);
  const toggleReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: FeedPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;
      let finalLikeCount = 0;
      let finalTopReactions: ReactionType[] = [];

      updatePostEverywhere(post => {
        if (post.id !== postId) return post;
        if (
          post.kind !== 'text' &&
          post.kind !== 'video' &&
          post.kind !== 'poll'
        ) {
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

        finalLikeCount = likeCount;
        finalTopReactions = newTopReactions;

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

      // Emit global reaction changed event
      DeviceEventEmitter.emit('postReactionChanged', {
        postId,
        myReaction: targetReaction,
        likeCount: finalLikeCount,
        topReactions: finalTopReactions,
        source: 'feed',
      });

      try {
        await repository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          updatePostEverywhere(post => (post.id === postId ? original : post));
          // Re-emit original reaction on failure
          const typedOriginal = original as
            | FeedTextPost
            | FeedVideoPost
            | FeedPollPost;
          DeviceEventEmitter.emit('postReactionChanged', {
            postId,
            myReaction: typedOriginal.myReaction,
            likeCount: typedOriginal.likeCount,
            topReactions: typedOriginal.topReactions,
            source: 'feed',
          });
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
        if (
          post.kind !== 'text' &&
          post.kind !== 'video' &&
          post.kind !== 'poll'
        ) {
          return post;
        }
        const typedPost = post as FeedTextPost | FeedVideoPost | FeedPollPost;
        return {
          ...post,
          commentCount: Math.max(0, typedPost.commentCount + delta),
        };
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

  const trackPostImpression = useCallback(
    (postId: string) => {
      if (!postId || trackedImpressionIdsRef.current.has(postId)) {
        return;
      }

      trackedImpressionIdsRef.current.add(postId);
      pendingImpressionIdsRef.current.add(postId);
      scheduleImpressionFlush();
    },
    [scheduleImpressionFlush],
  );

  const editPost = useCallback(
    async (postId: string, input: { text: string; privacy?: PostPrivacy }) => {
      return editPostWithLocalFallback(repository.editPost, postId, input);
    },
    [],
  );

  return {
    feedSource,
    setFeedSource: selectFeedSource,
    posts: visiblePosts,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    isLoadingMore,
    isAllLoaded,
    hasLoadedOnce,
    error,
    reloadPosts: loadPosts,
    peekLatestPosts,
    loadMorePosts,
    requestLoadMorePosts,
    setScrollBusy,
    resetScrollBusy,
    markFeedScrolledSinceLoad,
    prependPost,
    updatePublisherFollowState,
    applyRealtimePost: (nextPost: FeedPost) => {
      updatePostEverywhere(post =>
        String(post.id) === String(nextPost.id)
          ? applyLocalPostCaptionEdit(nextPost)
          : post,
      );
    },
    removeRealtimePost: removePostEverywhere,
    toggleReaction,
    updateCommentCount,
    votePoll,
    trackPostImpression,

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

    editPost,

    /** Report a post with the reason selected by the user. */
    reportPost: (postId: string, input: ReportPostInput) =>
      repository.reportPost(postId, input),

    /**
     * Hide only affects the current app feed view. The backend v2
     * post-actions endpoint does not expose a hide action.
     */
    hidePost: (postId: string) => {
      hiddenPostsStorage.hidePost(postId, sessionStorage.getSession()?.userId);
      removePostEverywhere(postId);
    },

    deletePost: async (postId: string) => {
      const result = await repository.deletePost(postId);
      if (result.deleted) {
        removePostEverywhere(postId);
      }
      return result;
    },

    sharePost: repository.sharePost,
  };
}
