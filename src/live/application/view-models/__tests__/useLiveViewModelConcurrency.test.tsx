import React from 'react';
import { AppState } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

const mockGetLiveStreams = jest.fn();
const mockGetLiveFriends = jest.fn();
const mockGetUserLiveStreams = jest.fn();
const mockGetLivePost = jest.fn();

jest.mock('../../../infrastructure/repositories/ApiLiveRepository', () => ({
  createLiveRepository: () => ({
    getLiveStreams: mockGetLiveStreams,
    getLiveFriends: mockGetLiveFriends,
    getUserLiveStreams: mockGetUserLiveStreams,
    getLivePost: mockGetLivePost,
  }),
}));

jest.mock('../../../../feed', () => ({
  createFeedRepository: jest.fn(),
}));

jest.mock('../../../infrastructure/storage/endedLivePostsStorage', () => ({
  LOCAL_LIVE_ENDED_EVENT: 'localLiveEnded',
  endedLivePostsStorage: {
    filterActiveStreams: (items: unknown[]) => items,
    markEnded: jest.fn(),
    notifyInactive: jest.fn(),
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: () => ({ userId: 'viewer-1' }),
    },
  }),
);

import type { LiveStreamItem } from '../../../domain/types/live.types';
import { clearLiveRequestResource } from '../../state/liveRequestResource';
import { useLiveViewModel } from '../useLiveViewModel';

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

const liveItem: LiveStreamItem = {
  id: '101',
  postId: 101,
  streamName: 'stream-101',
  title: 'Live',
  description: '',
  thumbnailUrl: null,
  startedAt: '2026-07-28T00:00:00.000Z',
  viewerCount: 0,
  state: 'live',
  privacy: '0',
  publisher: {
    id: 'host-1',
    name: 'Host',
    username: 'host',
    avatarUrl: '',
  },
};

describe('useLiveViewModel request concurrency', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetLiveStreams.mockReset().mockResolvedValue([]);
    mockGetLiveFriends.mockReset().mockResolvedValue([]);
    mockGetUserLiveStreams.mockReset().mockResolvedValue([]);
    mockGetLivePost.mockReset().mockResolvedValue(liveItem);
    clearLiveRequestResource();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps a slow foreground refresh single-flight while background polls wait', async () => {
    const streamsRequest = deferred<LiveStreamItem[]>();
    const friendsRequest = deferred<LiveStreamItem[]>();
    mockGetLiveStreams
      .mockImplementationOnce(() => streamsRequest.promise)
      .mockResolvedValueOnce([]);
    mockGetLiveFriends
      .mockImplementationOnce(() => friendsRequest.promise)
      .mockResolvedValueOnce([]);

    let latest!: ReturnType<typeof useLiveViewModel>;
    function Probe() {
      latest = useLiveViewModel({
        autoLoad: false,
        enabled: true,
        refreshIntervalMs: 10,
      });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });

    let refreshPromise!: Promise<void>;
    await act(async () => {
      refreshPromise = latest.refresh();
      await Promise.resolve();
    });
    expect(latest.isRefreshing).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(10);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockGetLiveStreams).toHaveBeenCalledTimes(1);
    expect(mockGetLiveFriends).toHaveBeenCalledTimes(1);

    await act(async () => {
      streamsRequest.resolve([]);
      friendsRequest.resolve([]);
      await refreshPromise;
    });

    expect(latest.isRefreshing).toBe(false);
    expect(latest.isLoading).toBe(false);
    await act(async () => renderer.unmount());
  });

  it('does not starve a slow active-stream probe when polling is faster than the API', async () => {
    const probeRequest = deferred<LiveStreamItem | null>();
    mockGetLiveStreams.mockResolvedValue([liveItem]);
    mockGetLiveFriends.mockResolvedValue([]);
    mockGetLivePost.mockImplementation(() => probeRequest.promise);

    let latest!: ReturnType<typeof useLiveViewModel>;
    function Probe() {
      latest = useLiveViewModel({
        autoLoad: false,
        enabled: true,
      });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    await act(async () => {
      await latest.refresh();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(latest.liveStreams).toEqual([liveItem]);
    expect(mockGetLivePost).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(15_000);
      await Promise.resolve();
    });
    expect(mockGetLivePost).toHaveBeenCalledTimes(1);

    await act(async () => {
      probeRequest.resolve(liveItem);
      await flushAsyncWork();
    });

    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(mockGetLivePost).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await flushAsyncWork();
    });
    expect(mockGetLivePost).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  it('cancels loading state and ignores results after the surface is disabled', async () => {
    const streamsRequest = deferred<LiveStreamItem[]>();
    const friendsRequest = deferred<LiveStreamItem[]>();
    mockGetLiveStreams.mockImplementation(() => streamsRequest.promise);
    mockGetLiveFriends.mockImplementation(() => friendsRequest.promise);

    let latest!: ReturnType<typeof useLiveViewModel>;
    function Probe({ enabled }: { enabled: boolean }) {
      latest = useLiveViewModel({ autoLoad: false, enabled });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe enabled />);
    });

    let refreshPromise!: Promise<void>;
    await act(async () => {
      refreshPromise = latest.refresh();
      await Promise.resolve();
    });
    expect(latest.isRefreshing).toBe(true);

    await act(async () => {
      renderer.update(<Probe enabled={false} />);
    });
    expect(latest.isRefreshing).toBe(false);

    await act(async () => {
      streamsRequest.resolve([liveItem]);
      friendsRequest.resolve([]);
      await refreshPromise;
    });

    expect(latest.liveStreams).toEqual([]);
    expect(latest.friendsLive).toEqual([]);
    await act(async () => renderer.unmount());
  });
});
