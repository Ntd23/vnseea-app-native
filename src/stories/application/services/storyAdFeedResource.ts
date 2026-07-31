import type { FeedPost } from '../../../feed/domain/types/feed.types';

export const STORY_AD_FEED_STALE_MS = 5 * 60_000;

type StoryAdFeedEntry = {
  posts: FeedPost[];
  fetchedAt: number;
  inFlight: Promise<FeedPost[]> | null;
};

const entries = new Map<string, StoryAdFeedEntry>();

export function loadStoryAdFeedPosts(
  key: string,
  loader: () => Promise<FeedPost[]>,
  options: { force?: boolean } = {},
) {
  const current = entries.get(key);
  if (
    !options.force &&
    current?.fetchedAt &&
    Date.now() - current.fetchedAt < STORY_AD_FEED_STALE_MS
  ) {
    return Promise.resolve(current.posts);
  }
  if (current?.inFlight) return current.inFlight;

  const entry: StoryAdFeedEntry = current ?? {
    posts: [],
    fetchedAt: 0,
    inFlight: null,
  };
  const request = loader()
    .then(posts => {
      entry.posts = posts;
      entry.fetchedAt = Date.now();
      return posts;
    })
    .catch(error => {
      if (entry.fetchedAt > 0) return entry.posts;
      throw error;
    })
    .finally(() => {
      if (entry.inFlight === request) entry.inFlight = null;
    });

  entry.inFlight = request;
  entries.set(key, entry);
  return request;
}

export function clearStoryAdFeedResource(key?: string) {
  if (key) {
    entries.delete(key);
    return;
  }
  entries.clear();
}
