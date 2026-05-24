// Description: Lightweight pub/sub for newly-created posts so screens can
// react without coupling through navigation params.
//
// WHY THIS EXISTS
// ───────────────
// `useFeedViewModel` lives inside `FeedScreen`. When the user creates a
// post from `CreatePostScreen` (a separate screen on the stack), there is
// no direct way to call FeedScreen's `prependTextPost`. The alternatives
// we considered:
//
//   1. Navigation params with a callback — works but TypeScript-noisy and
//      the callback identity changes every render, causing stale closures.
//   2. Global state (Zustand / Redux) — overkill for a single event.
//   3. Refetch on focus — works but loses the snappy optimistic feel.
//   4. Module-level pub/sub  ← chosen. Single source of truth, no extra
//      deps, easy to test, trivial to extend (e.g. add `postDeleted`).
//
// Anyone can subscribe; the FeedScreen does so on mount and calls
// `vm.prependTextPost` when the event fires.

import type { FeedTextPost } from '../../domain/types/feed.types';

type PostCreatedListener = (post: FeedTextPost) => void;

const listeners = new Set<PostCreatedListener>();

export const postCreatedEvents = {
  /**
   * Register a listener. Returns an unsubscribe function — call it on
   * effect cleanup so we don't leak subscriptions across screen mounts.
   */
  subscribe(listener: PostCreatedListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Fire the event for all current subscribers. */
  emit(post: FeedTextPost): void {
    listeners.forEach(listener => {
      try {
        listener(post);
      } catch (caught) {
        // A bad subscriber must not break siblings. Swallow + log.
        // eslint-disable-next-line no-console
        console.warn('[postCreatedEvents] listener error', caught);
      }
    });
  },
};
