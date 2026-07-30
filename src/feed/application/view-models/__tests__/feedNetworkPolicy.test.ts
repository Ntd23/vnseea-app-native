import { createFeedNetworkPolicy } from '../feedNetworkPolicy';

describe('feed network policy', () => {
  it('keeps useful reveal batches even after the network becomes slow', () => {
    const policy = createFeedNetworkPolicy();

    expect(policy.getPolicy()).toMatchObject({
      mode: 'normal',
      pageSize: 20,
      revealBatchSize: 10,
      bufferTarget: 40,
    });

    policy.recordSuccess(2_000, 1_000);

    expect(policy.getPolicy()).toMatchObject({
      mode: 'constrained',
      pageSize: 10,
      revealBatchSize: 5,
      bufferTarget: 20,
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
