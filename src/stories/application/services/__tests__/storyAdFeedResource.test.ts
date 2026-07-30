import {
  clearStoryAdFeedResource,
  loadStoryAdFeedPosts,
} from '../storyAdFeedResource';

describe('storyAdFeedResource', () => {
  beforeEach(() => {
    clearStoryAdFeedResource();
  });

  it('shares one in-flight feed request across story surfaces', async () => {
    let resolveRequest!: (value: []) => void;
    const loader = jest.fn(
      () =>
        new Promise<[]>(resolve => {
          resolveRequest = resolve;
        }),
    );

    const first = loadStoryAdFeedPosts('user:1', loader);
    const second = loadStoryAdFeedPosts('user:1', loader);

    expect(loader).toHaveBeenCalledTimes(1);
    resolveRequest([]);
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
  });

  it('uses cached ad inventory until an explicit refresh forces a reload', async () => {
    const loader = jest.fn().mockResolvedValue([]);

    await loadStoryAdFeedPosts('user:1', loader);
    await loadStoryAdFeedPosts('user:1', loader);
    expect(loader).toHaveBeenCalledTimes(1);

    await loadStoryAdFeedPosts('user:1', loader, { force: true });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
