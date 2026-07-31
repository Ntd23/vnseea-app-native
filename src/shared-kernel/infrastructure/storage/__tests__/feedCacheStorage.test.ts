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

  it('restores a warm scroll runway beyond forty posts with its cursor', () => {
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
    expect(restored?.posts).toHaveLength(65);
    expect(restored?.posts.map(post => post.id)).toEqual(
      posts.map(post => post.id),
    );
    expect(restored?.nextCursor).toBe('cursor-65');
    expect(restored?.reachedEnd).toBe(false);
    expect(restored?.updatedAt).toBeGreaterThan(0);
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
