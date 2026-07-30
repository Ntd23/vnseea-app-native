// Description: Persists per-account story-ad view order for local rotation.
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'vnseea-story-ad-rotation' });
const HISTORY_KEY_PREFIX = 'viewed-story-ad-ids';
const MAX_HISTORY_SIZE = 200;

function getOwnerKey(userId?: string) {
  return userId?.trim() || 'guest';
}

function getStorageKey(userId?: string) {
  return `${HISTORY_KEY_PREFIX}:${getOwnerKey(userId)}`;
}

function readViewedAdIds(userId?: string) {
  try {
    const raw = storage.getString(getStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const ids: string[] = [];
    for (const value of parsed) {
      const id = String(value).trim();
      if (!id || ids.includes(id)) continue;
      ids.push(id);
    }
    return ids.slice(-MAX_HISTORY_SIZE);
  } catch {
    return [];
  }
}

export const storyAdRotationStorage = {
  getViewedAdIds(userId?: string) {
    return readViewedAdIds(userId);
  },

  markViewed(adId: string, userId?: string) {
    const normalizedAdId = String(adId).trim();
    if (!normalizedAdId) return;

    const nextIds = [
      ...readViewedAdIds(userId).filter(id => id !== normalizedAdId),
      normalizedAdId,
    ].slice(-MAX_HISTORY_SIZE);
    storage.set(getStorageKey(userId), JSON.stringify(nextIds));
  },

  clear(userId?: string) {
    storage.remove(getStorageKey(userId));
  },
};
