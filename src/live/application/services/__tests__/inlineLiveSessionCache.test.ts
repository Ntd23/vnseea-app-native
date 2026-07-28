jest.mock('../../../infrastructure/repositories/ApiLiveRepository', () => ({
  createLiveRepository: () => ({
    getLivePost: jest.fn(),
    joinLive: jest.fn(),
  }),
}));

import {
  createInlineLiveSessionCache,
  InlineLiveEndedError,
  InlineLiveUnavailableError,
} from '../inlineLiveSessionCache';
import type { LiveStreamItem } from '../../../domain/types/live.types';

const liveItem: Pick<LiveStreamItem, 'postId' | 'streamName'> = {
  postId: 101,
  streamName: 'stream-101',
};

const liveStream: LiveStreamItem = {
  id: '101',
  postId: 101,
  streamName: 'stream-101-fresh',
  title: 'Live',
  description: '',
  thumbnailUrl: null,
  startedAt: '2026-07-28T00:00:00.000Z',
  viewerCount: 0,
  state: 'live',
  privacy: '0',
  publisher: {
    id: '1',
    name: 'Host',
    username: 'host',
    avatarUrl: '',
  },
};

const liveSession = {
  postId: 101,
  streamName: 'stream-101',
  provider: 'livekit',
  roomName: 'room-101',
  wsUrl: 'wss://live.example.test',
  token: 'viewer-token',
  isHost: false,
  state: 'live' as const,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('inline live session cache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('coalesces concurrent join requests for the same live post', async () => {
    const getLivePost = jest.fn(async () => liveStream);
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache(
      { getLivePost, joinLive },
      45_000,
    );

    const [first, second] = await Promise.all([
      cache.load(liveItem),
      cache.load(liveItem),
    ]);

    expect(getLivePost).toHaveBeenCalledTimes(1);
    expect(joinLive).toHaveBeenCalledTimes(1);
    expect(joinLive).toHaveBeenCalledWith(101, 'stream-101-fresh');
    expect(first).toBe(liveSession);
    expect(second).toBe(liveSession);
  });

  it('reuses a warm session until its short TTL expires', async () => {
    let now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const getLivePost = jest.fn(async () => liveStream);
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache(
      { getLivePost, joinLive },
      1_000,
    );

    await cache.load(liveItem);
    now = 1_900;
    await cache.load(liveItem);
    expect(getLivePost).toHaveBeenCalledTimes(1);
    expect(joinLive).toHaveBeenCalledTimes(1);

    now = 2_001;
    await cache.load(liveItem);
    expect(getLivePost).toHaveBeenCalledTimes(2);
    expect(joinLive).toHaveBeenCalledTimes(2);
  });

  it('rejects an ended live before requesting a viewer token', async () => {
    const getLivePost = jest.fn(async () => null);
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache({ getLivePost, joinLive });

    await expect(cache.load(liveItem)).rejects.toBeInstanceOf(
      InlineLiveEndedError,
    );
    expect(joinLive).not.toHaveBeenCalled();
  });

  it('treats a heartbeat-offline snapshot as retryable, not permanently ended', async () => {
    const getLivePost = jest.fn(async () => ({
      ...liveStream,
      state: 'offline' as const,
    }));
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache({ getLivePost, joinLive });

    await expect(cache.load(liveItem)).rejects.toMatchObject({
      name: 'InlineLiveUnavailableError',
      reason: 'offline',
    } satisfies Partial<InlineLiveUnavailableError>);
    expect(joinLive).not.toHaveBeenCalled();
  });

  it('still joins a heartbeat-stale stream while the room is recoverable', async () => {
    const getLivePost = jest.fn(async () => ({
      ...liveStream,
      state: 'stale' as const,
    }));
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache({ getLivePost, joinLive });

    await expect(cache.load(liveItem)).resolves.toBe(liveSession);
    expect(joinLive).toHaveBeenCalledWith(101, 'stream-101-fresh');
  });

  it('loads a new session after invalidation', async () => {
    const getLivePost = jest.fn(async () => liveStream);
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache({ getLivePost, joinLive });

    await cache.load(liveItem);
    cache.invalidate(liveItem);
    await cache.load(liveItem);

    expect(getLivePost).toHaveBeenCalledTimes(2);
    expect(joinLive).toHaveBeenCalledTimes(2);
  });

  it('does not let an invalidated slow request overwrite the fresh session', async () => {
    const slowStream = deferred<LiveStreamItem>();
    const freshStream = {
      ...liveStream,
      streamName: 'stream-101-freshest',
    };
    const slowSession = { ...liveSession, token: 'slow-token' };
    const freshSession = { ...liveSession, token: 'fresh-token' };
    const getLivePost = jest
      .fn()
      .mockImplementationOnce(() => slowStream.promise)
      .mockResolvedValueOnce(freshStream);
    const joinLive = jest.fn(
      async (_postId: number, streamName?: string) =>
        streamName === freshStream.streamName ? freshSession : slowSession,
    );
    const cache = createInlineLiveSessionCache({ getLivePost, joinLive });

    const slowLoad = cache.load(liveItem);
    cache.invalidate(liveItem);
    await expect(cache.load(liveItem)).resolves.toBe(freshSession);

    slowStream.resolve(liveStream);
    await expect(slowLoad).resolves.toBe(slowSession);
    expect(cache.peek(liveItem)).toBe(freshSession);
  });
});
