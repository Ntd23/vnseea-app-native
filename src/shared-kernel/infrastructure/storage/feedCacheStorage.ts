import { createMMKV } from 'react-native-mmkv';
import type {
  FeedPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import type { ProductItem } from '../../../product/domain/types/product.types';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import type { FundingItem } from '../../../funding/domain/types/funding.types';

const storage = createMMKV({ id: 'vnseea-feed-cache' });

import type { EventsItem } from '../../../events/domain/types/events.types';

const POSTS_CACHE_KEY = 'feed.posts.page1';
const VIDEOS_CACHE_KEY = 'feed.videos.page1';
const PRODUCTS_CACHE_KEY = 'feed.products.page1';
const JOBS_CACHE_KEY = 'feed.jobs.page1';
const EVENTS_CACHE_KEY = 'feed.events.page1';
const PAGES_CACHE_KEY = 'feed.pages.page1';
const FUNDING_CACHE_KEY = 'feed.funding.page1';

export const feedCacheStorage = {
  getCachedPosts(): FeedPost[] {
    try {
      const json = storage.getString(POSTS_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as FeedPost[];
    } catch (err) {
      console.warn('Failed to parse cached posts:', err);
      return [];
    }
  },

  setCachedPosts(posts: FeedPost[]) {
    try {
      // Save the first 50 posts so cold-start has a generous scroll buffer.
      // 50 posts ≈ 100–150 KB JSON — well within MMKV perf budget.
      storage.set(POSTS_CACHE_KEY, JSON.stringify(posts.slice(0, 50)));
    } catch (err) {
      console.warn('Failed to set cached posts:', err);
    }
  },

  getCachedVideoPosts(): FeedVideoPost[] {
    try {
      const json = storage.getString(VIDEOS_CACHE_KEY);
      if (!json) return [];
      return JSON.parse(json) as FeedVideoPost[];
    } catch (err) {
      console.warn('Failed to parse cached feed videos:', err);
      return [];
    }
  },

  setCachedVideoPosts(posts: FeedVideoPost[]) {
    try {
      storage.set(VIDEOS_CACHE_KEY, JSON.stringify(posts.slice(0, 30)));
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
    storage.remove(POSTS_CACHE_KEY);
    storage.remove(VIDEOS_CACHE_KEY);
    storage.remove(PRODUCTS_CACHE_KEY);
    storage.remove(JOBS_CACHE_KEY);
    storage.remove(EVENTS_CACHE_KEY);
    storage.remove(PAGES_CACHE_KEY);
    storage.remove(FUNDING_CACHE_KEY);
  },
};
