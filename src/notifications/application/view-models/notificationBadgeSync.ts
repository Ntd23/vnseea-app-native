type BadgeCounts = {
  notificationCount: number;
  messageCount: number;
};

type TimerHandle = ReturnType<typeof setTimeout>;

export type NotificationBadgeSyncDependencies = {
  fetchNotificationCounts: () => Promise<BadgeCounts>;
  fetchUnreadChatCount: () => Promise<number>;
  updateCounts: (counts: BadgeCounts) => void;
  subscribeToAppActive: (listener: () => void) => () => void;
  subscribeToForegroundPush: (listener: () => void) => () => void;
  setTimer?: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
  random?: () => number;
  warn?: (error: unknown) => void;
};

export type NotificationBadgeSyncOptions = {
  pollIntervalMs?: number;
  pollJitterMs?: number;
  eventCoalesceMs?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const DEFAULT_POLL_JITTER_MS = 10_000;
const DEFAULT_EVENT_COALESCE_MS = 1_500;

export function createNotificationBadgeSync(
  dependencies: NotificationBadgeSyncDependencies,
  options: NotificationBadgeSyncOptions = {},
) {
  const setTimer = dependencies.setTimer ?? setTimeout;
  const clearTimer = dependencies.clearTimer ?? clearTimeout;
  const random = dependencies.random ?? Math.random;
  const pollIntervalMs =
    options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const pollJitterMs = options.pollJitterMs ?? DEFAULT_POLL_JITTER_MS;
  const eventCoalesceMs =
    options.eventCoalesceMs ?? DEFAULT_EVENT_COALESCE_MS;

  let subscriberCount = 0;
  let inFlight: Promise<void> | null = null;
  let refreshPending = false;
  let lastRefreshStartedAt = 0;
  let eventTimer: TimerHandle | null = null;
  let pollTimer: TimerHandle | null = null;
  let unsubscribeAppActive: (() => void) | null = null;
  let unsubscribeForegroundPush: (() => void) | null = null;

  const clearEventTimer = () => {
    if (!eventTimer) return;
    clearTimer(eventTimer);
    eventTimer = null;
  };

  const clearPollTimer = () => {
    if (!pollTimer) return;
    clearTimer(pollTimer);
    pollTimer = null;
  };

  const refresh = (): Promise<void> => {
    if (inFlight) return inFlight;

    lastRefreshStartedAt = Date.now();
    inFlight = Promise.all([
      dependencies.fetchNotificationCounts(),
      dependencies.fetchUnreadChatCount().catch(() => 0),
    ])
      .then(([counts, unreadChatCount]) => {
        dependencies.updateCounts({
          notificationCount: counts.notificationCount,
          messageCount: Math.max(counts.messageCount, unreadChatCount),
        });
      })
      .catch(error => {
        dependencies.warn?.(error);
      })
      .finally(() => {
        inFlight = null;
        if (refreshPending && subscriberCount > 0) {
          refreshPending = false;
          requestEventRefresh();
        }
      });

    return inFlight;
  };

  const requestEventRefresh = () => {
    if (subscriberCount === 0 || eventTimer) return;
    if (inFlight) {
      refreshPending = true;
      return;
    }

    const elapsedMs = Date.now() - lastRefreshStartedAt;
    const remainingMs = Math.max(0, eventCoalesceMs - elapsedMs);

    if (remainingMs === 0) {
      void refresh();
      return;
    }

    eventTimer = setTimer(() => {
      eventTimer = null;
      if (subscriberCount > 0) void refresh();
    }, remainingMs);
  };

  const scheduleNextPoll = () => {
    clearPollTimer();
    if (subscriberCount === 0) return;

    const jitterMs = Math.round((random() * 2 - 1) * pollJitterMs);
    pollTimer = setTimer(() => {
      pollTimer = null;
      requestEventRefresh();
      scheduleNextPoll();
    }, Math.max(1_000, pollIntervalMs + jitterMs));
  };

  const subscribe = () => {
    subscriberCount += 1;

    if (subscriberCount === 1) {
      unsubscribeAppActive = dependencies.subscribeToAppActive(
        requestEventRefresh,
      );
      unsubscribeForegroundPush = dependencies.subscribeToForegroundPush(
        requestEventRefresh,
      );
      void refresh();
      scheduleNextPoll();
    }

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      subscriberCount = Math.max(0, subscriberCount - 1);

      if (subscriberCount > 0) return;

      clearEventTimer();
      clearPollTimer();
      refreshPending = false;
      unsubscribeAppActive?.();
      unsubscribeForegroundPush?.();
      unsubscribeAppActive = null;
      unsubscribeForegroundPush = null;
    };
  };

  return {
    refresh,
    subscribe,
  };
}
