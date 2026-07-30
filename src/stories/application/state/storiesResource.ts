import type { StoryItem } from '../../domain/types/stories.types';
import { filterActiveStories } from '../../domain/policies/storyExpiration';

export const STORIES_RESOURCE_STALE_MS = 30_000;

export type StoriesResourceState = {
  stories: StoryItem[];
  fetchedAt: number;
  isFetching: boolean;
  error: string | null;
};

export type StoriesResourceLoadOptions = {
  force?: boolean;
};

type StoriesUpdater = StoryItem[] | ((current: StoryItem[]) => StoryItem[]);

type StoriesResourceEntry = {
  state: StoriesResourceState;
  listeners: Set<() => void>;
  inFlight: Promise<StoryItem[]> | null;
};

const EMPTY_STORIES: StoryItem[] = [];

function createEntry(): StoriesResourceEntry {
  return {
    state: {
      stories: EMPTY_STORIES,
      fetchedAt: 0,
      isFetching: false,
      error: null,
    },
    listeners: new Set(),
    inFlight: null,
  };
}

function areStoryListsEqual(left: StoryItem[], right: StoryItem[]) {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createStoriesResource(staleMs = STORIES_RESOURCE_STALE_MS) {
  const entries = new Map<string, StoriesResourceEntry>();

  const getEntry = (key: string) => {
    const existing = entries.get(key);
    if (existing) return existing;

    const entry = createEntry();
    entries.set(key, entry);
    return entry;
  };

  const publish = (
    entry: StoriesResourceEntry,
    nextState: StoriesResourceState,
  ) => {
    entry.state = nextState;
    entry.listeners.forEach(listener => listener());
  };

  const update = (key: string, updater: StoriesUpdater) => {
    const entry = getEntry(key);
    const candidate =
      typeof updater === 'function' ? updater(entry.state.stories) : updater;
    const activeStories = filterActiveStories(candidate);
    const nextStories = areStoryListsEqual(entry.state.stories, activeStories)
      ? entry.state.stories
      : activeStories;

    if (nextStories === entry.state.stories) {
      return entry.state.stories;
    }

    publish(entry, {
      ...entry.state,
      stories: nextStories,
    });
    return nextStories;
  };

  const load = (
    key: string,
    loader: () => Promise<StoryItem[]>,
    options: StoriesResourceLoadOptions = {},
  ) => {
    const entry = getEntry(key);
    const now = Date.now();

    if (
      !options.force &&
      entry.state.fetchedAt > 0 &&
      now - entry.state.fetchedAt < staleMs
    ) {
      return Promise.resolve(entry.state.stories);
    }

    if (entry.inFlight) {
      return entry.inFlight;
    }

    publish(entry, {
      ...entry.state,
      isFetching: true,
      error: null,
    });

    const request = Promise.resolve()
      .then(loader)
      .then(candidate => {
        const activeStories = filterActiveStories(candidate);
        const nextStories = areStoryListsEqual(
          entry.state.stories,
          activeStories,
        )
          ? entry.state.stories
          : activeStories;

        publish(entry, {
          stories: nextStories,
          fetchedAt: Date.now(),
          isFetching: false,
          error: null,
        });
        return nextStories;
      })
      .catch(caught => {
        publish(entry, {
          ...entry.state,
          isFetching: false,
          error:
            caught instanceof Error
              ? caught.message
              : 'Khong tai duoc danh sach tin.',
        });
        throw caught;
      })
      .finally(() => {
        if (entry.inFlight === request) {
          entry.inFlight = null;
        }
      });

    entry.inFlight = request;
    return request;
  };

  return {
    clear(key?: string) {
      if (key) {
        entries.delete(key);
        return;
      }
      entries.clear();
    },
    getState(key: string) {
      return getEntry(key).state;
    },
    load,
    setError(key: string, error: string | null) {
      const entry = getEntry(key);
      if (entry.state.error === error) return;
      publish(entry, {
        ...entry.state,
        error,
      });
    },
    subscribe(key: string, listener: () => void) {
      const entry = getEntry(key);
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
      };
    },
    update,
  };
}

export const storiesResource = createStoriesResource();
