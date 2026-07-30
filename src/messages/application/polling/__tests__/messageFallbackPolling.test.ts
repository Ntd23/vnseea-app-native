import {
  CHAT_FALLBACK_POLL_DELAYS_MS,
  getBoundedFallbackPollDelay,
  MESSAGE_LIST_FALLBACK_POLL_DELAYS_MS,
} from '../messageFallbackPolling';

describe('message fallback polling policy', () => {
  it('backs off open-chat polling and stays bounded', () => {
    expect(
      [0, 1, 2, 3, 99].map(attempt =>
        getBoundedFallbackPollDelay(
          CHAT_FALLBACK_POLL_DELAYS_MS,
          attempt,
        ),
      ),
    ).toEqual([7_000, 15_000, 30_000, 30_000, 30_000]);
  });

  it('backs off message-list polling and handles invalid input safely', () => {
    expect(
      [0, 1, 2, 3, 4].map(attempt =>
        getBoundedFallbackPollDelay(
          MESSAGE_LIST_FALLBACK_POLL_DELAYS_MS,
          attempt,
        ),
      ),
    ).toEqual([5_000, 10_000, 20_000, 30_000, 30_000]);
    expect(getBoundedFallbackPollDelay([], 0)).toBe(30_000);
    expect(getBoundedFallbackPollDelay([5_000], -1)).toBe(5_000);
  });
});
