import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockGetLightPostsPage = jest.fn();
const mockGetVideoPosts = jest.fn();

jest.mock('../../../infrastructure/repositories/ApiFeedRepository', () => ({
  createFeedRepository: () => ({
    getLightPostsPage: (...args: unknown[]) =>
      mockGetLightPostsPage(...args),
    getVideoPosts: (...args: unknown[]) => mockGetVideoPosts(...args),
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
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('feed prefetch unmount lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetLightPostsPage.mockReset();
    mockGetVideoPosts.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('does not retry when an in-flight prefetch rejects after unmount', async () => {
    const pendingPrefetch = deferred<never>();
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [],
        prefetchedPosts: [],
        nextCursor: '10',
        reachedEnd: false,
      })
      .mockImplementationOnce(() => pendingPrefetch.promise);
    const consoleWarn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

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
      await flushAsyncWork();
    });
    expect(mockGetLightPostsPage).toHaveBeenCalledTimes(2);

    await act(async () => renderer.unmount());
    await act(async () => {
      pendingPrefetch.reject(new Error('offline'));
      await flushAsyncWork();
      jest.advanceTimersByTime(120_000);
      await flushAsyncWork();
    });

    expect(mockGetLightPostsPage).toHaveBeenCalledTimes(2);
    expect(consoleWarn).not.toHaveBeenCalledWith(
      '[feed] prefetch failed:',
      expect.anything(),
    );
  });

  it('pauses failed prefetch refills while hidden and resumes them on focus', async () => {
    const pendingPrefetch = deferred<never>();
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [
          {
            id: 'initial-1',
            kind: 'text',
            postedAt: 20,
            caption: 'initial-1',
            photos: [],
            likeCount: 0,
            commentCount: 0,
            isLiked: false,
            myReaction: null,
            topReactions: [],
            privacy: 'public',
            publisher: {
              id: 'publisher-1',
              name: 'Publisher',
              username: 'publisher',
            },
          },
        ],
        prefetchedPosts: [],
        nextCursor: '10',
        reachedEnd: false,
      })
      .mockImplementationOnce(() => pendingPrefetch.promise)
      .mockResolvedValueOnce({
        posts: [],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

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
      jest.advanceTimersByTime(300);
      await flushAsyncWork();
    });
    expect(mockGetLightPostsPage).toHaveBeenCalledTimes(2);

    act(() => {
      latest.resetScrollBusy();
    });
    await act(async () => {
      pendingPrefetch.reject(new Error('offline'));
      await flushAsyncWork();
      jest.advanceTimersByTime(120_000);
      await flushAsyncWork();
    });
    expect(mockGetLightPostsPage).toHaveBeenCalledTimes(2);

    await act(async () => {
      latest.setScrollBusy(false);
      jest.advanceTimersByTime(120_000);
      await flushAsyncWork();
    });
    expect(mockGetLightPostsPage).toHaveBeenCalledTimes(3);

    await act(async () => renderer.unmount());
  });
});
