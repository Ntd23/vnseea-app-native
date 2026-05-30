import { createMMKV } from 'react-native-mmkv';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import type { ProductItem } from '../../../product/domain/types/product.types';

const storage = createMMKV({ id: 'vnseea-feed-cache' });

import type { EventsItem } from '../../../events/domain/types/events.types';

const POSTS_CACHE_KEY = 'feed.posts.page1';
const PRODUCTS_CACHE_KEY = 'feed.products.page1';
const EVENTS_CACHE_KEY = 'feed.events.page1';

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

  clearAllCache() {
    storage.remove(POSTS_CACHE_KEY);
    storage.remove(PRODUCTS_CACHE_KEY);
    storage.remove(EVENTS_CACHE_KEY);
  },
};
