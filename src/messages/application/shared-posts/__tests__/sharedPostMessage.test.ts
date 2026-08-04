import type { FeedPost } from '../../../../feed/domain/types/feed.types';
import {
  buildSharedPostPreviewModel,
  createSharedPostPreviewLoader,
  parseSharedPostMessage,
} from '../sharedPostMessage';

const WEB_BASE_URL = 'https://demo.vnseea.vn';

function post(overrides: Partial<FeedPost>): FeedPost {
  return {
    kind: 'text',
    id: '42',
    caption: 'Noi dung bai viet',
    photos: [],
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    myReaction: null,
    topReactions: [],
    privacy: 'public',
    publisher: { id: '8', name: 'Nguoi dang', username: 'author' },
    ...overrides,
  } as FeedPost;
}

describe('shared post messages', () => {
  it('extracts a web post URL and keeps the sender note', () => {
    expect(
      parseSharedPostMessage(
        'Xem bai nay\n\nhttps://demo.vnseea.vn/post/42/?ref=chat',
        WEB_BASE_URL,
      ),
    ).toEqual({
      postId: '42',
      url: 'https://demo.vnseea.vn/post/42/?ref=chat',
      note: 'Xem bai nay',
    });
  });

  it('supports VNSEEA deep links and preserves other links in the note', () => {
    expect(
      parseSharedPostMessage(
        'Doc them https://example.com\n\nvnseea://post/post-7',
        WEB_BASE_URL,
      ),
    ).toEqual({
      postId: 'post-7',
      url: 'vnseea://post/post-7',
      note: 'Doc them https://example.com',
    });
  });

  it('recognizes a live marker on a shared post URL', () => {
    expect(
      parseSharedPostMessage(
        'Xem live nay https://demo.vnseea.vn/post/42?live=1',
        WEB_BASE_URL,
      ),
    ).toMatchObject({ postId: '42', isLive: true });
  });

  it('ignores foreign hosts and non-post links', () => {
    expect(
      parseSharedPostMessage(
        'https://other.example/post/42',
        WEB_BASE_URL,
      ),
    ).toBeUndefined();
    expect(
      parseSharedPostMessage(
        'https://demo.vnseea.vn/profile/42',
        WEB_BASE_URL,
      ),
    ).toBeUndefined();
  });

  it.each([
    [
      'text',
      post({ kind: 'text', photos: ['https://cdn.vnseea.vn/photo.jpg'] }),
      'https://cdn.vnseea.vn/photo.jpg',
      false,
    ],
    [
      'video',
      post({
        kind: 'video',
        videoUrl: 'https://cdn.vnseea.vn/video.mp4',
        thumbnailUrl: 'https://cdn.vnseea.vn/video.jpg',
      } as Partial<FeedPost>),
      'https://cdn.vnseea.vn/video.jpg',
      true,
    ],
    [
      'poll',
      post({ kind: 'poll', pollQuestion: 'Ban chon gi?', options: [] } as Partial<FeedPost>),
      undefined,
      false,
    ],
    [
      'product',
      post({
        kind: 'product',
        product: {
          id: 2,
          name: 'San pham',
          description: 'Mo ta',
          images: [{ id: 1, image: 'https://cdn.vnseea.vn/product.jpg', product_id: 2 }],
        },
      } as Partial<FeedPost>),
      'https://cdn.vnseea.vn/product.jpg',
      false,
    ],
    [
      'event',
      post({
        kind: 'event',
        event: { id: 3, name: 'Su kien', cover: 'https://cdn.vnseea.vn/event.jpg' },
      } as Partial<FeedPost>),
      'https://cdn.vnseea.vn/event.jpg',
      false,
    ],
    [
      'job',
      post({
        kind: 'job',
        job: {
          id: '31',
          title: 'Viec lam',
          description: 'Mo ta',
          image: 'https://cdn.vnseea.vn/job.jpg',
        },
      } as Partial<FeedPost>),
      'https://cdn.vnseea.vn/job.jpg',
      false,
    ],
    [
      'ad',
      post({
        kind: 'ad',
        title: 'Quang cao',
        mediaUrl: 'https://cdn.vnseea.vn/ad.mp4',
        isVideo: true,
      } as Partial<FeedPost>),
      undefined,
      true,
    ],
  ])('builds a %s preview model', (_kind, value, imageUrl, isVideo) => {
    const model = buildSharedPostPreviewModel(value);

    expect(model.postId).toBe('42');
    expect(model.kind).toBe(_kind);
    expect(model.publisherName).toBe('Nguoi dang');
    expect(model.imageUrl).toBe(imageUrl);
    expect(model.isVideo).toBe(isVideo);
    expect(model.title).toBeTruthy();
    if (_kind === 'product') {
      expect(model.productId).toBe(2);
    }
    if (_kind === 'job') {
      expect(model.jobId).toBe('31');
      expect(model.job?.id).toBe('31');
    }
  });

  it('builds a live preview with stream state and viewer count', () => {
    expect(
      buildSharedPostPreviewModel(
        post({
          liveContext: {
            state: 'live',
            streamName: 'live-42',
            title: 'Cung tro chuyen',
            thumbnailUrl: 'https://cdn.vnseea.vn/live.jpg',
            viewerCount: 18,
          },
        }),
      ),
    ).toMatchObject({
      postId: '42',
      title: 'Cung tro chuyen',
      imageUrl: 'https://cdn.vnseea.vn/live.jpg',
      isVideo: true,
      live: {
        state: 'live',
        streamName: 'live-42',
        viewerCount: 18,
      },
    });
  });

  it('deduplicates in-flight preview requests and evicts the oldest entry', async () => {
    const getPostById = jest.fn(async (postId: string) => ({
      post: post({ id: postId }),
      comments: [],
    }));
    const loader = createSharedPostPreviewLoader({ getPostById }, 2);

    const [first, duplicate] = await Promise.all([
      loader.load('1'),
      loader.load('1'),
    ]);
    await loader.load('2');
    await loader.load('3');
    await loader.load('1');

    expect(first.postId).toBe('1');
    expect(duplicate.postId).toBe('1');
    expect(getPostById).toHaveBeenCalledTimes(4);
  });

  it('removes failed requests so a later load can retry', async () => {
    const getPostById = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ post: post({ id: '9' }), comments: [] });
    const loader = createSharedPostPreviewLoader({ getPostById }, 100);

    await expect(loader.load('9')).rejects.toThrow('network');
    await expect(loader.load('9')).resolves.toMatchObject({ postId: '9' });
    expect(getPostById).toHaveBeenCalledTimes(2);
  });

  it('forces a fresh preview request for live-state polling', async () => {
    const getPostById = jest.fn(async () => ({
      post: post({}),
      comments: [],
    }));
    const loader = createSharedPostPreviewLoader({ getPostById }, 100);

    await loader.load('42');
    await loader.load('42');
    await loader.load('42', { force: true });

    expect(getPostById).toHaveBeenCalledTimes(2);
  });
});
