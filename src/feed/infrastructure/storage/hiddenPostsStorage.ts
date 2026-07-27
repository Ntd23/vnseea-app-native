// Description: Persists posts hidden by the current user on this device.
import { createMMKV } from 'react-native-mmkv';
import { DeviceEventEmitter } from 'react-native';

const storage = createMMKV({ id: 'vnseea-hidden-posts' });
const HIDDEN_POSTS_KEY_PREFIX = 'hidden-post-ids';
const MAX_HIDDEN_POST_IDS = 1_000;
export const LOCAL_POST_HIDDEN_EVENT = 'localPostHidden';

function getStorageKey(userId?: string) {
  const ownerKey = userId?.trim() || 'guest';
  return `${HIDDEN_POSTS_KEY_PREFIX}:${ownerKey}`;
}

function readHiddenPostIds(userId?: string): string[] {
  try {
    const raw = storage.getString(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(value => String(value).trim())
      .filter(Boolean)
      .slice(0, MAX_HIDDEN_POST_IDS);
  } catch (error) {
    console.warn('[hidden-posts] Failed to read local hidden posts:', error);
    return [];
  }
}

export const hiddenPostsStorage = {
  getHiddenPostIds(userId?: string) {
    return new Set(readHiddenPostIds(userId));
  },

  isHidden(postId: string, userId?: string) {
    const normalizedPostId = String(postId).trim();
    if (!normalizedPostId) return false;
    return readHiddenPostIds(userId).includes(normalizedPostId);
  },

  hidePost(postId: string, userId?: string) {
    const normalizedPostId = String(postId).trim();
    if (!normalizedPostId) return;

    const nextIds = [
      normalizedPostId,
      ...readHiddenPostIds(userId).filter(id => id !== normalizedPostId),
    ].slice(0, MAX_HIDDEN_POST_IDS);
    storage.set(getStorageKey(userId), JSON.stringify(nextIds));
    DeviceEventEmitter.emit(LOCAL_POST_HIDDEN_EVENT, {
      postId: normalizedPostId,
      userId: userId?.trim() || 'guest',
    });
  },

  filterVisiblePosts<T extends { id: string }>(posts: T[], userId?: string) {
    const hiddenIds = new Set(readHiddenPostIds(userId));
    if (hiddenIds.size === 0) return posts;
    return posts.filter(post => !hiddenIds.has(String(post.id)));
  },

  clear(userId?: string) {
    storage.remove(getStorageKey(userId));
  },
};
