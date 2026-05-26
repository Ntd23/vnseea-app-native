// Description: Lightweight pub/sub for story reactions so the home rail
// can sync when a user reacts to a story from inside the full-screen viewer.

import type { ReactionType } from '../../../reels/domain/types/reels.types';

type StoryReactedListener = (storyId: string, reaction: ReactionType | null) => void;

const listeners = new Set<StoryReactedListener>();

export const storyReactedEvents = {
  /**
   * Register a listener. Returns an unsubscribe function — call it on
   * effect cleanup so we don't leak subscriptions across screen mounts.
   */
  subscribe(listener: StoryReactedListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Fire the event for all current subscribers. */
  emit(storyId: string, reaction: ReactionType | null): void {
    listeners.forEach(listener => {
      try {
        listener(storyId, reaction);
      } catch (caught) {
        // eslint-disable-next-line no-console
        console.warn('[storyReactedEvents] listener error', caught);
      }
    });
  },
};
