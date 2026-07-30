import { useSyncExternalStore } from 'react';

export type UnreadBadgeCounts = {
  notificationCount: number;
  messageCount: number;
};

const listeners = new Set<() => void>();
let counts: UnreadBadgeCounts = {
  notificationCount: 0,
  messageCount: 0,
};

function getSnapshot() {
  return counts;
}

export function getUnreadBadgeCountsSnapshot() {
  return getSnapshot();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setUnreadBadgeCounts(next: Partial<UnreadBadgeCounts>) {
  const updated = {
    notificationCount: Math.max(
      0,
      next.notificationCount ?? counts.notificationCount,
    ),
    messageCount: Math.max(0, next.messageCount ?? counts.messageCount),
  };

  if (
    updated.notificationCount === counts.notificationCount &&
    updated.messageCount === counts.messageCount
  ) {
    return;
  }

  counts = updated;
  listeners.forEach(listener => listener());
}

export function useUnreadBadgeCounts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
