import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';
import type { FeedVideoPost } from '../../../feed/domain/types/feed.types';
import { isFeedPostShareable } from '../../../feed/domain/policies/feedPostPrivacy';
import type { ReelsItem, ReelsPage } from '../../domain/types/reels.types';
import { createReelsRepository } from '../../infrastructure/repositories/ApiReelsRepository';
import {
  readCachedReelsStartupPage,
  writeCachedReelsStartupPage,
} from '../../infrastructure/storage/reelsStartupStorage';

const repository = createReelsRepository();
const REELS_STARTUP_PAGE_SIZE = 20;
const REELS_REMOTE_CACHE_FRESH_MS = 60 * 1000;
const REELS_STARTUP_ITEM_LIMIT = 40;

export type ReelsStartupSnapshot = ReelsPage & {
  hasMore: boolean;
};

let hydrated = false;
let remoteSnapshot: (ReelsPage & { fetchedAt: number }) | null = null;
let firstPageRequest: Promise<ReelsPage> | null = null;

function playableItems(items: ReelsItem[]) {
  return items.filter(item => Boolean(item?.id && item.videoUrl));
}

function hydrateRemoteSnapshot() {
  if (hydrated) return remoteSnapshot;
  hydrated = true;
  const cached = readCachedReelsStartupPage();
  if (cached) {
    remoteSnapshot = {
      items: cached.items,
      nextCursor: cached.nextCursor,
      fetchedAt: cached.cachedAt,
    };
  }
  return remoteSnapshot;
}

export function mapFeedVideoPostToReel(post: FeedVideoPost): ReelsItem {
  return {
    id: post.id,
    videoUrl: post.videoUrl,
    thumbnailUrl: post.thumbnailUrl,
    caption: post.caption,
    privacy: post.privacy,
    privacyContract: post.privacyContract ?? 'legacy_feed',
    isAnonymous: post.isAnonymous === true,
    canShare: isFeedPostShareable(post),
    canEdit: post.permissions?.canEdit === true,
    canShareKnown: post.permissions
      ? post.permissions.canShareKnown !== false
      : false,
    postedAt: post.postedAt,
    publisher: {
      userId: post.publisher.id,
      username: post.publisher.username,
      name: post.publisher.name,
      avatarUrl: post.publisher.avatarUrl,
      isVerified: false,
      isFollowing: post.publisher.isFollowing,
    },
    isReposted: Boolean(post.sharedPostId),
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    viewCount: post.viewCount ?? 0,
    isLiked: post.isLiked,
    isSaved: post.isSaved ?? false,
    myReaction: post.myReaction,
  };
}

function resolveMergedSharePermission(
  current: ReelsItem,
  snapshot: ReelsItem,
  post: FeedVideoPost,
): Pick<ReelsItem, 'canShare' | 'canShareKnown'> {
  const structurallyShareable =
    post.privacy === 'public' &&
    post.isAnonymous !== true &&
    !post.sharedPostId;

  if (!structurallyShareable) {
    return { canShare: false, canShareKnown: true };
  }

  if (snapshot.canShareKnown !== false) {
    return { canShare: snapshot.canShare, canShareKnown: true };
  }

  if (current.canShareKnown === false) {
    return { canShare: false, canShareKnown: false };
  }

  return { canShare: current.canShare, canShareKnown: true };
}

/**
 * Reconcile the canonical Feed post snapshot into an already-rendered reel.
 *
 * The post-detail endpoint and the dedicated Reels endpoint do not always
 * return exactly the same media/publisher fields, so keep the existing reel
 * as the base while replacing authoritative engagement data from realtime.
 */
export function mergeFeedVideoPostSnapshotIntoReel(
  current: ReelsItem,
  post: FeedVideoPost,
): ReelsItem {
  if (String(current.id) !== String(post.id)) return current;

  const snapshot = mapFeedVideoPostToReel(post);
  const sharePermission = resolveMergedSharePermission(current, snapshot, post);

  return {
    ...current,
    ...snapshot,
    ...sharePermission,
    videoUrl: snapshot.videoUrl || current.videoUrl,
    thumbnailUrl: snapshot.thumbnailUrl ?? current.thumbnailUrl,
    viewCount: post.viewCount ?? current.viewCount,
    isSaved: post.isSaved ?? current.isSaved,
    isReposted: snapshot.isReposted || current.isReposted,
    publisher: {
      ...current.publisher,
      ...snapshot.publisher,
      // FeedPublisher does not carry the Reels-only verification/admin flags.
      isVerified: current.publisher.isVerified,
      isAdmin: current.publisher.isAdmin,
    },
    raw: post,
  };
}

export function mergeReelsStartupItems(
  currentItems: ReelsItem[],
  freshItems: ReelsItem[],
) {
  if (currentItems.length === 0) return playableItems(freshItems);

  const freshById = new Map(
    playableItems(freshItems).map(item => [String(item.id), item]),
  );
  const seen = new Set<string>();
  const merged = currentItems
    .filter(item => Boolean(item?.id && item.videoUrl))
    .map(item => {
      const id = String(item.id);
      seen.add(id);
      return freshById.get(id) ?? item;
    });

  for (const item of freshById.values()) {
    const id = String(item.id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(item);
    if (merged.length >= REELS_STARTUP_ITEM_LIMIT) break;
  }

  return merged.slice(0, REELS_STARTUP_ITEM_LIMIT);
}

export function getReelsStartupSnapshot(initialVideo?: {
  id: string;
  post: FeedVideoPost;
}): ReelsStartupSnapshot {
  const cachedRemote = hydrateRemoteSnapshot();
  const cachedFeedItems = cachedRemote
    ? []
    : feedCacheStorage
        .getCachedVideoPosts()
        .map(mapFeedVideoPostToReel)
        .filter(item => Boolean(item.videoUrl))
        .slice(0, REELS_STARTUP_PAGE_SIZE);
  const baseItems = cachedRemote?.items ?? cachedFeedItems;

  let items = playableItems(baseItems);
  if (initialVideo) {
    const initialItem = mapFeedVideoPostToReel(initialVideo.post);
    items = [
      initialItem,
      ...items.filter(item => String(item.id) !== String(initialVideo.id)),
    ];
  }

  return {
    items: items.slice(0, REELS_STARTUP_ITEM_LIMIT),
    nextCursor: cachedRemote?.nextCursor ?? null,
    hasMore: cachedRemote ? cachedRemote.nextCursor !== null : true,
  };
}

export async function fetchReelsStartupPage(options: { force?: boolean } = {}) {
  const cachedRemote = hydrateRemoteSnapshot();
  if (
    !options.force &&
    cachedRemote &&
    Date.now() - cachedRemote.fetchedAt <= REELS_REMOTE_CACHE_FRESH_MS
  ) {
    return {
      items: cachedRemote.items,
      nextCursor: cachedRemote.nextCursor,
    };
  }

  if (firstPageRequest) return firstPageRequest;

  firstPageRequest = repository
    .fetchReels({ limit: REELS_STARTUP_PAGE_SIZE })
    .then(page => {
      const normalizedPage = {
        items: playableItems(page.items).slice(0, REELS_STARTUP_PAGE_SIZE),
        nextCursor: page.nextCursor,
      };
      remoteSnapshot = { ...normalizedPage, fetchedAt: Date.now() };
      writeCachedReelsStartupPage(normalizedPage, remoteSnapshot.fetchedAt);
      return normalizedPage;
    })
    .finally(() => {
      firstPageRequest = null;
    });

  return firstPageRequest;
}

export function preloadReelsStartupPage() {
  return fetchReelsStartupPage();
}

export function resetReelsStartupMemoryCacheForTests() {
  hydrated = false;
  remoteSnapshot = null;
  firstPageRequest = null;
}
