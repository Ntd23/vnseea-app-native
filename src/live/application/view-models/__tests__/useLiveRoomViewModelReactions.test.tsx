import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

const mockGetLivePost = jest.fn();
const mockGetComments = jest.fn();
const mockSetReaction = jest.fn();
const mockCreateFeedRepository = jest.fn(() => ({
  setReaction: mockSetReaction,
}));
const mockCachedReactions = new Map<string, string>();

jest.mock('../../../infrastructure/repositories/ApiLiveRepository', () => ({
  createLiveRepository: () => ({
    getLivePost: mockGetLivePost,
    getComments: mockGetComments,
    joinLive: jest.fn(),
    addComment: jest.fn(),
    endLive: jest.fn(),
  }),
}));

jest.mock('../../../../feed', () => ({
  createFeedRepository: () => mockCreateFeedRepository(),
}));

jest.mock(
  '../../../../reels/infrastructure/storage/reelsReactionsStorage',
  () => ({
    reelsReactionsStorage: {
      get: (userId: string | undefined, postId: string) =>
        mockCachedReactions.get(`${userId}:${postId}`) ?? null,
    },
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: () => ({ accessToken: 'token-1', userId: 'viewer-1' }),
      getUserProfile: () => null,
    },
  }),
);

jest.mock('../../../infrastructure/storage/endedLivePostsStorage', () => ({
  LOCAL_LIVE_ENDED_EVENT: 'localLiveEnded',
  endedLivePostsStorage: {
    markEnded: jest.fn(),
  },
}));

import type {
  LiveSession,
  LiveStreamItem,
} from '../../../domain/types/live.types';
import { useLiveRoomViewModel } from '../useLiveViewModel';

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

function makeLiveItem(postId: number): LiveStreamItem {
  return {
    id: String(postId),
    postId,
    streamName: `stream-${postId}`,
    title: 'Live',
    description: '',
    thumbnailUrl: null,
    startedAt: '2026-08-04T00:00:00.000Z',
    viewerCount: 0,
    state: 'stale',
    privacy: '0',
    publisher: {
      id: 'host-1',
      name: 'Host',
      username: 'host',
      avatarUrl: '',
    },
  };
}

function makeSession(postId: number): LiveSession {
  return {
    postId,
    streamName: `stream-${postId}`,
    provider: 'livekit',
    roomName: `room-${postId}`,
    wsUrl: 'wss://live.example.test',
    token: 'viewer-token',
    isHost: false,
    state: 'stale',
  };
}

const sessions = {
  101: makeSession(101),
  202: makeSession(202),
};

describe('useLiveRoomViewModel reactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCachedReactions.clear();
    mockGetLivePost.mockImplementation((postId: number) =>
      Promise.resolve(makeLiveItem(postId)),
    );
    mockGetComments.mockResolvedValue({
      comments: [],
      viewerCount: 3,
      state: 'stale',
      reactionsCount: 10,
      reactionEvents: [],
    });
    mockSetReaction.mockResolvedValue({ reaction: null });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('optimistically adds, swaps, and clears the viewer reaction', async () => {
    let latest!: ReturnType<typeof useLiveRoomViewModel>;
    function Probe() {
      latest = useLiveRoomViewModel(101, sessions[101]);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });

    expect(latest.myReaction).toBeNull();
    expect(latest.reactionsCount).toBe(0);

    await act(async () => {
      await latest.react('love');
    });
    expect(latest.myReaction).toBe('love');
    expect(latest.reactionsCount).toBe(1);

    await act(async () => {
      await latest.react('haha');
    });
    expect(latest.myReaction).toBe('haha');
    expect(latest.reactionsCount).toBe(1);

    await act(async () => {
      await latest.react('haha');
    });
    expect(latest.myReaction).toBeNull();
    expect(latest.reactionsCount).toBe(0);
    expect(mockSetReaction.mock.calls).toEqual([
      ['101', 'love'],
      ['101', 'haha'],
      ['101', null],
    ]);
    expect(mockCreateFeedRepository).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it('deduplicates rapid taps, rolls back on failure, and rethrows', async () => {
    const request = deferred<{ reaction: null }>();
    mockSetReaction.mockImplementation(() => request.promise);
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    let latest!: ReturnType<typeof useLiveRoomViewModel>;
    function Probe() {
      latest = useLiveRoomViewModel(101, sessions[101]);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });

    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = latest.react('love');
      second = latest.react('haha');
      await Promise.resolve();
    });
    expect(second).toBe(first);
    expect(mockSetReaction).toHaveBeenCalledTimes(1);
    expect(latest.myReaction).toBe('love');
    expect(latest.reactionsCount).toBe(1);
    expect(latest.isReacting).toBe(true);

    const failure = new Error('reaction failed');
    let caughtFailure: unknown;
    await act(async () => {
      request.reject(failure);
      try {
        await first;
      } catch (error) {
        caughtFailure = error;
      }
    });

    expect(caughtFailure).toBe(failure);
    expect(latest.myReaction).toBeNull();
    expect(latest.reactionsCount).toBe(0);
    expect(latest.isReacting).toBe(false);
    expect(emitSpy).toHaveBeenLastCalledWith('postReactionChanged', {
      postId: '101',
      myReaction: null,
      likeCount: 0,
      topReactions: [],
    });
    await act(async () => renderer.unmount());
  });

  it('resets room counters from the new post cache and ignores an old failure', async () => {
    mockCachedReactions.set('viewer-1:202', 'haha');
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    const oldReactionRequest = deferred<{ reaction: null }>();
    const newStreamRequest = deferred<LiveStreamItem>();
    mockSetReaction.mockImplementation(() => oldReactionRequest.promise);
    mockGetLivePost.mockImplementation((postId: number) =>
      postId === 202
        ? newStreamRequest.promise
        : Promise.resolve(makeLiveItem(postId)),
    );
    let latest!: ReturnType<typeof useLiveRoomViewModel>;
    function Probe({ postId }: { postId: 101 | 202 }) {
      latest = useLiveRoomViewModel(postId, sessions[postId]);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe postId={101} />);
      await flushAsyncWork();
    });
    await act(async () => {
      await latest.refreshLiveState();
    });
    expect(latest.myReaction).toBeNull();
    expect(latest.viewerCount).toBe(3);
    expect(latest.reactionsCount).toBe(0);

    let oldPromise!: Promise<void>;
    await act(async () => {
      oldPromise = latest.react('love');
      await Promise.resolve();
    });
    expect(latest.myReaction).toBe('love');
    expect(latest.reactionsCount).toBe(1);

    await act(async () => {
      renderer.update(<Probe postId={202} />);
      await flushAsyncWork();
    });
    expect(latest.myReaction).toBe('haha');
    expect(latest.viewerCount).toBe(0);
    expect(latest.reactionsCount).toBe(0);
    expect(latest.isReacting).toBe(false);

    let oldFailure: unknown;
    await act(async () => {
      oldReactionRequest.reject(new Error('old request'));
      try {
        await oldPromise;
      } catch (error) {
        oldFailure = error;
      }
    });
    expect(oldFailure).toEqual(new Error('old request'));
    expect(latest.myReaction).toBe('haha');
    expect(latest.reactionsCount).toBe(0);
    expect(emitSpy).toHaveBeenLastCalledWith('postReactionChanged', {
      postId: '101',
      myReaction: null,
      likeCount: 0,
      topReactions: [],
    });
    await act(async () => renderer.unmount());
  });

  it('does not let a stale poll overwrite a successful optimistic count', async () => {
    const stalePoll = deferred<{
      comments: never[];
      viewerCount: number;
      state: 'live';
      reactionsCount: number;
      reactionEvents: never[];
    }>();
    const reactionRequest = deferred<{ reaction: 'love' }>();
    mockGetLivePost.mockResolvedValue({
      ...makeLiveItem(101),
      state: 'live',
    });
    mockGetComments.mockResolvedValue({
      comments: [],
      viewerCount: 3,
      state: 'live',
      reactionsCount: 10,
      reactionEvents: [],
    });
    mockSetReaction.mockImplementation(() => reactionRequest.promise);

    let latest!: ReturnType<typeof useLiveRoomViewModel>;
    function Probe() {
      latest = useLiveRoomViewModel(101, sessions[101]);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });
    expect(latest.reactionsCount).toBe(10);

    mockGetComments.mockImplementationOnce(() => stalePoll.promise);
    const callsBeforePoll = mockGetComments.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetComments.mock.calls.length).toBeGreaterThan(callsBeforePoll);

    let reactionPromise!: Promise<void>;
    await act(async () => {
      reactionPromise = latest.react('love');
      await Promise.resolve();
    });
    expect(latest.reactionsCount).toBe(11);

    await act(async () => {
      reactionRequest.resolve({ reaction: 'love' });
      await reactionPromise;
    });
    await act(async () => {
      stalePoll.resolve({
        comments: [],
        viewerCount: 3,
        state: 'live',
        reactionsCount: 10,
        reactionEvents: [],
      });
      await flushAsyncWork();
    });

    expect(latest.myReaction).toBe('love');
    expect(latest.reactionsCount).toBe(11);
    await act(async () => renderer.unmount());
  });

  it('does not let an unreliable viewer poll zero erase a known count', async () => {
    mockGetLivePost.mockResolvedValue({
      ...makeLiveItem(101),
      state: 'live',
    });
    mockGetComments
      .mockResolvedValueOnce({
        comments: [],
        viewerCount: 3,
        state: 'live',
        reactionsCount: 8,
        reactionEvents: [],
      })
      .mockResolvedValueOnce({
        comments: [],
        viewerCount: 4,
        state: 'live',
        reactionsCount: 0,
        reactionEvents: [],
      });
    let latest!: ReturnType<typeof useLiveRoomViewModel>;
    function Probe() {
      latest = useLiveRoomViewModel(101, sessions[101]);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });
    expect(latest.viewerCount).toBe(3);
    expect(latest.reactionsCount).toBe(8);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await flushAsyncWork();
    });
    expect(latest.viewerCount).toBe(4);
    expect(latest.reactionsCount).toBe(8);
    await act(async () => renderer.unmount());
  });

  it('publishes newly observed reaction activity to viewers after baseline', async () => {
    const baselineReaction = {
      id: 'viewer-2:love',
      userId: 'viewer-2',
      name: 'Linh',
      username: 'linh',
      avatarUrl: '',
      reaction: 'love' as const,
      emoji: '❤️',
    };
    const newReaction = {
      id: 'viewer-3:haha',
      userId: 'viewer-3',
      name: 'Minh',
      username: 'minh',
      avatarUrl: '',
      reaction: 'haha' as const,
      emoji: '😂',
    };
    mockGetLivePost.mockResolvedValue({
      ...makeLiveItem(101),
      state: 'live',
    });
    mockGetComments
      .mockResolvedValueOnce({
        comments: [],
        viewerCount: 3,
        state: 'live',
        reactionsCount: 1,
        reactionEvents: [baselineReaction],
      })
      .mockResolvedValueOnce({
        comments: [],
        viewerCount: 4,
        state: 'live',
        reactionsCount: 2,
        reactionEvents: [baselineReaction, newReaction],
      });

    let latest!: ReturnType<typeof useLiveRoomViewModel>;
    function Probe() {
      latest = useLiveRoomViewModel(101, sessions[101]);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });
    expect(latest.reactionEvents).toEqual([]);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await flushAsyncWork();
    });

    expect(latest.reactionEvents).toEqual([newReaction]);
    await act(async () => renderer.unmount());
  });
});
