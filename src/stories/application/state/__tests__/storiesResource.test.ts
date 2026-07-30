import type { StoryItem } from '../../../domain/types/stories.types';
import { createStoriesResource } from '../storiesResource';

function createStory(id: string): StoryItem {
  const now = Math.floor(Date.now() / 1000);
  return {
    id,
    publisher: {
      userId: `user-${id}`,
      username: `user-${id}`,
      name: `User ${id}`,
    },
    postedAt: now - 10,
    expiresAt: now + 60 * 60,
    media: [
      {
        id: `media-${id}`,
        type: 'image',
        url: `https://example.com/${id}.jpg`,
        storyId: id,
        postedAt: now - 10,
      },
    ],
    isOwner: false,
    isViewed: false,
    hasUnseen: true,
    myReaction: null,
    reactionCount: 0,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('storiesResource', () => {
  it('reuses a warm snapshot and only bypasses the TTL for a forced reload', async () => {
    const resource = createStoriesResource(30_000);
    const firstStory = createStory('1');
    const loader = jest.fn().mockResolvedValue([firstStory]);

    await resource.load('user:1', loader);
    const warmStories = resource.getState('user:1').stories;

    await resource.load('user:1', loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(resource.getState('user:1').stories).toBe(warmStories);

    await resource.load('user:1', loader, { force: true });
    expect(loader).toHaveBeenCalledTimes(2);
    expect(resource.getState('user:1').stories).toBe(warmStories);
  });

  it('coalesces concurrent loads for the same signed-in user', async () => {
    const resource = createStoriesResource(30_000);
    const pending = deferred<StoryItem[]>();
    const loader = jest.fn(() => pending.promise);

    const first = resource.load('user:1', loader);
    const second = resource.load('user:1', loader);

    expect(first).toBe(second);
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);

    pending.resolve([createStory('1')]);
    await first;
  });

  it('keeps cached stories visible while a background refresh is pending or fails', async () => {
    const resource = createStoriesResource(30_000);
    const story = createStory('1');
    await resource.load('user:1', async () => [story]);
    const warmStories = resource.getState('user:1').stories;
    const pending = deferred<StoryItem[]>();

    const refresh = resource.load('user:1', () => pending.promise, {
      force: true,
    });

    expect(resource.getState('user:1')).toMatchObject({
      stories: warmStories,
      isFetching: true,
      error: null,
    });

    pending.reject(new Error('network down'));
    await expect(refresh).rejects.toThrow('network down');
    expect(resource.getState('user:1')).toMatchObject({
      stories: warmStories,
      isFetching: false,
      error: 'network down',
    });
  });

  it('keeps snapshots isolated between accounts', async () => {
    const resource = createStoriesResource(30_000);
    const firstStory = createStory('1');
    const secondStory = createStory('2');

    await resource.load('user:1', async () => [firstStory]);
    await resource.load('user:2', async () => [secondStory]);

    expect(resource.getState('user:1').stories).toEqual([firstStory]);
    expect(resource.getState('user:2').stories).toEqual([secondStory]);
  });

  it('publishes optimistic updates into the shared snapshot', async () => {
    const resource = createStoriesResource(30_000);
    const firstStory = createStory('1');
    const secondStory = createStory('2');
    const listener = jest.fn();
    resource.subscribe('user:1', listener);

    await resource.load('user:1', async () => [firstStory]);
    resource.update('user:1', current => [secondStory, ...current]);

    expect(resource.getState('user:1').stories).toEqual([
      secondStory,
      firstStory,
    ]);
    expect(listener).toHaveBeenCalled();
  });
});
