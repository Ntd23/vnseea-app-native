import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import type {
  FeedPost,
  FeedTextPost,
} from '../../../domain/types/feed.types';

const mockGetLightPostsPage = jest.fn();
const mockGetVideoPostsPage = jest.fn();
const mockGetCachedPostsSnapshot = jest.fn();

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
  createPollRepository: () => ({ votePoll: jest.fn() }),
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/feedCacheStorage',
  () => ({
    feedCacheStorage: {
      getCachedPostsSnapshot: () => mockGetCachedPostsSnapshot(),
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

const lightPost = (id: string, postedAt: number): FeedTextPost => ({
  id,
  kind: 'text',
  postedAt,
  caption: id,
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
});

async function primeFeedForManualLoadMore(
  latest: ReturnType<typeof useFeedViewModel>,
) {
  await act(async () => {
    latest.resetScrollBusy();
    await latest.reloadPosts();
    await flushAsyncWork();
  });
  act(() => {
    latest.setScrollBusy(false);
  });
}

describe('initial feed commit while scrolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetLightPostsPage.mockReset();
    mockGetVideoPostsPage.mockReset();
    mockGetCachedPostsSnapshot.mockReset();
    mockGetVideoPostsPage.mockResolvedValue({
      posts: [],
      prefetchedPosts: [],
      nextCursor: undefined,
      reachedEnd: true,
    });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps the cached runway stable until the first gesture settles', async () => {
    const cachedPosts = [lightPost('cached-1', 20), lightPost('cached-2', 10)];
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: cachedPosts,
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage.mockImplementation(() => page.promise);

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
    expect(latest.posts.map(post => post.id)).toEqual(['cached-1', 'cached-2']);

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = latest.reloadPosts();
      latest.setScrollBusy(true);
      await flushAsyncWork();
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('fresh-1', 30)],
        prefetchedPosts: [],
        nextCursor: 'fresh-cursor',
        reachedEnd: false,
      });
      await reloadPromise;
      await flushAsyncWork();
    });

    expect(latest.posts.map(post => post.id)).toEqual(['cached-1', 'cached-2']);

    await act(async () => {
      latest.setScrollBusy(false);
      await flushAsyncWork();
    });

    expect(latest.posts.map(post => post.id)).toEqual([
      'fresh-1',
      'cached-1',
      'cached-2',
    ]);

    await act(async () => renderer.unmount());
  });

  it('does not delay first content when no cached runway exists', async () => {
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue(undefined);
    mockGetLightPostsPage.mockImplementation(() => page.promise);

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

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = latest.reloadPosts();
      latest.setScrollBusy(true);
      await flushAsyncWork();
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('fresh-1', 30)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
      await reloadPromise;
      await flushAsyncWork();
    });

    expect(latest.posts.map(post => post.id)).toEqual(['fresh-1']);

    await act(async () => renderer.unmount());
  });

  it('synchronously rejects a second load-more request while the first owns the ref guard', async () => {
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    const nextPage = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [lightPost('cached-1', 20)],
        prefetchedPosts: [],
        nextCursor: 'cached-cursor',
        reachedEnd: false,
      })
      .mockImplementationOnce(() => page.promise)
      .mockImplementationOnce(() => nextPage.promise);

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
    await primeFeedForManualLoadMore(latest);

    let firstAccepted = false;
    let secondAccepted = true;
    act(() => {
      firstAccepted = latest.requestLoadMorePosts();
      secondAccepted = latest.requestLoadMorePosts();
    });

    expect(firstAccepted).toBe(true);
    expect(secondAccepted).toBe(false);
    expect(mockGetLightPostsPage).toHaveBeenCalledTimes(2);

    await act(async () => {
      page.resolve({
        posts: [lightPost('older-1', 10)],
        prefetchedPosts: [],
        nextCursor: 'next-cursor',
        reachedEnd: false,
      });
      await flushAsyncWork();
    });

    let thirdAccepted = false;
    act(() => {
      thirdAccepted = latest.requestLoadMorePosts();
    });

    expect(thirdAccepted).toBe(true);
    expect(mockGetLightPostsPage).toHaveBeenCalledTimes(3);

    await act(async () => {
      nextPage.resolve({
        posts: [lightPost('older-2', 5)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
      await flushAsyncWork();
    });

    await act(async () => renderer.unmount());
  });

  it('quietly resets hidden scroll state without flushing a deferred snapshot', async () => {
    const cachedPosts = [lightPost('cached-1', 20), lightPost('cached-2', 10)];
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: cachedPosts,
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage.mockImplementation(() => page.promise);

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

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = latest.reloadPosts();
      latest.setScrollBusy(true);
      await flushAsyncWork();
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('fresh-1', 30)],
        prefetchedPosts: [],
        nextCursor: 'fresh-cursor',
        reachedEnd: false,
      });
      await reloadPromise;
      await flushAsyncWork();
    });

    latest.resetScrollBusy();
    expect(latest.posts.map(post => post.id)).toEqual(['cached-1', 'cached-2']);

    await act(async () => {
      latest.setScrollBusy(false);
      await flushAsyncWork();
    });
    expect(latest.posts.map(post => post.id)).toEqual([
      'fresh-1',
      'cached-1',
      'cached-2',
    ]);

    await act(async () => renderer.unmount());
  });

  it('defers a response that arrives after the feed surface becomes hidden', async () => {
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [lightPost('cached-1', 20)],
        prefetchedPosts: [],
        nextCursor: 'cached-cursor',
        reachedEnd: false,
      })
      .mockImplementationOnce(() => page.promise);

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
    await primeFeedForManualLoadMore(latest);

    act(() => {
      expect(latest.requestLoadMorePosts()).toBe(true);
      latest.resetScrollBusy();
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('older-1', 10)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
      await flushAsyncWork();
    });

    expect(latest.posts.map(post => post.id)).toEqual(['cached-1']);

    await act(async () => {
      latest.setScrollBusy(false);
      await flushAsyncWork();
    });
    expect(latest.posts.map(post => post.id)).toEqual([
      'cached-1',
      'older-1',
    ]);

    await act(async () => renderer.unmount());
  });

  it('keeps a locally prepended post first when a hidden page commit flushes', async () => {
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [lightPost('cached-1', 20)],
        prefetchedPosts: [],
        nextCursor: 'cached-cursor',
        reachedEnd: false,
      })
      .mockImplementationOnce(() => page.promise);

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
    await primeFeedForManualLoadMore(latest);

    act(() => {
      expect(latest.requestLoadMorePosts()).toBe(true);
      latest.resetScrollBusy();
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('older-1', 10)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
      await flushAsyncWork();
      latest.prependPost(lightPost('created-1', 30));
      await flushAsyncWork();
    });

    expect(latest.posts.map(post => post.id)).toEqual([
      'created-1',
      'cached-1',
    ]);

    await act(async () => {
      latest.setScrollBusy(false);
      await flushAsyncWork();
    });
    expect(latest.posts.map(post => post.id)).toEqual([
      'created-1',
      'cached-1',
      'older-1',
    ]);

    await act(async () => renderer.unmount());
  });

  it('marks a truly empty initial feed as fully loaded', async () => {
    mockGetCachedPostsSnapshot.mockReturnValue(undefined);
    mockGetLightPostsPage.mockResolvedValue({
      posts: [],
      prefetchedPosts: [],
      nextCursor: undefined,
      reachedEnd: true,
    });

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

    expect(latest.posts).toEqual([]);
    expect(latest.isAllLoaded).toBe(true);
    expect(latest.requestLoadMorePosts()).toBe(false);

    await act(async () => renderer.unmount());
  });

  it('rejects cached-tail pagination until the scheduled initial generation finishes', async () => {
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });

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

    expect(latest.requestLoadMorePosts()).toBe(false);
    expect(mockGetLightPostsPage).not.toHaveBeenCalled();

    await act(async () => renderer.unmount());
  });

  it('reports retryable when an accepted duplicate page appends no rows', async () => {
    const pendingPrefetch = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [lightPost('cached-1', 20)],
        prefetchedPosts: [],
        nextCursor: 'cached-cursor',
        reachedEnd: false,
      })
      .mockResolvedValueOnce({
        posts: [lightPost('cached-1', 20)],
        prefetchedPosts: [],
        nextCursor: 'cached-cursor',
        reachedEnd: false,
      })
      .mockImplementationOnce(() => pendingPrefetch.promise);

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
    await primeFeedForManualLoadMore(latest);

    const outcomes: string[] = [];
    act(() => {
      expect(
        latest.requestLoadMorePosts(outcome => outcomes.push(outcome)),
      ).toBe(true);
    });
    await act(async () => {
      await flushAsyncWork();
    });

    expect(outcomes).toEqual(['retryable']);
    expect(latest.posts.map(post => post.id)).toEqual(['cached-1']);

    await act(async () => renderer.unmount());
  });

  it('reports retryable after a load-more failure and admits the next attempt', async () => {
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [lightPost('cached-1', 20)],
        prefetchedPosts: [],
        nextCursor: 'cached-cursor',
        reachedEnd: false,
      })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        posts: [lightPost('older-1', 10)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });

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
    await primeFeedForManualLoadMore(latest);

    const outcomes: string[] = [];
    act(() => {
      expect(
        latest.requestLoadMorePosts(outcome => outcomes.push(outcome)),
      ).toBe(true);
    });
    await act(async () => {
      await flushAsyncWork();
    });

    expect(outcomes).toEqual(['retryable']);
    expect(latest.error).toBe('offline');

    act(() => {
      expect(
        latest.requestLoadMorePosts(outcome => outcomes.push(outcome)),
      ).toBe(true);
    });
    await act(async () => {
      await flushAsyncWork();
    });

    expect(outcomes).toEqual(['retryable', 'appended']);
    expect(latest.posts.map(post => post.id)).toEqual([
      'cached-1',
      'older-1',
    ]);

    await act(async () => renderer.unmount());
  });

  it('defers a load-more response when a new gesture starts before the request resolves', async () => {
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage
      .mockResolvedValueOnce({
        posts: [lightPost('cached-1', 20)],
        prefetchedPosts: [],
        nextCursor: 'cached-cursor',
        reachedEnd: false,
      })
      .mockImplementationOnce(() => page.promise);

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
    await primeFeedForManualLoadMore(latest);

    act(() => {
      expect(latest.requestLoadMorePosts()).toBe(true);
      latest.setScrollBusy(true);
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('older-1', 10)],
        prefetchedPosts: [],
        nextCursor: undefined,
        reachedEnd: true,
      });
      await flushAsyncWork();
    });

    expect(latest.posts.map(post => post.id)).toEqual(['cached-1']);

    await act(async () => {
      latest.setScrollBusy(false);
      await flushAsyncWork();
    });
    expect(latest.posts.map(post => post.id)).toEqual([
      'cached-1',
      'older-1',
    ]);

    await act(async () => renderer.unmount());
  });

  it('preserves realtime edits applied after a fresh snapshot was deferred', async () => {
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage.mockImplementation(() => page.promise);

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

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = latest.reloadPosts();
      latest.setScrollBusy(true);
      await flushAsyncWork();
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('fresh-1', 30)],
        prefetchedPosts: [],
        nextCursor: 'fresh-cursor',
        reachedEnd: false,
      });
      await reloadPromise;
      latest.applyRealtimePost({
        ...lightPost('fresh-1', 30),
        caption: 'realtime edit',
      });
      await flushAsyncWork();
    });

    await act(async () => {
      latest.setScrollBusy(false);
      await flushAsyncWork();
    });

    expect(latest.posts.find(post => post.id === 'fresh-1')).toEqual(
      expect.objectContaining({ caption: 'realtime edit' }),
    );

    await act(async () => renderer.unmount());
  });

  it('does not resurrect a post removed after a fresh snapshot was deferred', async () => {
    const page = deferred<{
      posts: FeedPost[];
      prefetchedPosts: FeedPost[];
      nextCursor?: string;
      reachedEnd: boolean;
    }>();
    mockGetCachedPostsSnapshot.mockReturnValue({
      posts: [lightPost('cached-1', 20)],
      nextCursor: 'cached-cursor',
      reachedEnd: false,
    });
    mockGetLightPostsPage.mockImplementation(() => page.promise);

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

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = latest.reloadPosts();
      latest.setScrollBusy(true);
      await flushAsyncWork();
    });
    await act(async () => {
      page.resolve({
        posts: [lightPost('fresh-1', 30)],
        prefetchedPosts: [],
        nextCursor: 'fresh-cursor',
        reachedEnd: false,
      });
      await reloadPromise;
      latest.removeRealtimePost('fresh-1');
      await flushAsyncWork();
    });

    await act(async () => {
      latest.setScrollBusy(false);
      await flushAsyncWork();
    });

    expect(latest.posts.some(post => post.id === 'fresh-1')).toBe(false);

    await act(async () => renderer.unmount());
  });
});
