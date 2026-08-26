import { createNotificationBadgeSync } from '../notificationBadgeSync';

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('notification badge sync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createHarness() {
    let appActiveListener: (() => void) | null = null;
    let pushListener: (() => void) | null = null;
    let realtimeListener: (() => void) | null = null;
    const unsubscribeAppActive = jest.fn();
    const unsubscribePush = jest.fn();
    const unsubscribeRealtime = jest.fn();
    const fetchNotificationCounts = jest.fn().mockResolvedValue({
      notificationCount: 4,
      messageCount: 2,
    });
    const fetchUnreadChatCount = jest.fn().mockResolvedValue(7);
    const updateCounts = jest.fn();

    const sync = createNotificationBadgeSync(
      {
        fetchNotificationCounts,
        fetchUnreadChatCount,
        updateCounts,
        subscribeToAppActive: listener => {
          appActiveListener = listener;
          return unsubscribeAppActive;
        },
        subscribeToForegroundPush: listener => {
          pushListener = listener;
          return unsubscribePush;
        },
        subscribeToRealtime: listener => {
          realtimeListener = listener;
          return unsubscribeRealtime;
        },
        random: () => 0.5,
      },
      {
        pollIntervalMs: 60_000,
        pollJitterMs: 10_000,
        eventCoalesceMs: 1_500,
      },
    );

    return {
      sync,
      fetchNotificationCounts,
      fetchUnreadChatCount,
      updateCounts,
      unsubscribeAppActive,
      unsubscribePush,
      unsubscribeRealtime,
      emitAppActive: () => appActiveListener?.(),
      emitPush: () => pushListener?.(),
      emitRealtime: () => realtimeListener?.(),
    };
  }

  it('shares one immediate refresh and one set of listeners across subscribers', async () => {
    const harness = createHarness();

    const unsubscribeFirst = harness.sync.subscribe();
    const unsubscribeSecond = harness.sync.subscribe();
    await flushAsyncWork();

    expect(harness.fetchNotificationCounts).toHaveBeenCalledTimes(1);
    expect(harness.fetchUnreadChatCount).toHaveBeenCalledTimes(1);
    expect(harness.updateCounts).toHaveBeenCalledWith({
      notificationCount: 4,
      messageCount: 7,
    });

    unsubscribeFirst();
    expect(harness.unsubscribeAppActive).not.toHaveBeenCalled();

    unsubscribeSecond();
    expect(harness.unsubscribeAppActive).toHaveBeenCalledTimes(1);
    expect(harness.unsubscribePush).toHaveBeenCalledTimes(1);
    expect(harness.unsubscribeRealtime).toHaveBeenCalledTimes(1);
  });

  it('refreshes counts immediately after a coalesced realtime event', async () => {
    const harness = createHarness();
    const unsubscribe = harness.sync.subscribe();
    await flushAsyncWork();

    harness.emitRealtime();
    jest.advanceTimersByTime(1_500);
    await flushAsyncWork();

    expect(harness.fetchNotificationCounts).toHaveBeenCalledTimes(2);
    expect(harness.fetchUnreadChatCount).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('coalesces foreground and push bursts after the initial refresh', async () => {
    const harness = createHarness();
    const unsubscribe = harness.sync.subscribe();
    await flushAsyncWork();

    harness.emitAppActive();
    harness.emitPush();
    harness.emitPush();

    expect(harness.fetchNotificationCounts).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1_500);
    await flushAsyncWork();

    expect(harness.fetchNotificationCounts).toHaveBeenCalledTimes(2);
    expect(harness.fetchUnreadChatCount).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('uses one safe periodic fallback and stops it after the final unsubscribe', async () => {
    const harness = createHarness();
    const unsubscribe = harness.sync.subscribe();
    await flushAsyncWork();

    jest.advanceTimersByTime(59_999);
    expect(harness.fetchNotificationCounts).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    await flushAsyncWork();
    expect(harness.fetchNotificationCounts).toHaveBeenCalledTimes(2);

    unsubscribe();
    jest.advanceTimersByTime(120_000);
    await flushAsyncWork();
    expect(harness.fetchNotificationCounts).toHaveBeenCalledTimes(2);
  });

  it('deduplicates explicit refresh calls while a request is in flight', async () => {
    let resolveCounts!: (value: {
      notificationCount: number;
      messageCount: number;
    }) => void;
    const fetchNotificationCounts = jest.fn(
      () =>
        new Promise<{ notificationCount: number; messageCount: number }>(
          resolve => {
            resolveCounts = resolve;
          },
        ),
    );
    const fetchUnreadChatCount = jest.fn().mockResolvedValue(0);
    const sync = createNotificationBadgeSync({
      fetchNotificationCounts,
      fetchUnreadChatCount,
      updateCounts: jest.fn(),
      subscribeToAppActive: () => jest.fn(),
      subscribeToForegroundPush: () => jest.fn(),
      subscribeToRealtime: () => jest.fn(),
    });

    const first = sync.refresh();
    const second = sync.refresh();

    expect(second).toBe(first);
    expect(fetchNotificationCounts).toHaveBeenCalledTimes(1);
    expect(fetchUnreadChatCount).toHaveBeenCalledTimes(1);

    resolveCounts({ notificationCount: 0, messageCount: 0 });
    await first;
  });
});
