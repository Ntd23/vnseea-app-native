import {
  assertLiveCreateSucceeded,
  getLiveCreateErrorMessage,
  LiveCreateError,
} from '../liveCreateError';

describe('live create error contract', () => {
  it('rejects a backend error before session fields are read', () => {
    expect(() =>
      assertLiveCreateSucceeded({
        status: 503,
        error_code: 'livekit_not_ready',
        blocked_reason: 'livekit_not_ready',
        retryable: true,
      }),
    ).toThrow(LiveCreateError);
  });

  it('keeps backend recovery metadata on the typed error', () => {
    try {
      assertLiveCreateSucceeded({
        status: 409,
        error_code: 'live_already_running',
        blocked_reason: 'live_already_running',
        retryable: false,
      });
      throw new Error('expected live create error');
    } catch (error) {
      expect(error).toMatchObject({
        status: 409,
        code: 'live_already_running',
        blockedReason: 'live_already_running',
        retryable: false,
      });
      expect(getLiveCreateErrorMessage(error)).toBe(
        'Bạn đang có một phiên live đang hoạt động.',
      );
    }
  });

  it('accepts canonical success and legacy responses without an error status', () => {
    expect(() =>
      assertLiveCreateSucceeded({ status: 200, post_id: 10 }),
    ).not.toThrow();
    expect(() => assertLiveCreateSucceeded({ post_id: 10 })).not.toThrow();
  });
});
