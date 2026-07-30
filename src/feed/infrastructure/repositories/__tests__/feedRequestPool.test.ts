import { mapFeedRequestsWithConcurrency } from '../feedRequestPool';

describe('feed request pool', () => {
  it('caps active requests and preserves input order', async () => {
    let active = 0;
    let maxActive = 0;
    const releases: Array<() => void> = [];

    const request = mapFeedRequestsWithConcurrency(
      [1, 2, 3, 4, 5, 6, 7, 8],
      4,
      async value => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>(resolve => releases.push(resolve));
        active -= 1;
        return value * 10;
      },
    );

    await Promise.resolve();
    expect(active).toBe(4);
    expect(maxActive).toBe(4);

    while (releases.length > 0 || active > 0) {
      releases.splice(0).forEach(release => release());
      await Promise.resolve();
      await Promise.resolve();
    }

    await expect(request).resolves.toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
    expect(maxActive).toBe(4);
  });
});
