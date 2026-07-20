import {
  buildSharedPostStoryDraft,
  createPostStoryShare,
} from '../postStoryShare';
import type { FeedPost } from '../../../domain/types/feed.types';

const publisher = {
  id: '10',
  name: 'Ha Dai Duong',
  username: 'duong',
  avatarUrl: 'https://cdn.vnseea.test/avatar.jpg',
};

function asPost(value: Record<string, unknown>): FeedPost {
  return {
    id: 'post-1',
    publisher,
    postedAt: 1700000000,
    privacy: 'public',
    ...value,
  } as unknown as FeedPost;
}

describe('postStoryShare', () => {
  it('builds a shared-post draft without an uploaded media file', () => {
    const draft = buildSharedPostStoryDraft({
      post: asPost({ kind: 'text', caption: 'Caption', photos: [] }),
      note: `  ${'x'.repeat(400)}  `,
    });

    expect(draft).toEqual({
      sourcePostId: 'post-1',
      note: 'x'.repeat(300),
      audience: 'followers',
    });
    expect(draft).not.toHaveProperty('media');
  });

  it('creates the shared-post Story directly without capture or multipart data', async () => {
    const post = asPost({ kind: 'text', caption: 'Caption', photos: [] });
    const createSharedPostStory = jest
      .fn()
      .mockResolvedValue({ storyId: 'story-1', message: 'created' });

    const result = await createPostStoryShare({
      post,
      note: 'Ghi chu',
      createSharedPostStory,
    });

    expect(createSharedPostStory).toHaveBeenCalledWith({
      sourcePostId: 'post-1',
      note: 'Ghi chu',
      audience: 'followers',
    });
    expect(result.draft).not.toHaveProperty('media');
    expect(result.result.storyId).toBe('story-1');
  });

  it('propagates create failures so the sheet stays open for retry', async () => {
    const post = asPost({ kind: 'text', caption: 'Caption', photos: [] });
    const createError = new Error('create failed');
    await expect(
      createPostStoryShare({
        post,
        note: '',
        createSharedPostStory: () => Promise.reject(createError),
      }),
    ).rejects.toBe(createError);
  });
});
