// Description: Lightweight pub/sub for newly-created stories so screens
// can react without coupling through navigation params.
//
// Mirrors `feed/application/events/postCreatedEvents.ts` — see its
// header for the design rationale (TL;DR: pub/sub > nav callbacks +
// stale closures, and lighter than Redux for a single event).
//
// CreateStoryScreen emits one of these on success; FeedScreen subscribes
// at mount and calls `vm.prependStory(...)` so the user's new story
// appears in the rail instantly, without re-fetching.

import type { StoryItem } from '../../domain/types/stories.types';

type StoryCreatedListener = (story: StoryItem) => void;

const listeners = new Set<StoryCreatedListener>();

export const storyCreatedEvents = {
  /**
   * Register a listener. Returns an unsubscribe function — call it on
   * effect cleanup so we don't leak subscriptions across screen mounts.
   */
  subscribe(listener: StoryCreatedListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Fire the event for all current subscribers. */
  emit(story: StoryItem): void {
    listeners.forEach(listener => {
      try {
        listener(story);
      } catch (caught) {
        // A bad subscriber must not break siblings. Swallow + log.
        // eslint-disable-next-line no-console
        console.warn('[storyCreatedEvents] listener error', caught);
      }
    });
  },
};
