// Description: Lightweight pub/sub for story deletions so the home rail
// can sync when a user deletes a story from inside the full-screen viewer.
//
// Why pub/sub instead of just calling vm.deleteStory directly:
// FeedScreen and StoryViewerScreen each instantiate their OWN
// `useStoriesViewModel()` (per-mount state, matching how
// `useFeedViewModel` works for posts). They share the same backend as
// the source of truth but their local arrays drift. When the viewer
// deletes a story, the rail's copy would still show it until the next
// pull-to-refresh — annoying. This event closes the gap: viewer deletes
// → emits storyId → rail receives → removes from its local array.

const listeners = new Set<(storyId: string) => void>();

export const storyDeletedEvents = {
  /**
   * Register a listener. Returns an unsubscribe function — call it on
   * effect cleanup so we don't leak subscriptions across screen mounts.
   */
  subscribe(listener: (storyId: string) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Fire the event for all current subscribers. */
  emit(storyId: string): void {
    listeners.forEach(listener => {
      try {
        listener(storyId);
      } catch (caught) {
        // A bad subscriber must not break siblings.
        // eslint-disable-next-line no-console
        console.warn('[storyDeletedEvents] listener error', caught);
      }
    });
  },
};
