jest.mock('../../../infrastructure/repositories/ApiLiveRepository', () => ({
  createLiveRepository: () => ({
    joinLive: jest.fn(),
  }),
}));

import { createInlineLiveSessionCache } from '../inlineLiveSessionCache';

const liveItem = {
  postId: 101,
  streamName: 'stream-101',
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

describe('inline live session cache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('coalesces concurrent join requests for the same live post', async () => {
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache({ joinLive }, 45_000);

    const [first, second] = await Promise.all([
      cache.load(liveItem),
      cache.load(liveItem),
    ]);

    expect(joinLive).toHaveBeenCalledTimes(1);
    expect(first).toBe(liveSession);
    expect(second).toBe(liveSession);
  });

  it('reuses a warm session until its short TTL expires', async () => {
    let now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const joinLive = jest.fn(async () => liveSession);
    const cache = createInlineLiveSessionCache({ joinLive }, 1_000);

    await cache.load(liveItem);
    now = 1_900;
    await cache.load(liveItem);
    expect(joinLive).toHaveBeenCalledTimes(1);

    now = 2_001;
    await cache.load(liveItem);
    expect(joinLive).toHaveBeenCalledTimes(2);
  });
});
