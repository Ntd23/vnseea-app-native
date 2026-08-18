import { createMMKV } from 'react-native-mmkv';
import type {
  FeedPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import type { ProductItem } from '../../../product/domain/types/product.types';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import type { FundingItem } from '../../../funding/domain/types/funding.types';
import { sessionStorage } from './sessionStorage';

const storage = createMMKV({ id: 'vnseea-feed-cache' });

import type { EventsItem } from '../../../events/domain/types/events.types';

const LEGACY_POSTS_CACHE_KEY = 'feed.posts.page1';
const LEGACY_VIDEOS_CACHE_KEY = 'feed.videos.page1';
// v4 bounds the synchronous cold-start runway. Ignore older, oversized
// snapshots instead of parsing and mounting them during the first scroll.
const POSTS_CACHE_KEY_PREFIX = 'feed.posts.snapshot.v4';
const VIDEOS_CACHE_KEY_PREFIX = 'feed.videos.v4';
const PREVIOUS_POSTS_CACHE_KEY_PREFIX = 'feed.posts.snapshot.v3';
const PREVIOUS_VIDEOS_CACHE_KEY_PREFIX = 'feed.videos.v3';
const PRODUCTS_CACHE_KEY = 'feed.products.page1';
const JOBS_CACHE_KEY = 'feed.jobs.page1';
const EVENTS_CACHE_KEY = 'feed.events.page1';
const PAGES_CACHE_KEY = 'feed.pages.page1';
const FUNDING_CACHE_KEY = 'feed.funding.page1';
const MAX_CACHED_POSTS = 30;
const MAX_CACHED_VIDEOS = 8;

export type FeedPostsCacheSnapshot = {
  posts: FeedPost[];
  nextCursor?: string;
  reachedEnd: boolean;
  updatedAt: number;
};

function getFeedCacheOwner(userId?: string) {
  return (
    userId?.trim() ||
    sessionStorage.getSession()?.userId?.trim() ||
    'guest'
  );
}

function getPostsCacheKey(userId?: string) {
  return `${POSTS_CACHE_KEY_PREFIX}:${getFeedCacheOwner(userId)}`;
}

function getVideosCacheKey(userId?: string) {
  return `${VIDEOS_CACHE_KEY_PREFIX}:${getFeedCacheOwner(userId)}`;
}

function getPreviousPostsCacheKey(userId?: string) {
  return `${PREVIOUS_POSTS_CACHE_KEY_PREFIX}:${getFeedCacheOwner(userId)}`;
}

function getPreviousVideosCacheKey(userId?: string) {
  return `${PREVIOUS_VIDEOS_CACHE_KEY_PREFIX}:${getFeedCacheOwner(userId)}`;
}

function isPoisonedAdCursor(posts: FeedPost[], cursor?: string) {
  if (!cursor) return false;
  return posts.some(
    post =>
      post.kind === 'ad' &&
      (post.id === `ad:${cursor}` || String(post.adId ?? '') === cursor),
  );
}

export const feedCacheStorage = {
  getCachedPostsSnapshot(userId?: string): FeedPostsCacheSnapshot | null {
    try {
      const json = storage.getString(getPostsCacheKey(userId));
      if (!json) return null;
      const parsed = JSON.parse(json) as Partial<FeedPostsCacheSnapshot>;
      if (!Array.isArray(parsed.posts)) return null;

      const wasTruncated = parsed.posts.length > MAX_CACHED_POSTS;
      const cachedPosts = parsed.posts.slice(0, MAX_CACHED_POSTS);
      const parsedNextCursor =
        typeof parsed.nextCursor === 'string' && parsed.nextCursor.trim()
          ? parsed.nextCursor.trim()
          : undefined;
      const poisonedCursor = isPoisonedAdCursor(
        cachedPosts,
        parsedNextCursor,
      );
      const shouldReanchorPagination = wasTruncated || poisonedCursor;

      return {
        posts: cachedPosts,
        nextCursor: shouldReanchorPagination ? undefined : parsedNextCursor,
        // Old app versions could persist ad id 18 as both the cursor and an
        // end-of-feed verdict. Keep the warm rows, but force pagination to
        // re-anchor from real posts after upgrading.
        reachedEnd: shouldReanchorPagination
          ? false
          : parsed.reachedEnd === true,
        updatedAt: Math.max(0, Number(parsed.updatedAt) || 0),
      };
    } catch (err) {
      console.warn('Failed to parse cached feed snapshot:', err);
      return null;
    }
  },

  setCachedPostsSnapshot(
    snapshot: Omit<FeedPostsCacheSnapshot, 'updatedAt'>,
    userId?: string,
  ) {
    try {
      const wasTruncated = snapshot.posts.length > MAX_CACHED_POSTS;
      storage.set(
        getPostsCacheKey(userId),
        JSON.stringify({
          posts: snapshot.posts.slice(0, MAX_CACHED_POSTS),
          // A cursor beyond rows removed from the cache would permanently
          // skip those rows on the next pagination request. Re-anchor from
          // the fresh head request whenever the persisted runway is cut.
          nextCursor: wasTruncated ? undefined : snapshot.nextCursor,
          reachedEnd: wasTruncated ? false : snapshot.reachedEnd,
          updatedAt: Date.now(),
        }),
      );
      // The legacy key was shared by every signed-in account. Remove it
      // instead of migrating possibly-private data to the current user.
      storage.remove(LEGACY_POSTS_CACHE_KEY);
      storage.remove(getPreviousPostsCacheKey(userId));
    } catch (err) {
      console.warn('Failed to set cached feed snapshot:', err);
    }
  },

  getCachedPosts(userId?: string): FeedPost[] {
    return this.getCachedPostsSnapshot(userId)?.posts ?? [];
  },

  setCachedPosts(posts: FeedPost[], userId?: string) {
    try {
      // Preserve cursor metadata when a legacy caller only replaces the rows.
      const previous = this.getCachedPostsSnapshot(userId);
      this.setCachedPostsSnapshot(
        {
          posts,
          nextCursor: previous?.nextCursor,
          reachedEnd: previous?.reachedEnd ?? false,
        },
        userId,
      );
    } catch (err) {
      console.warn('Failed to set cached posts:', err);
    }
  },

  getCachedVideoPosts(userId?: string): FeedVideoPost[] {
    try {
      const json = storage.getString(getVideosCacheKey(userId));
      if (!json) return [];
      const parsed = JSON.parse(json);
      return Array.isArray(parsed)
        ? (parsed.slice(0, MAX_CACHED_VIDEOS) as FeedVideoPost[])
        : [];
    } catch (err) {
      console.warn('Failed to parse cached feed videos:', err);
      return [];
    }
  },

  setCachedVideoPosts(posts: FeedVideoPost[], userId?: string) {
    try {
      storage.set(
        getVideosCacheKey(userId),
        JSON.stringify(posts.slice(0, MAX_CACHED_VIDEOS)),
      );
      storage.remove(LEGACY_VIDEOS_CACHE_KEY);
      storage.remove(getPreviousVideosCacheKey(userId));
    } catch (err) {
      console.warn('Failed to set cached feed videos:', err);
    }
  },

  getCachedProducts(): ProductItem[] {
    try {
      const json = storage.getString(PRODUCTS_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as ProductItem[];
    } catch (err) {
      console.warn('Failed to parse cached products:', err);
      return [];
    }
  },

  setCachedProducts(products: ProductItem[]) {
    try {
      // Save the first 25 products for richer cold-start display.
      storage.set(PRODUCTS_CACHE_KEY, JSON.stringify(products.slice(0, 25)));
    } catch (err) {
      console.warn('Failed to set cached products:', err);
    }
  },

  getCachedJobs(): JobsItem[] {
    try {
      const json = storage.getString(JOBS_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as JobsItem[];
    } catch (err) {
      console.warn('Failed to parse cached jobs:', err);
      return [];
    }
  },

  setCachedJobs(jobs: JobsItem[]) {
    try {
      storage.set(JOBS_CACHE_KEY, JSON.stringify(jobs.slice(0, 30)));
    } catch (err) {
      console.warn('Failed to set cached jobs:', err);
    }
  },

  getCachedEvents(): EventsItem[] {
    try {
      const json = storage.getString(EVENTS_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as EventsItem[];
    } catch (err) {
      console.warn('Failed to parse cached events:', err);
      return [];
    }
  },

  setCachedEvents(events: EventsItem[]) {
    try {
      // Save the first 10 events for richer cold-start display.
      storage.set(EVENTS_CACHE_KEY, JSON.stringify(events.slice(0, 10)));
    } catch (err) {
      console.warn('Failed to set cached events:', err);
    }
  },

  getCachedPages(): PagesItem[] {
    try {
      const json = storage.getString(PAGES_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as PagesItem[];
    } catch (err) {
      console.warn('Failed to parse cached pages:', err);
      return [];
    }
  },

  setCachedPages(pages: PagesItem[]) {
    try {
      storage.set(PAGES_CACHE_KEY, JSON.stringify(pages.slice(0, 12)));
    } catch (err) {
      console.warn('Failed to set cached pages:', err);
    }
  },

  getCachedFunding(): FundingItem[] {
    try {
      const json = storage.getString(FUNDING_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as FundingItem[];
    } catch (err) {
      console.warn('Failed to parse cached funding:', err);
      return [];
    }
  },

  setCachedFunding(campaigns: FundingItem[]) {
    try {
      storage.set(FUNDING_CACHE_KEY, JSON.stringify(campaigns.slice(0, 10)));
    } catch (err) {
      console.warn('Failed to set cached funding:', err);
    }
  },

  clearAllCache() {
    storage.remove(getPostsCacheKey());
    storage.remove(getVideosCacheKey());
    storage.remove(getPreviousPostsCacheKey());
    storage.remove(getPreviousVideosCacheKey());
    storage.remove(LEGACY_POSTS_CACHE_KEY);
    storage.remove(LEGACY_VIDEOS_CACHE_KEY);
    storage.remove(PRODUCTS_CACHE_KEY);
    storage.remove(JOBS_CACHE_KEY);
    storage.remove(EVENTS_CACHE_KEY);
    storage.remove(PAGES_CACHE_KEY);
    storage.remove(FUNDING_CACHE_KEY);
  },
};
