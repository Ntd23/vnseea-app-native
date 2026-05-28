import { createMMKV } from 'react-native-mmkv';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import type { ProductItem } from '../../../product/domain/types/product.types';

const storage = createMMKV({ id: 'vnseea-feed-cache' });

const POSTS_CACHE_KEY = 'feed.posts.page1';
const PRODUCTS_CACHE_KEY = 'feed.products.page1';

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
      // Save only the first 10 posts (page 1) to avoid bloated cache size
      storage.set(POSTS_CACHE_KEY, JSON.stringify(posts.slice(0, 10)));
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
      // Save only the first 5 products to avoid bloated cache size
      storage.set(PRODUCTS_CACHE_KEY, JSON.stringify(products.slice(0, 5)));
    } catch (err) {
      console.warn('Failed to set cached products:', err);
    }
  },

  clearAllCache() {
    storage.remove(POSTS_CACHE_KEY);
    storage.remove(PRODUCTS_CACHE_KEY);
  },
};
