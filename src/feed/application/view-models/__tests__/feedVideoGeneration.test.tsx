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
    getLightPostsPage: (...args: unknown[]) => mockGetLightPostsPage(...args),
    getVideoPostsPage: (...args: unknown[]) => mockGetVideoPostsPage(...args),
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
  createPollRepository: () => ({ votePoll: jest.fn() }),
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
}

const lightPost = (id: string, postedAt: number) =>
  ({ id, kind: 'text', postedAt, text: id }) as unknown as FeedPost;

const videoPost = (id: string, postedAt: number) =>
  ({
    id,
    kind: 'video',
    postedAt,
    videoUrl: `file://${id}.mp4`,
    thumbnailUrl: `file://${id}.jpg`,
  }) as FeedVideoPost;

const page = (posts: FeedPost[]) => ({
  posts,
  prefetchedPosts: [],
  nextCursor: undefined,
  reachedEnd: true,
});

describe('canonical Feed video generation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetLightPostsPage.mockReset();
    mockGetVideoPostsPage.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function renderProbe() {
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
    return { renderer, getLatest: () => latest };
  }

  it('keeps videos returned by the canonical page in postedAt order', async () => {
    mockGetLightPostsPage.mockResolvedValue(
      page([
        lightPost('newer', 100),
        lightPost('older', 80),
        videoPost('video-1', 90),
      ]),
    );
    const probe = await renderProbe();

    await act(async () => {
      await probe.getLatest().reloadPosts();
      await flushAsyncWork();
    });

    expect(probe.getLatest().posts.map(post => post.id)).toEqual([
      'newer',
      'video-1',
      'older',
    ]);
    expect(mockGetVideoPostsPage).not.toHaveBeenCalled();
    await act(async () => probe.renderer.unmount());
  });

  it('does not replace visible rows while a refreshed video page resolves during scrolling', async () => {
    const initialPosts = Array.from({ length: 10 }, (_, index) =>
      lightPost(`light-${index + 1}`, 100 - index),
    );
    const refreshedPage = deferred<ReturnType<typeof page>>();
    mockGetLightPostsPage
      .mockResolvedValueOnce(page(initialPosts))
      .mockImplementationOnce(() => refreshedPage.promise);
    const probe = await renderProbe();

    await act(async () => {
      await probe.getLatest().reloadPosts();
      await flushAsyncWork();
    });
    let refreshPromise!: Promise<void>;
    await act(async () => {
      probe.getLatest().setScrollBusy(true);
      refreshPromise = probe.getLatest().reloadPosts();
      await flushAsyncWork();
    });
    await act(async () => {
      refreshedPage.resolve(
        page([lightPost('refreshed', 200), videoPost('video-2', 190)]),
      );
      await refreshPromise;
      await flushAsyncWork();
    });

    expect(probe.getLatest().posts.map(post => post.id)).toEqual(
      initialPosts.map(post => post.id),
    );

    await act(async () => {
      probe.getLatest().setScrollBusy(false);
      await flushAsyncWork();
    });
    expect(probe.getLatest().posts.map(post => post.id)).toEqual([
      'refreshed',
      'video-2',
      ...initialPosts.map(post => post.id),
    ]);
    await act(async () => probe.renderer.unmount());
  });

  it('ignores a stale canonical page after switching the active source', async () => {
    const stalePage = deferred<ReturnType<typeof page>>();
    mockGetLightPostsPage
      .mockImplementationOnce(() => stalePage.promise)
      .mockResolvedValueOnce(page([lightPost('following-post', 50)]));
    const probe = await renderProbe();
    let staleRequest!: Promise<void>;

    await act(async () => {
      staleRequest = probe.getLatest().reloadPosts();
      await flushAsyncWork();
    });
    await act(async () => {
      probe.getLatest().setFeedSource('following');
      await flushAsyncWork();
    });
    expect(mockGetLightPostsPage.mock.calls[0]?.[2]).toBe('all');
    expect(mockGetLightPostsPage.mock.calls[1]?.[2]).toBe('following');

    await act(async () => {
      stalePage.resolve(page([videoPost('stale-video', 100)]));
      await staleRequest;
      await flushAsyncWork();
    });

    expect(probe.getLatest().posts.map(post => post.id)).toEqual([
      'following-post',
    ]);
    expect(mockGetVideoPostsPage).not.toHaveBeenCalled();
    await act(async () => probe.renderer.unmount());
  });
});
