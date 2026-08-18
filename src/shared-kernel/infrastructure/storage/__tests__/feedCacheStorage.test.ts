const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import type { FeedPost } from '../../../../feed/domain/types/feed.types';
import { feedCacheStorage } from '../feedCacheStorage';

function createPost(id: number): FeedPost {
  return {
    id: String(id),
    kind: 'text',
    text: `Post ${id}`,
    postedAt: 10_000 - id,
    publisher: {
      id: `publisher-${id}`,
      name: `Publisher ${id}`,
      username: `publisher-${id}`,
      avatarUrl: '',
    },
  } as unknown as FeedPost;
}

function createAd(id: number): FeedPost {
  return {
    id: `ad:${id}`,
    adId: String(id),
    kind: 'ad',
    title: `Ad ${id}`,
    publisher: {
      id: 'advertiser',
      name: 'Advertiser',
      username: 'advertiser',
      avatarUrl: '',
    },
  } as unknown as FeedPost;
}

describe('feedCacheStorage posts', () => {
  beforeEach(() => {
    mockValues.clear();
  });

  it('caps the warm scroll runway and re-anchors pagination', () => {
    const posts = Array.from({ length: 65 }, (_, index) => createPost(index + 1));

    feedCacheStorage.setCachedPostsSnapshot(
      {
        posts,
        nextCursor: 'cursor-65',
        reachedEnd: false,
      },
      'user-1',
    );

    const restored = feedCacheStorage.getCachedPostsSnapshot('user-1');
    expect(restored?.posts).toHaveLength(30);
    expect(restored?.posts.map(post => post.id)).toEqual(
      posts.slice(0, 30).map(post => post.id),
    );
    expect(restored?.nextCursor).toBeUndefined();
    expect(restored?.reachedEnd).toBe(false);
    expect(restored?.updatedAt).toBeGreaterThan(0);
  });

  it('preserves pagination metadata when the snapshot is not truncated', () => {
    feedCacheStorage.setCachedPostsSnapshot(
      {
        posts: [createPost(1), createPost(2), createPost(3)],
        nextCursor: 'cursor-3',
        reachedEnd: true,
      },
      'user-1',
    );

    expect(feedCacheStorage.getCachedPostsSnapshot('user-1')).toMatchObject({
      posts: [{ id: '1' }, { id: '2' }, { id: '3' }],
      nextCursor: 'cursor-3',
      reachedEnd: true,
    });
  });

  it('ignores the oversized v3 snapshot after the startup-cache migration', () => {
    mockValues.set(
      'feed.posts.snapshot.v3:user-1',
      JSON.stringify({
        posts: Array.from({ length: 65 }, (_, index) => createPost(index + 1)),
        reachedEnd: false,
        updatedAt: Date.now(),
      }),
    );

    expect(feedCacheStorage.getCachedPostsSnapshot('user-1')).toBeNull();
  });

  it('caps persisted ready videos at the display pool size', () => {
    const videos = Array.from({ length: 20 }, (_, index) => ({
      ...createPost(index + 1),
      kind: 'video',
      videoUrl: `https://example.com/video-${index + 1}.mp4`,
    }));

    feedCacheStorage.setCachedVideoPosts(videos as never, 'user-1');

    expect(feedCacheStorage.getCachedVideoPosts('user-1')).toHaveLength(8);
  });

  it('keeps persisted post snapshots isolated per user', () => {
    feedCacheStorage.setCachedPostsSnapshot(
      { posts: [createPost(1)], nextCursor: 'cursor-1', reachedEnd: false },
      'user-1',
    );
    feedCacheStorage.setCachedPostsSnapshot(
      { posts: [createPost(2)], reachedEnd: true },
      'user-2',
    );

    expect(feedCacheStorage.getCachedPostsSnapshot('user-1')).toMatchObject({
      posts: [{ id: '1' }],
      nextCursor: 'cursor-1',
      reachedEnd: false,
    });
    expect(feedCacheStorage.getCachedPostsSnapshot('user-2')).toMatchObject({
      posts: [{ id: '2' }],
      reachedEnd: true,
    });
  });

  it('repairs a cached end state poisoned by an advertisement id', () => {
    feedCacheStorage.setCachedPostsSnapshot(
      {
        posts: [createPost(4504), createPost(3781), createAd(18)],
        nextCursor: '18',
        reachedEnd: true,
      },
      'user-1',
    );

    expect(feedCacheStorage.getCachedPostsSnapshot('user-1')).toMatchObject({
      posts: [{ id: '4504' }, { id: '3781' }, { id: 'ad:18' }],
      nextCursor: undefined,
      reachedEnd: false,
    });
  });
});
