// Description: Polls unread notification counts without mixing message badges into notifications.
import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import {
  setUnreadBadgeCounts,
  useUnreadBadgeCounts,
} from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { createNotificationsRepository } from '../../infrastructure/repositories/ApiNotificationsRepository';

const POLL_INTERVAL_MS = 30000;

export function useNotificationBadgeViewModel() {
  const repository = useMemo(() => createNotificationsRepository(), []);
  const { notificationCount, messageCount } = useUnreadBadgeCounts();

  const refresh = useCallback(async () => {
    try {
      const counts = await repository.getUnreadCounts();
      setUnreadBadgeCounts({
        notificationCount: counts.notificationCount,
        messageCount: counts.messageCount,
      });
    } catch (error) {
      console.warn('[useNotificationBadgeViewModel] refresh failed', error);
    }
  }, [repository]);

  useEffect(() => {
    refresh().catch(() => undefined);

    const interval = setInterval(() => {
      refresh().catch(() => undefined);
    }, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh().catch(() => undefined);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  return {
    notificationCount,
    messageCount,
    totalUnreadCount: notificationCount,
    refresh,
  };
}
