// Description: Persists live post ids that have ended on this device.
import { DeviceEventEmitter } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'vnseea-ended-live-posts' });
const ENDED_LIVE_POSTS_KEY_PREFIX = 'ended-live-post-ids';
const MAX_ENDED_LIVE_POST_IDS = 1_000;

export const LOCAL_LIVE_ENDED_EVENT = 'localLiveEnded';

function emitLiveInactive(postId: string, userId?: string) {
  DeviceEventEmitter.emit(LOCAL_LIVE_ENDED_EVENT, {
    postId,
    userId: getOwnerKey(userId),
  });
}

function getOwnerKey(userId?: string) {
  return userId?.trim() || 'guest';
}

function getStorageKey(userId?: string) {
  return `${ENDED_LIVE_POSTS_KEY_PREFIX}:${getOwnerKey(userId)}`;
}

function readEndedLivePostIds(userId?: string): string[] {
  try {
    const raw = storage.getString(getStorageKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(value => String(value).trim())
      .filter(Boolean)
      .slice(0, MAX_ENDED_LIVE_POST_IDS);
  } catch (error) {
    console.warn('[ended-live-posts] Failed to read local state:', error);
    return [];
  }
}

export const endedLivePostsStorage = {
  getEndedPostIds(userId?: string) {
    return new Set(readEndedLivePostIds(userId));
  },

  hasEnded(postId: string | number, userId?: string) {
    const normalizedPostId = String(postId).trim();
    if (!normalizedPostId) return false;
    return readEndedLivePostIds(userId).includes(normalizedPostId);
  },

  markEnded(postId: string | number, userId?: string) {
    const normalizedPostId = String(postId).trim();
    if (!normalizedPostId) return;

    const currentIds = readEndedLivePostIds(userId);
    if (currentIds.includes(normalizedPostId)) return;

    const nextIds = [
      normalizedPostId,
      ...currentIds,
    ].slice(0, MAX_ENDED_LIVE_POST_IDS);

    storage.set(getStorageKey(userId), JSON.stringify(nextIds));
    emitLiveInactive(normalizedPostId, userId);
  },

  notifyInactive(postId: string | number, userId?: string) {
    const normalizedPostId = String(postId).trim();
    if (!normalizedPostId) return;
    emitLiveInactive(normalizedPostId, userId);
  },

  filterVisiblePosts<T extends { id: string | number }>(
    posts: T[],
    userId?: string,
  ) {
    const endedIds = new Set(readEndedLivePostIds(userId));
    if (endedIds.size === 0) return posts;
    return posts.filter(post => !endedIds.has(String(post.id)));
  },

  filterActiveStreams<T extends { postId: string | number }>(
    streams: T[],
    userId?: string,
  ) {
    const endedIds = new Set(readEndedLivePostIds(userId));
    if (endedIds.size === 0) return streams;
    return streams.filter(stream => !endedIds.has(String(stream.postId)));
  },

  clear(userId?: string) {
    storage.remove(getStorageKey(userId));
  },
};
