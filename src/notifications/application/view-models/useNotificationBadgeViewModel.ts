// Description: Shares one unread-badge scheduler across every mounted badge consumer.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  setUnreadBadgeCounts,
  useUnreadBadgeCounts,
} from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { createMessagesRepository } from '../../../messages/infrastructure/repositories/ApiMessagesRepository';
import { createNotificationsRepository } from '../../infrastructure/repositories/ApiNotificationsRepository';
import { foregroundPushEvents } from '../../../shared-kernel/infrastructure/push/foregroundPushEvents';
import { createNotificationBadgeSync } from './notificationBadgeSync';

let notificationsRepository: ReturnType<
  typeof createNotificationsRepository
> | null = null;
let messagesRepository: ReturnType<typeof createMessagesRepository> | null = null;

const notificationBadgeSync = createNotificationBadgeSync({
  fetchNotificationCounts: () => {
    notificationsRepository ??= createNotificationsRepository();
    return notificationsRepository.getUnreadCounts();
  },
  fetchUnreadChatCount: async () => {
    messagesRepository ??= createMessagesRepository();
    const unreadChats = await messagesRepository.getUnreadChats();
    return unreadChats.reduce(
      (total, chat) => total + chat.unreadCount,
      0,
    );
  },
  updateCounts: setUnreadBadgeCounts,
  subscribeToAppActive: listener => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') listener();
    });
    return () => subscription.remove();
  },
  subscribeToForegroundPush: listener =>
    foregroundPushEvents.subscribe(listener),
  warn: error => {
    console.warn('[useNotificationBadgeViewModel] refresh failed', error);
  },
});

export function useNotificationBadgeViewModel() {
  const { notificationCount, messageCount } = useUnreadBadgeCounts();

  useEffect(() => {
    return notificationBadgeSync.subscribe();
  }, []);

  return {
    notificationCount,
    messageCount,
    totalUnreadCount: notificationCount,
    refresh: notificationBadgeSync.refresh,
  };
}
