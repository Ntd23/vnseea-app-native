const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { sessionStorage } from '../../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ReelsItem } from '../../../domain/types/reels.types';
import {
  REELS_STARTUP_CACHE_MAX_AGE_MS,
  readCachedReelsStartupPage,
  writeCachedReelsStartupPage,
} from '../reelsStartupStorage';

function createReel(id: string): ReelsItem {
  return {
    id,
    videoUrl: `https://cdn.example.com/${id}.mp4`,
    thumbnailUrl: `https://cdn.example.com/${id}.jpg`,
    privacy: 'public',
    privacyContract: 'audience_v2',
    isAnonymous: false,
    canShare: true,
    publisher: {
      userId: `publisher-${id}`,
      username: `user-${id}`,
      name: `User ${id}`,
      isVerified: false,
    },
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    isLiked: false,
    isSaved: false,
    myReaction: null,
    raw: { oversized: true },
  };
}

describe('reels startup storage', () => {
  beforeEach(() => {
    mockValues.clear();
    sessionStorage.clearSession();
    sessionStorage.setSession({ accessToken: 'token', userId: 'user-1' });
  });

  it('restores a playable first page for the active user without raw payloads', () => {
    const cachedAt = Date.now();
    writeCachedReelsStartupPage(
      { items: [createReel('1')], nextCursor: '1' },
      cachedAt,
    );

    const cached = readCachedReelsStartupPage(cachedAt + 1000);

    expect(cached?.items).toHaveLength(1);
    expect(cached?.items[0].id).toBe('1');
    expect(cached?.items[0].raw).toBeUndefined();
    expect(cached?.nextCursor).toBe('1');
  });

  it('does not leak another account cache into the current session', () => {
    writeCachedReelsStartupPage(
      { items: [createReel('1')], nextCursor: null },
      Date.now(),
    );
    sessionStorage.setSession({ accessToken: 'token', userId: 'user-2' });

    expect(readCachedReelsStartupPage()).toBeNull();
  });

  it('drops a cache that is too old to be a safe instant-start source', () => {
    const cachedAt = Date.now();
    writeCachedReelsStartupPage(
      { items: [createReel('1')], nextCursor: null },
      cachedAt,
    );

    expect(
      readCachedReelsStartupPage(
        cachedAt + REELS_STARTUP_CACHE_MAX_AGE_MS + 1,
      ),
    ).toBeNull();
  });
});
