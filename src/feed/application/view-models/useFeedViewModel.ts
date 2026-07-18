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
import { InteractionManager, DeviceEventEmitter } from 'react-native';
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
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  getFeedVideoBufferTarget,
  mergeFeedContentWithVideos,
} from './feedVideoScheduler';
import {
  createCachedVideoPosterThumbnail,
  getCachedVideoPosterThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';

const repository = createFeedRepository();
const pollRepository = createPollRepository();

// Home pagination is id-cursored: first page = newest posts, every
// subsequent page asks for posts older than the smallest id already shown.
// Keep the visible page at 10 items so load-more is predictable and avoids
// skipping older posts that live in the same raw API window.
const PAGE_SIZE = 10;
const VIDEO_PAGE_SIZE = 12;
const VIDEO_PREPARE_BATCH_SIZE = 4;
const LOAD_MORE_FRESH_POST_LIMIT = 3;
const LOAD_MORE_FRESH_POST_FETCH_LIMIT = 8;
const FEED_VM_DEBUG = typeof __DEV__ !== 'undefined' && __DEV__;
// Stop paging only after this many consecutive empty pages. Each
// empty page retries with a different cursor source; 3 was empirically
// enough to soak up temporary endpoint blips without trapping users
// on a true dead-end.
const MAX_CONSECUTIVE_EMPTY_PAGES = 3;

type InteractionTask = ReturnType<
  typeof InteractionManager.runAfterInteractions
>;

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

function isLightFeedPost(
  post: FeedPost,
): post is Exclude<FeedPost, FeedVideoPost> {
  return (
    post.kind !== 'video' &&
    post.kind !== 'product' &&
    post.kind !== 'event' &&
    post.kind !== 'job'
  );
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

function getFeedPostTimestamp(post?: FeedPost | null) {
  const value = Number(post?.postedAt);
  return Number.isFinite(value) ? value : 0;
}

function getFeedPostNumericId(post?: FeedPost | null) {
  const value = Number(post?.id);
  return Number.isFinite(value) ? value : 0;
}

function isPostNewerThanFeedTop(
  post: FeedPost,
  currentPosts: readonly FeedPost[],
) {
  const topPost = currentPosts[0];
  if (!topPost) return false;

  const postTime = getFeedPostTimestamp(post);
  const topTime = getFeedPostTimestamp(topPost);

  if (postTime > 0 && topTime > 0 && postTime !== topTime) {
    return postTime > topTime;
  }

  const postId = getFeedPostNumericId(post);
  const topId = getFeedPostNumericId(topPost);
  return postId > 0 && topId > 0 && postId > topId;
}

function pickFreshPostsForLoadMore(
  candidates: FeedPost[],
  existingIds: Set<string>,
  currentPosts: readonly FeedPost[],
  limit = LOAD_MORE_FRESH_POST_LIMIT,
) {
  return sortByTime(uniqueById(candidates))
    .filter(post => {
      if (!post?.id || existingIds.has(post.id)) return false;
      return isPostNewerThanFeedTop(post, currentPosts);
    })
    .slice(0, limit);
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

function cacheLightPostsAfterInteractions(posts: FeedPost[]) {
  const snapshot = posts.slice(0, 50);
  pendingLightCacheTask?.cancel();
  pendingLightCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedPosts(snapshot);
    pendingLightCacheTask = null;
  });
}

function cacheVideoPostsAfterInteractions(posts: FeedVideoPost[]) {
  const snapshot = posts.filter(isFeedVideoReadyForDisplay).slice(0, 30);
  pendingVideoCacheTask?.cancel();
  pendingVideoCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedVideoPosts(snapshot);
    pendingVideoCacheTask = null;
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

function getFeedVideoPosterCacheKey(post: FeedVideoPost) {
  return `${post.id}:${post.videoUrl || 'video'}`;
}

function hasRemoteOrLocalVideoPoster(post: FeedVideoPost) {
  return (
    typeof post.thumbnailUrl === 'string' && post.thumbnailUrl.trim().length > 0
  );
}

function isFeedVideoReadyForDisplay(post: FeedVideoPost) {
  const videoUrl = post.videoUrl?.trim();
  if (!videoUrl) return false;
  if (hasRemoteOrLocalVideoPoster(post)) return true;
  return Boolean(
    getCachedVideoPosterThumbnail(videoUrl, getFeedVideoPosterCacheKey(post))
      ?.uri,
  );
}

function getReadyFeedVideos(posts: FeedVideoPost[]) {
  return posts.filter(isFeedVideoReadyForDisplay);
}

async function prepareFeedVideoForDisplay(post: FeedVideoPost) {
  const videoUrl = post.videoUrl?.trim();
  if (!videoUrl) return false;
  if (isFeedVideoReadyForDisplay(post)) return true;

  const thumbnail = await createCachedVideoPosterThumbnail(
    videoUrl,
    getFeedVideoPosterCacheKey(post),
  );
  return Boolean(thumbnail?.uri);
}

async function prepareFeedVideosForDisplay(
  candidates: FeedVideoPost[],
  limit = VIDEO_PREPARE_BATCH_SIZE,
) {
  const preparedVideos: FeedVideoPost[] = [];
  const seenIds = new Set<string>();

  for (const candidate of candidates) {
    if (preparedVideos.length >= limit) break;
    if (!candidate?.id || seenIds.has(candidate.id)) continue;
    seenIds.add(candidate.id);

    const isReady = await prepareFeedVideoForDisplay(candidate);
    if (isReady) {
      preparedVideos.push(candidate);
    }
  }

  return preparedVideos;
}

export function useFeedViewModel() {
  const [feedSource, setFeedSourceState] = useState<FeedSource | 'photos'>(
    'all',
  );
  const [posts, setPosts] = useState<FeedPost[]>(() => {
    const cachedLightPosts = feedCacheStorage
      .getCachedPosts()
      .filter(isLightFeedPost);
    const cachedVideoPosts = getReadyFeedVideos(
      feedCacheStorage.getCachedVideoPosts(),
    );
    return mergeFeedContentWithVideos(
      sortByTime(cachedLightPosts),
      sortByTime(cachedVideoPosts) as FeedVideoPost[],
      { videoReadiness: isFeedVideoReadyForDisplay },
    );
  });
  const mergedPostsRef = useRef<FeedPost[]>(posts);
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
    getReadyFeedVideos(feedCacheStorage.getCachedVideoPosts()),
  );

  // Prefetch buffer
  // Holds the pre-fetched next page so `loadMorePosts` can merge it
  // instantly without waiting for a network round-trip.
  const prefetchBufferRef = useRef<FeedPost[] | null>(null);
  const isPrefetchingRef = useRef(false);
  const isFetchingVideosRef = useRef(false);
  const videoBufferTaskRef = useRef<InteractionTask | null>(null);
  const videoFetchCursorRef = useRef<string | undefined>(
    videoPostsRef.current[videoPostsRef.current.length - 1]?.id,
  );
  const videoCandidateIdsRef = useRef<Set<string>>(
    new Set(videoPostsRef.current.map(post => post.id)),
  );
  const isScrollBusyRef = useRef(false);
  const pendingCommitRef = useRef<{
    lightPosts: FeedPost[];
    videoPosts: FeedVideoPost[];
    preserveRenderedOrder?: boolean;
    preserveExistingPosts?: readonly FeedPost[];
  } | null>(null);
  const feedSourceRef = useRef<FeedSource>('all');
  const trackedImpressionIdsRef = useRef<Set<string>>(new Set());
  const pendingImpressionIdsRef = useRef<Set<string>>(new Set());
  const impressionFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const impressionFlushTaskRef = useRef<InteractionTask | null>(null);

  // Network pagination guard
  const hasReachedNetworkEndRef = useRef(false);
  const nextPageCursorRef = useRef<string | undefined>(undefined);
  const emptyPageStrikeRef = useRef(0);

  const applyFeedSources = useCallback(
    (
      nextLightPosts: FeedPost[],
      nextVideoPosts: FeedVideoPost[],
      options?: {
        preserveRenderedOrder?: boolean;
        preserveExistingPosts?: readonly FeedPost[];
      },
    ) => {
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

      const cleanLightPosts = sortByTime(dedupedLight.filter(isLightFeedPost));
      const dedupedVideos = uniqueById(nextVideoPosts);
      const droppedUnreadyVideos =
        dedupedVideos.length -
        dedupedVideos.filter(isFeedVideoReadyForDisplay).length;
      const cleanVideoPosts = sortByTime(
        dedupedVideos.filter(isFeedVideoReadyForDisplay),
      ) as FeedVideoPost[];

      lightPostsRef.current = cleanLightPosts;
      videoPostsRef.current = cleanVideoPosts;
      const mergedPosts = mergeFeedContentWithVideos(
        cleanLightPosts,
        cleanVideoPosts,
        {
          videoReadiness: isFeedVideoReadyForDisplay,
          ...(options?.preserveRenderedOrder || options?.preserveExistingPosts
            ? {
                preserveExistingPosts:
                  options.preserveExistingPosts ?? mergedPostsRef.current,
              }
            : {}),
        },
      );
      mergedPostsRef.current = mergedPosts;
      setPosts(mergedPosts);
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
        videoWaitingForPoster: droppedUnreadyVideos,
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
      options?: {
        deferDuringScroll?: boolean;
        preserveRenderedOrder?: boolean;
        preserveExistingPosts?: readonly FeedPost[];
      },
    ) => {
      if (options?.deferDuringScroll && isScrollBusyRef.current) {
        pendingCommitRef.current = {
          lightPosts: nextLightPosts,
          videoPosts: nextVideoPosts,
          preserveRenderedOrder: options.preserveRenderedOrder,
          preserveExistingPosts: options.preserveExistingPosts,
        };
        return;
      }
      applyFeedSources(nextLightPosts, nextVideoPosts, {
        preserveRenderedOrder: options?.preserveRenderedOrder,
        preserveExistingPosts: options?.preserveExistingPosts,
      });
    },
    [applyFeedSources],
  );

  const flushPendingCommit = useCallback(() => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    pendingCommitRef.current = null;
    applyFeedSources(pending.lightPosts, pending.videoPosts, {
      preserveRenderedOrder: pending.preserveRenderedOrder,
      preserveExistingPosts: pending.preserveExistingPosts,
    });
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
      isScrollBusyRef.current = busy;
      if (!busy) {
        flushPendingCommit();
        scheduleImpressionFlush(150);
      }
    },
    [flushPendingCommit, scheduleImpressionFlush],
  );

  const updatePostEverywhere = useCallback(
    (updater: (post: FeedPost) => FeedPost) => {
      lightPostsRef.current = lightPostsRef.current
        .map(updater)
        .filter(isLightFeedPost);
      videoPostsRef.current = videoPostsRef.current
        .map(updater)
        .filter(
          (post): post is FeedVideoPost =>
            post.kind === 'video' && isFeedVideoReadyForDisplay(post),
        );
      setPosts(prev => {
        const nextPosts = prev.map(updater);
        mergedPostsRef.current = nextPosts;
        return nextPosts;
      });
      if (feedSourceRef.current === 'all') {
        cacheLightPostsAfterInteractions(lightPostsRef.current);
        cacheVideoPostsAfterInteractions(videoPostsRef.current);
      }
    },
    [],
  );

  const updatePublisherFollowState = useCallback(
    (publisherId: string, isFollowing: boolean) => {
      if (!publisherId) return;
      updatePostEverywhere(post => {
        if (String(post.publisher?.id) !== String(publisherId)) return post;
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
    videoPostsRef.current = videoPostsRef.current.filter(
      post => post.id !== postId,
    );
    prefetchBufferRef.current =
      prefetchBufferRef.current?.filter(post => post.id !== postId) ?? null;
    setPosts(prev => {
      const nextPosts = prev.filter(post => post.id !== postId);
      mergedPostsRef.current = nextPosts;
      return nextPosts;
    });
    if (feedSourceRef.current === 'all') {
      cacheLightPostsAfterInteractions(lightPostsRef.current);
      cacheVideoPostsAfterInteractions(videoPostsRef.current);
    }
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'postReactionChanged',
      (event: {
        postId: string;
        myReaction: ReactionType | null;
        likeCount: number;
        topReactions: ReactionType[];
      }) => {
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

  const ensureVideoBuffer = useCallback(
    (lightCount: number) => {
      if (isFetchingVideosRef.current) return;
      const requiredVideos = getFeedVideoBufferTarget(lightCount);
      if (videoPostsRef.current.length >= requiredVideos) return;

      const missingVideoCount = requiredVideos - videoPostsRef.current.length;
      const cursor =
        videoFetchCursorRef.current ??
        videoPostsRef.current[videoPostsRef.current.length - 1]?.id;
      isFetchingVideosRef.current = true;

      const existingVideoIds = new Set(
        videoPostsRef.current.map(post => post.id),
      );

      repository
        .getVideoPosts(VIDEO_PAGE_SIZE * 2, cursor, feedSourceRef.current)
        .then(async nextVideos => {
          const lastFetchedVideo = nextVideos[nextVideos.length - 1];
          if (lastFetchedVideo?.id) {
            videoFetchCursorRef.current = lastFetchedVideo.id;
          }

          const candidateVideos = nextVideos
            .filter(post => {
              if (existingVideoIds.has(post.id)) return false;
              if (videoCandidateIdsRef.current.has(post.id)) return false;
              return true;
            })
            .slice(0, VIDEO_PAGE_SIZE);

          if (candidateVideos.length === 0) return;

          const prepareLimit = Math.max(
            1,
            Math.min(missingVideoCount, VIDEO_PREPARE_BATCH_SIZE),
          );
          const videosToPrepare = candidateVideos.slice(0, prepareLimit);
          videosToPrepare.forEach(post => {
            videoCandidateIdsRef.current.add(post.id);
          });

          const readyVideos = await prepareFeedVideosForDisplay(
            videosToPrepare,
            prepareLimit,
          );

          if (readyVideos.length === 0) {
            debugFeedVm('video pool waiting for poster', {
              fetched: nextVideos.length,
              candidates: candidateVideos.length,
              cursor: cursor ?? '(none)',
            });
            return;
          }

          commitFeedSources(
            lightPostsRef.current,
            [...videoPostsRef.current, ...readyVideos],
            {
              deferDuringScroll: true,
              preserveRenderedOrder: true,
            },
          );
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
      videoBufferTaskRef.current = InteractionManager.runAfterInteractions(
        () => {
          videoBufferTaskRef.current = null;
          ensureVideoBuffer(lightCount);
        },
      );
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
            hasReachedNetworkEndRef.current =
              page.reachedEnd || !page.nextCursor;
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

  const loadPosts = useCallback(
    async (isPullToRefresh = false) => {
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
      videoFetchCursorRef.current = undefined;
      videoCandidateIdsRef.current = new Set(
        videoPostsRef.current.map(post => post.id),
      );
      if (isPullToRefresh) {
        trackedImpressionIdsRef.current = new Set();
        pendingImpressionIdsRef.current.clear();
      }
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
        hasReachedNetworkEndRef.current =
          page.reachedEnd === true && !page.nextCursor;

        debugFeedVm('initial page', {
          fetched: freshPosts.length,
          nextCursor: page.nextCursor ?? '(none)',
          refresh: isPullToRefresh,
        });

        // On pull-to-refresh, merge the API page with posts already in view,
        // then keep the timeline newest-first. This prevents older cached
        // rows from staying above a post the user just created.
        if (isPullToRefresh) {
          const previousIds = new Set(
            lightPostsRef.current.map(post => post.id),
          );
          const apiIds = new Set(freshPosts.map(post => post.id));
          const knownPosts = lightPostsRef.current.filter(post =>
            apiIds.has(post.id),
          );
          const newPosts = freshPosts.filter(post => !previousIds.has(post.id));
          const merged = sortByTime([...knownPosts, ...newPosts]);
          commitFeedSources(merged, videoPostsRef.current);
        } else {
          commitFeedSources(freshPosts, videoPostsRef.current);
        }
        scheduleVideoBuffer(freshPosts.length);

        // Always start prefetching page 2 — the repository now
        // guarantees a cursor on its first page, so this is safe.
        prefetchNextPage();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'Không tải được bảng tin.',
        );
      } finally {
        setHasLoadedOnce(true);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [commitFeedSources, prefetchNextPage, scheduleVideoBuffer],
  );

  const peekLatestPosts = useCallback(async (limit = PAGE_SIZE) => {
    const posts = await repository.getAllPosts(
      limit,
      undefined,
      feedSourceRef.current,
    );
    return sortByTime(posts).slice(0, limit);
  }, []);

  const loadFreshPostsForNextBatch = useCallback(
    async (batchPosts: FeedPost[] = []) => {
      try {
        const currentPosts = mergedPostsRef.current;
        const existingIds = new Set(currentPosts.map(post => post.id));
        batchPosts.forEach(post => {
          if (post?.id) existingIds.add(post.id);
        });

        const latestPosts = await repository.getAllPosts(
          LOAD_MORE_FRESH_POST_FETCH_LIMIT,
          undefined,
          feedSourceRef.current,
        );
        const freshPosts = pickFreshPostsForLoadMore(
          latestPosts,
          existingIds,
          currentPosts,
        );

        debugFeedVm('load-more fresh head', {
          fetched: latestPosts.length,
          usable: freshPosts.length,
          ids: freshPosts.map(post => post.id),
        });

        return freshPosts;
      } catch (caught) {
        debugFeedVm('load-more fresh head failed', {
          error: caught instanceof Error ? caught.message : String(caught),
        });
        return [];
      }
    },
    [],
  );

  const selectFeedSource = useCallback(
    (nextSource: FeedSource | 'photos') => {
      const nextApiSource = nextSource === 'photos' ? 'all' : nextSource;
      if (feedSourceRef.current === nextApiSource && feedSource === nextSource)
        return;

      feedSourceRef.current = nextApiSource;
      setFeedSourceState(nextSource);
      lightPostsRef.current = [];
      videoPostsRef.current = [];
      videoFetchCursorRef.current = undefined;
      videoCandidateIdsRef.current = new Set();
      prefetchBufferRef.current = null;
      hasReachedNetworkEndRef.current = false;
      nextPageCursorRef.current = undefined;
      emptyPageStrikeRef.current = 0;
      trackedImpressionIdsRef.current = new Set();
      pendingImpressionIdsRef.current.clear();
      mergedPostsRef.current = [];
      setPosts([]);
      setIsAllLoaded(false);
      setHasLoadedOnce(false);
      loadPosts(false);
    },
    [loadPosts, feedSource],
  );

  const loadMorePosts = useCallback(async () => {
    const currentLightPosts = lightPostsRef.current;
    if (
      isLoading ||
      isLoadingMore ||
      isAllLoaded ||
      currentLightPosts.length === 0
    ) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

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
          const visiblePostsBeforeAppend = mergedPostsRef.current;
          // Split newPosts into light and video posts
          const newLight = newPosts.filter(isLightFeedPost);
          const newVideoCandidates = newPosts.filter(
            (p): p is FeedVideoPost => p.kind === 'video',
          );
          newVideoCandidates.forEach(post => {
            videoCandidateIdsRef.current.add(post.id);
          });
          const readyNewVideo = newVideoCandidates.filter(
            isFeedVideoReadyForDisplay,
          );

          const mergedLight = [...currentLightPosts, ...newLight];
          const mergedVideo = [...videoPostsRef.current, ...readyNewVideo];

          // Append paged posts immediately so fast scrolling never reaches a
          // visible end gap while waiting for scroll-idle commit flushing.
          commitFeedSources(mergedLight, mergedVideo, {
            preserveRenderedOrder: true,
          });
          scheduleVideoBuffer(mergedLight.length);
          setTimeout(() => prefetchNextPage(), 0);

          const unreadyNewVideo = newVideoCandidates.filter(
            post => !isFeedVideoReadyForDisplay(post),
          );
          if (unreadyNewVideo.length > 0) {
            void prepareFeedVideosForDisplay(
              unreadyNewVideo,
              VIDEO_PREPARE_BATCH_SIZE,
            ).then(preparedVideos => {
              if (preparedVideos.length === 0) return;
              commitFeedSources(
                lightPostsRef.current,
                [...videoPostsRef.current, ...preparedVideos],
                {
                  deferDuringScroll: true,
                  preserveRenderedOrder: true,
                },
              );
            });
          }

          void loadFreshPostsForNextBatch(newPosts).then(
            async freshHeadPosts => {
              if (freshHeadPosts.length === 0) return;

              const freshLight = freshHeadPosts.filter(isLightFeedPost);
              const freshVideoCandidates = freshHeadPosts.filter(
                (p): p is FeedVideoPost => p.kind === 'video',
              );
              freshVideoCandidates.forEach(post => {
                videoCandidateIdsRef.current.add(post.id);
              });
              const freshVideo = await prepareFeedVideosForDisplay(
                freshVideoCandidates,
                LOAD_MORE_FRESH_POST_LIMIT,
              );
              const readyFreshVideoIds = new Set(
                freshVideo.map(post => post.id),
              );
              const renderableFreshHeadPosts = freshHeadPosts.filter(
                post =>
                  isLightFeedPost(post) ||
                  (post.kind === 'video' && readyFreshVideoIds.has(post.id)),
              );
              if (renderableFreshHeadPosts.length === 0) return;

              const currentLightIds = new Set(
                lightPostsRef.current.map(post => post.id),
              );
              const currentVideoIds = new Set(
                videoPostsRef.current.map(post => post.id),
              );

              commitFeedSources(
                [
                  ...lightPostsRef.current,
                  ...freshLight.filter(post => !currentLightIds.has(post.id)),
                ],
                [
                  ...videoPostsRef.current,
                  ...freshVideo.filter(post => !currentVideoIds.has(post.id)),
                ],
                {
                  deferDuringScroll: true,
                  preserveRenderedOrder: true,
                  preserveExistingPosts: [
                    ...visiblePostsBeforeAppend,
                    ...renderableFreshHeadPosts,
                    ...newPosts,
                  ],
                },
              );
            },
          );
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
        const freshHeadPosts = await loadFreshPostsForNextBatch(newPosts);
        const freshLight = freshHeadPosts.filter(isLightFeedPost);
        const freshVideoCandidates = freshHeadPosts.filter(
          (p): p is FeedVideoPost => p.kind === 'video',
        );
        freshVideoCandidates.forEach(post => {
          videoCandidateIdsRef.current.add(post.id);
        });
        const freshVideo = await prepareFeedVideosForDisplay(
          freshVideoCandidates,
          LOAD_MORE_FRESH_POST_LIMIT,
        );
        const readyFreshVideoIds = new Set(freshVideo.map(post => post.id));
        const renderableFreshHeadPosts = freshHeadPosts.filter(
          post =>
            isLightFeedPost(post) ||
            (post.kind === 'video' && readyFreshVideoIds.has(post.id)),
        );
        const mergedLight = [...currentLightPosts, ...freshLight, ...newPosts];
        const mergedVideo = [...videoPostsRef.current, ...freshVideo];
        const preserveExistingPosts =
          renderableFreshHeadPosts.length > 0
            ? [...mergedPostsRef.current, ...renderableFreshHeadPosts]
            : undefined;

        // Append paged posts immediately so fast scrolling never reaches a
        // visible end gap while waiting for scroll-idle commit flushing.
        commitFeedSources(mergedLight, mergedVideo, {
          preserveRenderedOrder: true,
          preserveExistingPosts,
        });
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
    loadFreshPostsForNextBatch,
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
  const prependPost = useCallback(
    (post: FeedPost) => {
      if (!post?.id || mergedPostsRef.current.some(p => p.id === post.id)) {
        return;
      }

      prefetchBufferRef.current =
        prefetchBufferRef.current?.filter(
          bufferedPost => bufferedPost.id !== post.id,
        ) ?? null;

      if (post.kind === 'video') {
        videoCandidateIdsRef.current.add(post.id);
        videoPostsRef.current = sortByTime([
          post,
          ...videoPostsRef.current,
        ]) as FeedVideoPost[];
        if (!isFeedVideoReadyForDisplay(post)) {
          InteractionManager.runAfterInteractions(() => {
            prepareFeedVideoForDisplay(post).then(isReady => {
              if (!isReady) return;
              if (!videoPostsRef.current.some(video => video.id === post.id)) {
                videoPostsRef.current = sortByTime([
                  post,
                  ...videoPostsRef.current,
                ]) as FeedVideoPost[];
              }
              commitFeedSources(lightPostsRef.current, videoPostsRef.current, {
                preserveRenderedOrder: true,
                preserveExistingPosts: mergedPostsRef.current,
              });
            });
          });
        }
      } else if (isLightFeedPost(post)) {
        lightPostsRef.current = sortByTime([post, ...lightPostsRef.current]);
      }

      setPosts(prev => {
        if (prev.some(existingPost => existingPost.id === post.id)) {
          return prev;
        }
        const nextPosts = [post, ...prev];
        mergedPostsRef.current = nextPosts;
        return nextPosts;
      });

      if (feedSourceRef.current === 'all') {
        cacheLightPostsAfterInteractions(lightPostsRef.current);
        cacheVideoPostsAfterInteractions(videoPostsRef.current);
      }
    },
    [commitFeedSources],
  );
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
    setScrollBusy,
    prependPost,
    updatePublisherFollowState,
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

    /**
     * Toggle report/unreport a post. No optimistic update needed.
     */
    reportPost: (postId: string) => repository.reportPost(postId),

    /**
     * Hide only affects the current app feed view. The backend v2
     * post-actions endpoint does not expose a hide action.
     */
    hidePost: (postId: string) => {
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
