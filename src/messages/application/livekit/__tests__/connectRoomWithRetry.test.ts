jest.mock('livekit-client', () => {
  class ConnectionError extends Error {
    reason: number;
    constructor(message: string, reason: number) {
      super(message);
      this.name = 'ConnectionError';
      this.reason = reason;
    }
  }
  return { ConnectionError, ConnectionErrorReason: { NotAllowed: 0, ServerUnreachable: 1 } };
});

import { ConnectionError } from 'livekit-client';
import { connectRoomWithRetry, isLiveKitServerUnreachable } from '../connectRoomWithRetry';

const Unreachable = () =>
  new (ConnectionError as unknown as new (m: string, r: number) => Error)(
    'could not establish signal connection: Network request failed',
    1,
  );
const Rejected = () =>
  new (ConnectionError as unknown as new (m: string, r: number) => Error)('invalid token', 0);

describe('connectRoomWithRetry', () => {
  it('rides out a refused signal connection with growing pauses', async () => {
    const connect = jest
      .fn()
      .mockRejectedValueOnce(Unreachable())
      .mockRejectedValueOnce(Unreachable())
      .mockResolvedValueOnce(undefined);
    const waits: number[] = [];
    const onRetry = jest.fn();

    await connectRoomWithRetry({ connect }, 'wss://lk', 'token', { autoSubscribe: false }, {
      shouldContinue: () => true,
      onRetry,
      wait: async ms => {
        waits.push(ms);
      },
    });

    expect(connect).toHaveBeenCalledTimes(3);
    expect(connect).toHaveBeenCalledWith('wss://lk', 'token', { autoSubscribe: false });
    expect(waits).toEqual([1000, 2000]);
    expect(onRetry.mock.calls.map(call => call[0])).toEqual([1, 2]);
  });

  it('gives up after three attempts and on errors a retry cannot fix', async () => {
    const unreachable = jest.fn().mockRejectedValue(Unreachable());
    await expect(
      connectRoomWithRetry({ connect: unreachable }, 'u', 't', {}, {
        shouldContinue: () => true,
        wait: async () => undefined,
      }),
    ).rejects.toThrow('Network request failed');
    expect(unreachable).toHaveBeenCalledTimes(3);

    const rejected = jest.fn().mockRejectedValue(Rejected());
    await expect(
      connectRoomWithRetry({ connect: rejected }, 'u', 't', {}, { shouldContinue: () => true }),
    ).rejects.toThrow('invalid token');
    expect(rejected).toHaveBeenCalledTimes(1);
  });

  it('stops retrying once the call ended during the pause', async () => {
    let active = true;
    const connect = jest.fn().mockRejectedValue(Unreachable());
    await expect(
      connectRoomWithRetry({ connect }, 'u', 't', {}, {
        shouldContinue: () => active,
        wait: async () => {
          active = false;
        },
      }),
    ).rejects.toThrow('Network request failed');
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('recognizes unreachable errors by shape as well', () => {
    expect(isLiveKitServerUnreachable(Unreachable())).toBe(true);
    expect(isLiveKitServerUnreachable({ name: 'ConnectionError', reason: 1 })).toBe(true);
    expect(isLiveKitServerUnreachable(Rejected())).toBe(false);
    expect(isLiveKitServerUnreachable(new Error('x'))).toBe(false);
  });
});
