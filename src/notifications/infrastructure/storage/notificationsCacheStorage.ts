// Description: MMKV-backed first-paint cache for the notification center.
import { createMMKV } from 'react-native-mmkv';
import type { NotificationsItem } from '../../domain/types/notifications.types';

const storage = createMMKV({ id: 'vnseea-notifications-cache' });
const CACHE_KEY_PREFIX = 'notifications:first-page';
const MAX_CACHED_NOTIFICATIONS = 100;

export type NotificationsCacheSnapshot = {
  items: NotificationsItem[];
  nextOffset: string | null;
  hasMore: boolean;
  unreadCount: number;
  updatedAt: number;
};

function getCacheKey(userId?: string) {
  return `${CACHE_KEY_PREFIX}:${userId?.trim() || 'guest'}`;
}

export const notificationsCacheStorage = {
  getSnapshot(userId?: string): NotificationsCacheSnapshot | null {
    try {
      const raw = storage.getString(getCacheKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<NotificationsCacheSnapshot>;
      if (!Array.isArray(parsed.items)) return null;
      return {
        items: parsed.items.slice(0, MAX_CACHED_NOTIFICATIONS),
        nextOffset:
          typeof parsed.nextOffset === 'string' ? parsed.nextOffset : null,
        hasMore: parsed.hasMore !== false,
        unreadCount: Math.max(0, Number(parsed.unreadCount) || 0),
        updatedAt: Math.max(0, Number(parsed.updatedAt) || 0),
      };
    } catch (error) {
      console.warn('[notifications-cache] Failed to read cache:', error);
      return null;
    }
  },

  setSnapshot(
    snapshot: Omit<NotificationsCacheSnapshot, 'updatedAt'>,
    userId?: string,
  ) {
    try {
      storage.set(
        getCacheKey(userId),
        JSON.stringify({
          ...snapshot,
          items: snapshot.items.slice(0, MAX_CACHED_NOTIFICATIONS),
          updatedAt: Date.now(),
        }),
      );
    } catch (error) {
      console.warn('[notifications-cache] Failed to save cache:', error);
    }
  },

  clear(userId?: string) {
    storage.remove(getCacheKey(userId));
  },
};
