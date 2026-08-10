import {
  createFeedNetworkPolicy,
  getFeedPrefetchRetryDelay,
} from '../feedNetworkPolicy';

describe('feed network policy', () => {
  it('backs off failed prefetches instead of retrying every 900ms forever', () => {
    expect(
      Array.from({ length: 8 }, (_, index) =>
        getFeedPrefetchRetryDelay(index + 1),
      ),
    ).toEqual([900, 1_800, 3_600, 7_200, 14_400, 28_800, 30_000, 30_000]);

    let elapsedMs = 0;
    let attemptsWithinOneMinute = 0;

    while (elapsedMs < 60_000) {
      attemptsWithinOneMinute += 1;
      elapsedMs += getFeedPrefetchRetryDelay(attemptsWithinOneMinute);
    }

    expect(attemptsWithinOneMinute).toBe(7);
  });

  it('keeps useful reveal batches even after the network becomes slow', () => {
    const policy = createFeedNetworkPolicy();

    expect(policy.getPolicy()).toMatchObject({
      mode: 'normal',
      pageSize: 20,
      revealBatchSize: 10,
      bufferTarget: 20,
    });

    policy.recordSuccess(2_000, 1_000);

    expect(policy.getPolicy()).toMatchObject({
      mode: 'constrained',
      pageSize: 10,
      revealBatchSize: 10,
      bufferTarget: 10,
    });
  });

  it('enters constrained mode after a transport failure', () => {
    const policy = createFeedNetworkPolicy();

    policy.recordFailure(2_000);

    expect(policy.getPolicy().mode).toBe('constrained');
  });

  it('recovers only after the hold window and three fast samples', () => {
    const policy = createFeedNetworkPolicy();
    policy.recordFailure(1_000);

    policy.recordSuccess(500, 20_999);
    expect(policy.getPolicy().mode).toBe('constrained');

    policy.recordSuccess(500, 21_000);
    policy.recordSuccess(600, 21_100);
    expect(policy.getPolicy().mode).toBe('normal');
  });
});
