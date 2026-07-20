import { createSharedPostStoryPreviewLoader } from '../sharedPostStoryPreviewLoader';
import type { FeedPost } from '../../../../feed/domain/types/feed.types';

function post(id: string): FeedPost {
  return {
    id,
    kind: 'text',
    publisher: {
      id: '7',
      name: 'Ha Dai Duong',
      username: 'duong',
    },
    postedAt: 1700000000,
    privacy: 'public',
    caption: `Post ${id}`,
    photos: [],
  } as unknown as FeedPost;
}

describe('sharedPostStoryPreview loader', () => {
  it('deduplicates concurrent loads and caches the canonical preview', async () => {
    let resolvePost!: (value: FeedPost) => void;
    const loadPost = jest.fn(
      () =>
        new Promise<FeedPost>(resolve => {
          resolvePost = resolve;
        }),
    );
    const loader = createSharedPostStoryPreviewLoader({ loadPost });

    const first = loader.load('11');
    const second = loader.load('11');
    resolvePost(post('11'));

    await expect(first).resolves.toMatchObject({ postId: '11' });
    await expect(second).resolves.toMatchObject({ postId: '11' });
    await expect(loader.load('11')).resolves.toMatchObject({ postId: '11' });
    expect(loadPost).toHaveBeenCalledTimes(1);
  });

  it('removes failed requests so the next mount can retry', async () => {
    const loadPost = jest
      .fn<Promise<FeedPost>, [string]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(post('12'));
    const loader = createSharedPostStoryPreviewLoader({ loadPost });

    await expect(loader.load('12')).rejects.toThrow('offline');
    await expect(loader.load('12')).resolves.toMatchObject({ postId: '12' });
    expect(loadPost).toHaveBeenCalledTimes(2);
  });
});
