// Description: Invalidates and optimistically updates profile posts after commerce content changes.
import type { FeedPost } from '../../domain/types/feed.types';

type ProfilePostsChangedListener = (post?: FeedPost) => void;

const listeners = new Set<ProfilePostsChangedListener>();
const pendingPosts = new Map<string, FeedPost>();
const MAX_PENDING_POSTS = 30;

export const profilePostsChangedEvents = {
  emit(post?: FeedPost) {
    if (post) {
      pendingPosts.delete(String(post.id));
      pendingPosts.set(String(post.id), post);
      while (pendingPosts.size > MAX_PENDING_POSTS) {
        const oldestKey = pendingPosts.keys().next().value;
        if (!oldestKey) break;
        pendingPosts.delete(oldestKey);
      }
    }
    listeners.forEach(listener => listener(post));
  },
  getPendingPosts() {
    return Array.from(pendingPosts.values());
  },
  subscribe(listener: ProfilePostsChangedListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
