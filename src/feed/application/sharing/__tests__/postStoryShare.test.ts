import {
  buildPostStoryCardModel,
  buildPostStoryDraft,
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
  return { id: 'post-1', publisher, ...value } as unknown as FeedPost;
}

describe('postStoryShare', () => {
  it.each([
    [
      'text',
      asPost({
        kind: 'text',
        caption: 'Mot ngay rat dep',
        photos: ['https://cdn.vnseea.test/photo.jpg'],
      }),
      {
        kindLabel: 'Bài viết',
        title: 'Mot ngay rat dep',
        mediaUrl: 'https://cdn.vnseea.test/photo.jpg',
        showPlayIcon: false,
      },
    ],
    [
      'video',
      asPost({
        kind: 'video',
        caption: 'Video moi',
        thumbnailUrl: 'https://cdn.vnseea.test/video-thumb.jpg',
      }),
      {
        kindLabel: 'Video',
        title: 'Video moi',
        mediaUrl: 'https://cdn.vnseea.test/video-thumb.jpg',
        showPlayIcon: true,
      },
    ],
    [
      'product',
      asPost({
        kind: 'product',
        product: {
          name: 'May anh',
          price_format: '2.000.000 d',
          images: [{ image: 'https://cdn.vnseea.test/product.jpg' }],
        },
      }),
      {
        kindLabel: 'Sản phẩm',
        title: 'May anh',
        body: '2.000.000 d',
        mediaUrl: 'https://cdn.vnseea.test/product.jpg',
      },
    ],
    [
      'event',
      asPost({
        kind: 'event',
        event: {
          event_name: 'VNSEEA Meetup',
          event_location: 'Ha Noi',
          event_cover: 'https://cdn.vnseea.test/event.jpg',
        },
      }),
      {
        kindLabel: 'Sự kiện',
        title: 'VNSEEA Meetup',
        body: 'Ha Noi',
        mediaUrl: 'https://cdn.vnseea.test/event.jpg',
      },
    ],
    [
      'job',
      asPost({
        kind: 'job',
        job: {
          title: 'React Native Engineer',
          location: 'Da Nang',
          image: 'https://cdn.vnseea.test/job.jpg',
        },
      }),
      {
        kindLabel: 'Việc làm',
        title: 'React Native Engineer',
        body: 'Da Nang',
        mediaUrl: 'https://cdn.vnseea.test/job.jpg',
      },
    ],
    [
      'poll',
      asPost({
        kind: 'poll',
        pollQuestion: 'Ban chon gi?',
        options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
      }),
      {
        kindLabel: 'Thăm dò',
        title: 'Ban chon gi?',
        options: ['A', 'B', 'C'],
      },
    ],
    [
      'ad',
      asPost({
        kind: 'ad',
        title: 'Uu dai hom nay',
        description: 'Giam 20%',
        mediaUrl: 'https://cdn.vnseea.test/ad.jpg',
        isVideo: false,
      }),
      {
        kindLabel: 'Quảng cáo',
        title: 'Uu dai hom nay',
        body: 'Giam 20%',
        mediaUrl: 'https://cdn.vnseea.test/ad.jpg',
      },
    ],
  ])('maps a %s post to a story card', (_kind, post, expected) => {
    expect(buildPostStoryCardModel(post, 'Ghi chu cua toi')).toMatchObject({
      publisherName: publisher.name,
      publisherAvatar: publisher.avatarUrl,
      note: 'Ghi chu cua toi',
      ...expected,
    });
  });

  it('uses the brand fallback when a post has no usable image', () => {
    const model = buildPostStoryCardModel(
      asPost({ kind: 'text', caption: '', photos: [] }),
      '',
    );

    expect(model.title).toBe('Bài viết mới');
    expect(model.mediaUrl).toBeUndefined();
  });

  it('builds a 1080x1920 image draft and reserves space for the post deep link', () => {
    const draft = buildPostStoryDraft({
      post: asPost({ kind: 'text', caption: 'Caption', photos: [] }),
      note: 'x'.repeat(400),
      captureUri: 'file:///tmp/post-story.jpg',
      shareUrl: 'vnseea://post/post-1',
    });

    expect(draft.media).toEqual({
      uri: 'file:///tmp/post-story.jpg',
      name: 'vnseea-post-post-1.jpg',
      type: 'image/jpeg',
      fileType: 'image',
      width: 1080,
      height: 1920,
    });
    expect(draft.title).toBe('Bài viết của Ha Dai Duong');
    expect(draft.description).toHaveLength(300);
    expect(draft.description).toContain('vnseea://post/post-1');
  });

  it('captures JPEG at 1080x1920 and uploads the generated story draft', async () => {
    const post = asPost({ kind: 'text', caption: 'Caption', photos: [] });
    const capture = jest.fn().mockResolvedValue('file:///tmp/captured.jpg');
    const getShareUrl = jest.fn().mockResolvedValue('vnseea://post/post-1');
    const upload = jest
      .fn()
      .mockResolvedValue({ storyId: 'story-1', message: 'created' });

    const result = await createPostStoryShare({
      post,
      note: 'Ghi chu',
      capture,
      getShareUrl,
      upload,
    });

    expect(capture).toHaveBeenCalledWith({
      format: 'jpg',
      quality: 0.92,
      width: 1080,
      height: 1920,
      result: 'tmpfile',
    });
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        media: expect.objectContaining({
          uri: 'file:///tmp/captured.jpg',
          fileType: 'image',
        }),
        description: expect.stringContaining('vnseea://post/post-1'),
      }),
    );
    expect(result.result.storyId).toBe('story-1');
    expect(result.captureUri).toBe('file:///tmp/captured.jpg');
  });

  it('propagates capture and upload failures so the sheet can remain open', async () => {
    const post = asPost({ kind: 'text', caption: 'Caption', photos: [] });
    const captureError = new Error('capture failed');
    await expect(
      createPostStoryShare({
        post,
        note: '',
        capture: () => Promise.reject(captureError),
        getShareUrl: () => Promise.resolve('vnseea://post/post-1'),
        upload: () => Promise.resolve({ message: 'unused' }),
      }),
    ).rejects.toBe(captureError);

    const uploadError = new Error('upload failed');
    await expect(
      createPostStoryShare({
        post,
        note: '',
        capture: () => Promise.resolve('file:///tmp/captured.jpg'),
        getShareUrl: () => Promise.resolve('vnseea://post/post-1'),
        upload: () => Promise.reject(uploadError),
      }),
    ).rejects.toBe(uploadError);
  });
});
