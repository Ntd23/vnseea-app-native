import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import type {
  FeedPost,
  FeedVideoPost,
} from '../../../domain/types/feed.types';

const mockGetLightPostsPage = jest.fn();
const mockGetVideoPostsPage = jest.fn();

jest.mock('../../../infrastructure/repositories/ApiFeedRepository', () => ({
  createFeedRepository: () => ({
    getLightPostsPage: (...args: unknown[]) =>
      mockGetLightPostsPage(...args),
    getVideoPostsPage: (...args: unknown[]) =>
      mockGetVideoPostsPage(...args),
    getLatestPosts: jest.fn().mockResolvedValue([]),
    recordRecommendationEvent: jest.fn().mockResolvedValue(undefined),
    setReaction: jest.fn().mockResolvedValue(undefined),
    savePost: jest.fn().mockResolvedValue(undefined),
    editPost: jest.fn().mockResolvedValue(undefined),
    reportPost: jest.fn().mockResolvedValue(undefined),
    deletePost: jest.fn().mockResolvedValue({ deleted: true }),
    sharePost: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../../poll/infrastructure/repositories/ApiPollRepository', () => ({
  createPollRepository: () => ({
    votePoll: jest.fn(),
  }),
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/feedCacheStorage',
  () => ({
    feedCacheStorage: {
      getCachedPostsSnapshot: () => undefined,
      getCachedVideoPosts: () => [],
      setCachedPostsSnapshot: jest.fn(),
      setCachedVideoPosts: jest.fn(),
    },
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: () => ({ userId: 'viewer-1' }),
      getUserProfile: () => undefined,
      subscribeToUserProfile: () => () => undefined,
    },
  }),
);

jest.mock('../../../infrastructure/storage/hiddenPostsStorage', () => ({
  LOCAL_POST_HIDDEN_EVENT: 'localPostHidden',
  hiddenPostsStorage: {
    filterVisiblePosts: (posts: unknown[]) => posts,
    hidePost: jest.fn(),
    isHidden: () => false,
  },
}));

jest.mock('../../../../live/infrastructure/storage/endedLivePostsStorage', () => ({
  LOCAL_LIVE_ENDED_EVENT: 'localLiveEnded',
  endedLivePostsStorage: {
    filterVisiblePosts: (posts: unknown[]) => posts,
    getEndedPostIds: () => new Set<string>(),
  },
}));

jest.mock(
  '../../../../shared-kernel/application/utils/videoThumbnails',
  () => ({
    createCachedVideoPosterThumbnail: jest.fn().mockResolvedValue(undefined),
    getCachedVideoPosterThumbnail: jest.fn().mockReturnValue(undefined),
  }),
);

import { useFeedViewModel } from '../useFeedViewModel';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function flushScheduledWork() {
  await flushAsyncWork();
  jest.advanceTimersByTime(0);
  await flushAsyncWork();
}

const lightPost = (id: string, postedAt: number) =>
  ({ id, kind: 'text', postedAt, text: id }) as unknown as FeedPost;

const readyVideoPost = (id: string, postedAt: number) =>
  ({
    id,
    kind: 'video',
    postedAt,
    videoUrl: `file://${id}.mp4`,
    thumbnailUrl: `file://${id}.jpg`,
  }) as FeedVideoPost;

describe('feed video request generation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetLightPostsPage.mockReset();
    mockGetVideoPostsPage.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('rejects a stale video page and replays the newest request for the active source', async () => {
    const staleVideoPage = deferred<{
      posts: FeedVideoPost[];
      prefetchedPosts: FeedVideoPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [lightPost('all-light', 20)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      })
      .mockResolvedValueOnce({
        posts: [lightPost('following-light', 10)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
    mockGetVideoPostsPage
      .mockImplementationOnce(() => staleVideoPage.promise)
      .mockResolvedValueOnce({
        posts: [],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    let latest!: ReturnType<typeof useFeedViewModel>;
    function Probe() {
      latest = useFeedViewModel();
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });
    await act(async () => {
      await latest.reloadPosts();
      await flushScheduledWork();
    });
    expect(mockGetVideoPostsPage).toHaveBeenCalledTimes(1);
    expect(mockGetVideoPostsPage.mock.calls[0]?.[2]).toBe('all');

    await act(async () => {
      latest.setFeedSource('following');
      await flushScheduledWork();
    });
    expect(mockGetVideoPostsPage).toHaveBeenCalledTimes(1);

    await act(async () => {
      staleVideoPage.resolve({
        posts: [readyVideoPost('stale-all-video', 15)],
        prefetchedPosts: [],
        nextCursor: 'stale-cursor',
        reachedEnd: false,
      });
      await flushScheduledWork();
    });

    expect(mockGetVideoPostsPage).toHaveBeenCalledTimes(2);
    expect(mockGetVideoPostsPage.mock.calls[1]?.[1]).toBeUndefined();
    expect(mockGetVideoPostsPage.mock.calls[1]?.[2]).toBe('following');
    expect(latest.posts.map(post => post.id)).toEqual(['following-light']);

    await act(async () => renderer.unmount());
  });
});
