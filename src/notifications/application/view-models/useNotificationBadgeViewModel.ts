// Description: Polls unread notification counts without mixing message badges into notifications.
import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import {
  setUnreadBadgeCounts,
  useUnreadBadgeCounts,
} from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { createMessagesRepository } from '../../../messages/infrastructure/repositories/ApiMessagesRepository';
import { createNotificationsRepository } from '../../infrastructure/repositories/ApiNotificationsRepository';

const POLL_INTERVAL_MS = 30000;

export function useNotificationBadgeViewModel() {
  const repository = useMemo(() => createNotificationsRepository(), []);
  const messagesRepository = useMemo(() => createMessagesRepository(), []);
  const { notificationCount, messageCount } = useUnreadBadgeCounts();

  const refresh = useCallback(async () => {
    try {
      const [counts, unreadChats] = await Promise.all([
        repository.getUnreadCounts(),
        messagesRepository.getUnreadChats().catch(() => []),
      ]);
      const chatUnreadCount = unreadChats.reduce(
        (total, chat) => total + chat.unreadCount,
        0,
      );
      setUnreadBadgeCounts({
        notificationCount: counts.notificationCount,
        messageCount: Math.max(counts.messageCount, chatUnreadCount),
      });
    } catch (error) {
      console.warn('[useNotificationBadgeViewModel] refresh failed', error);
    }
  }, [messagesRepository, repository]);

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
