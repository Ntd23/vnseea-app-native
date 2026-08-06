jest.mock('../../../infrastructure/repositories/ApiReelsRepository', () => {
  const fetchReels = jest.fn();
  return {
    createReelsRepository: () => ({ fetchReels }),
    __mockFetchReels: fetchReels,
  };
});

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/feedCacheStorage',
  () => {
    const getCachedVideoPosts = jest.fn(() => []);
    return {
      feedCacheStorage: { getCachedVideoPosts },
      __mockCachedFeedVideos: getCachedVideoPosts,
    };
  },
);

jest.mock('../../../infrastructure/storage/reelsStartupStorage', () => {
  const readCachedReelsStartupPage = jest.fn(() => null);
  const writeCachedReelsStartupPage = jest.fn();
  return {
    readCachedReelsStartupPage,
    writeCachedReelsStartupPage,
    __mockReadStartupPage: readCachedReelsStartupPage,
    __mockWriteStartupPage: writeCachedReelsStartupPage,
  };
});

const { __mockFetchReels: mockFetchReels } = jest.requireMock(
  '../../../infrastructure/repositories/ApiReelsRepository',
) as { __mockFetchReels: jest.Mock };
const { __mockCachedFeedVideos: mockCachedFeedVideos } = jest.requireMock(
  '../../../../shared-kernel/infrastructure/storage/feedCacheStorage',
) as { __mockCachedFeedVideos: jest.Mock };
const { __mockWriteStartupPage: mockWriteStartupPage } = jest.requireMock(
  '../../../infrastructure/storage/reelsStartupStorage',
) as { __mockWriteStartupPage: jest.Mock };

import type { FeedVideoPost } from '../../../../feed/domain/types/feed.types';
import type { ReelsItem } from '../../../domain/types/reels.types';
import {
  fetchReelsStartupPage,
  getReelsStartupSnapshot,
  mapFeedVideoPostToReel,
  mergeFeedVideoPostSnapshotIntoReel,
  mergeReelsStartupItems,
  resetReelsStartupMemoryCacheForTests,
} from '../reelsStartupFeed';

function createReel(id: string, likeCount = 0): ReelsItem {
  return {
    id,
    videoUrl: `https://cdn.example.com/${id}.mp4`,
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
    likeCount,
    commentCount: 0,
    viewCount: 0,
    isLiked: false,
    isSaved: false,
    myReaction: null,
  };
}

function createFeedVideo(id: string): FeedVideoPost {
  return {
    kind: 'video',
    id,
    videoUrl: `https://cdn.example.com/${id}.mp4`,
    thumbnailUrl: `https://cdn.example.com/${id}.jpg`,
    postedAt: 1,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    myReaction: null,
    topReactions: [],
    privacy: 'public',
    privacyContract: 'audience_v2',
    isAnonymous: false,
    permissions: { canDelete: false, canShare: true },
    publisher: {
      id: `publisher-${id}`,
      username: `user-${id}`,
      name: `User ${id}`,
    },
  };
}

describe('reels startup feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetReelsStartupMemoryCacheForTests();
  });

  it('uses cached Home videos immediately when no Reel page has been cached', () => {
    mockCachedFeedVideos.mockReturnValue([createFeedVideo('home-1')]);

    const snapshot = getReelsStartupSnapshot();

    expect(snapshot.items.map(item => item.id)).toEqual(['home-1']);
    expect(snapshot.hasMore).toBe(true);
  });

  it('marks a shared Home video as reposted in Reels', () => {
    const reelItem = mapFeedVideoPostToReel({
      ...createFeedVideo('shared-video'),
      sharedPostId: 'original-video',
    });

    expect(reelItem.isReposted).toBe(true);
  });

  it('uses the fresh first page as the authoritative startup sequence', () => {
    const merged = mergeReelsStartupItems(
      [createReel('current', 1), createReel('second', 2)],
      [createReel('new', 3), createReel('current', 9)],
    );

    expect(merged.map(item => item.id)).toEqual(['new', 'current']);
    expect(merged[1].likeCount).toBe(9);
  });

  it('keeps an explicitly opened reel pinned ahead of the fresh first page', () => {
    const merged = mergeReelsStartupItems(
      [createReel('opened')],
      [createReel('new'), createReel('second')],
      createReel('opened'),
    );

    expect(merged.map(item => item.id)).toEqual(['opened', 'new', 'second']);
  });

  it('applies authoritative realtime engagement without dropping reel-only media state', () => {
    const current = {
      ...createReel('10', 1),
      videoUrl: 'https://cdn.example.com/reels-10.mp4',
      thumbnailUrl: 'https://cdn.example.com/reels-10.jpg',
      viewCount: 25,
      isSaved: true,
      publisher: {
        ...createReel('10').publisher,
        isVerified: true,
        isAdmin: true,
      },
    };
    const snapshot: FeedVideoPost = {
      ...createFeedVideo('10'),
      videoUrl: '',
      thumbnailUrl: undefined,
      likeCount: 9,
      commentCount: 4,
      isLiked: true,
      myReaction: 'love',
      viewCount: undefined,
      isSaved: undefined,
      publisher: {
        ...createFeedVideo('10').publisher,
        name: 'Updated publisher',
      },
    };

    const merged = mergeFeedVideoPostSnapshotIntoReel(current, snapshot);

    expect(merged).toMatchObject({
      id: '10',
      videoUrl: current.videoUrl,
      thumbnailUrl: current.thumbnailUrl,
      likeCount: 9,
      commentCount: 4,
      viewCount: 25,
      isSaved: true,
      isLiked: true,
      myReaction: 'love',
      publisher: {
        name: 'Updated publisher',
        isVerified: true,
        isAdmin: true,
      },
    });
    expect(merged.raw).toBe(snapshot);
  });

  it('preserves a known share permission when a public realtime snapshot omits it', () => {
    const current = createReel('permission-missing');
    const snapshot = {
      ...createFeedVideo('permission-missing'),
      permissions: {
        canDelete: false,
        canShare: false,
        canShareKnown: false,
      },
    };

    const merged = mergeFeedVideoPostSnapshotIntoReel(current, snapshot);

    expect(merged.canShare).toBe(true);
    expect(merged.canShareKnown).toBe(true);
  });

  it('applies an explicit false share permission from realtime', () => {
    const current = createReel('permission-false');
    const snapshot = {
      ...createFeedVideo('permission-false'),
      permissions: {
        canDelete: false,
        canShare: false,
        canShareKnown: true,
      },
    };

    const merged = mergeFeedVideoPostSnapshotIntoReel(current, snapshot);

    expect(merged.canShare).toBe(false);
    expect(merged.canShareKnown).toBe(true);
  });

  it('applies an explicit true share permission from realtime', () => {
    const current = {
      ...createReel('permission-true'),
      canShare: false,
      canShareKnown: true,
    };
    const snapshot = createFeedVideo('permission-true');

    const merged = mergeFeedVideoPostSnapshotIntoReel(current, snapshot);

    expect(merged.canShare).toBe(true);
    expect(merged.canShareKnown).toBe(true);
  });

  it.each([
    ['restricted privacy', { privacy: 'friends' as const }],
    ['anonymous post', { isAnonymous: true }],
    ['shared post', { sharedPostId: 'source-post' }],
  ])(
    'revokes sharing for a %s even when permission is missing',
    (_label, restriction) => {
      const current = createReel('permission-restricted');
      const snapshot: FeedVideoPost = {
        ...createFeedVideo('permission-restricted'),
        ...restriction,
        permissions: {
          canDelete: false,
          canShare: false,
          canShareKnown: false,
        },
      };

      const merged = mergeFeedVideoPostSnapshotIntoReel(current, snapshot);

      expect(merged.canShare).toBe(false);
      expect(merged.canShareKnown).toBe(true);
    },
  );

  it('keeps sharing hidden when neither current nor incoming snapshots have a permission', () => {
    const current = {
      ...createReel('permission-unknown'),
      canShare: false,
      canShareKnown: false,
    };
    const snapshot = {
      ...createFeedVideo('permission-unknown'),
      permissions: {
        canDelete: false,
        canShare: false,
        canShareKnown: false,
      },
    };

    const merged = mergeFeedVideoPostSnapshotIntoReel(current, snapshot);

    expect(merged.canShare).toBe(false);
    expect(merged.canShareKnown).toBe(false);
  });

  it('deduplicates concurrent first-page requests and reuses the warm result', async () => {
    mockFetchReels.mockResolvedValue({
      items: [createReel('remote-1')],
      nextCursor: 'remote-1',
    });

    const [first, second] = await Promise.all([
      fetchReelsStartupPage(),
      fetchReelsStartupPage(),
    ]);
    const warm = await fetchReelsStartupPage();

    expect(first.items[0].id).toBe('remote-1');
    expect(second.items[0].id).toBe('remote-1');
    expect(warm.items[0].id).toBe('remote-1');
    expect(mockFetchReels).toHaveBeenCalledTimes(1);
    expect(mockWriteStartupPage).toHaveBeenCalledTimes(1);
  });
});
