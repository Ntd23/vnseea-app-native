import { createLatestRequestGuard } from '../notificationRequestGuard';

describe('notification request guard', () => {
  it('invalidates stale notification loads without changing React callback dependencies', () => {
    const guard = createLatestRequestGuard();

    const first = guard.begin();
    const second = guard.begin();

    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });
});
