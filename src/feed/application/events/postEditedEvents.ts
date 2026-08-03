export interface PostEditedEvent {
  postId: string;
  text: string;
  persistence?: 'server' | 'local';
}

type PostEditedListener = (event: PostEditedEvent) => void;

const listeners = new Set<PostEditedListener>();

export const postEditedEvents = {
  subscribe(listener: PostEditedListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  emit(event: PostEditedEvent) {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (caught) {
        console.warn('[postEditedEvents] listener error', caught);
      }
    });
  },
};
