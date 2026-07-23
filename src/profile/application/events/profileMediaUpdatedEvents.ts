import type { ProfileMediaUpdateResult } from '../../domain/types/profileMedia.types';

export type ProfileMediaUpdatedEvent = {
  userId: string;
  media: ProfileMediaUpdateResult;
};

type Listener = (event: ProfileMediaUpdatedEvent) => void;

const listeners = new Set<Listener>();

export const profileMediaUpdatedEvents = {
  emit(event: ProfileMediaUpdatedEvent) {
    listeners.forEach(listener => listener(event));
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
