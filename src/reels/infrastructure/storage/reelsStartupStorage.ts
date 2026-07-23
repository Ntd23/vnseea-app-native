import { createMMKV } from 'react-native-mmkv';

import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ReelsItem, ReelsPage } from '../../domain/types/reels.types';

const storage = createMMKV({ id: 'vnseea-reels-startup-cache' });
const REELS_STARTUP_PAGE_KEY = 'reels.startup.page1.v1';

export const REELS_STARTUP_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

type StoredReelsStartupPage = ReelsPage & {
  cachedAt: number;
  userId: string;
};

function getCurrentUserId() {
  return String(sessionStorage.getSession()?.userId ?? '');
}

function stripRawPayload(item: ReelsItem): ReelsItem {
  const cacheableItem = { ...item };
  delete cacheableItem.raw;
  return cacheableItem;
}

function isPlayableCachedReel(item: ReelsItem | null | undefined) {
  return Boolean(item?.id && item.videoUrl && item.publisher?.userId);
}

export function readCachedReelsStartupPage(
  now = Date.now(),
): StoredReelsStartupPage | null {
  try {
    const json = storage.getString(REELS_STARTUP_PAGE_KEY);
    if (!json) return null;

    const cached = JSON.parse(json) as StoredReelsStartupPage;
    const currentUserId = getCurrentUserId();
    const cacheAge = now - Number(cached.cachedAt || 0);
    if (
      !currentUserId ||
      cached.userId !== currentUserId ||
      cacheAge < 0 ||
      cacheAge > REELS_STARTUP_CACHE_MAX_AGE_MS ||
      !Array.isArray(cached.items)
    ) {
      storage.remove(REELS_STARTUP_PAGE_KEY);
      return null;
    }

    const items = cached.items.filter(isPlayableCachedReel).slice(0, 20);
    if (items.length === 0) return null;

    return {
      ...cached,
      items,
      nextCursor: cached.nextCursor ? String(cached.nextCursor) : null,
    };
  } catch {
    storage.remove(REELS_STARTUP_PAGE_KEY);
    return null;
  }
}

export function writeCachedReelsStartupPage(
  page: ReelsPage,
  cachedAt = Date.now(),
) {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    const items = page.items
      .filter(isPlayableCachedReel)
      .slice(0, 20)
      .map(stripRawPayload);
    if (items.length === 0) return;

    const payload: StoredReelsStartupPage = {
      userId,
      cachedAt,
      items,
      nextCursor: page.nextCursor,
    };
    storage.set(REELS_STARTUP_PAGE_KEY, JSON.stringify(payload));
  } catch {
    // Startup cache is an optional performance layer. A serialization or
    // storage failure must never block the Reel feed itself.
  }
}

export function clearCachedReelsStartupPage() {
  storage.remove(REELS_STARTUP_PAGE_KEY);
}
