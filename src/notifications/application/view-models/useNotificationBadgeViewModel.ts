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
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  replaceOrderNotificationBadges,
  setOrderNotificationBadgeOwner,
} from '../../../orders/application/notifications/orderNotificationBadgeStore';
import { createNotificationBadgeSync } from './notificationBadgeSync';

let notificationsRepository: ReturnType<
  typeof createNotificationsRepository
> | null = null;
let messagesRepository: ReturnType<typeof createMessagesRepository> | null = null;

async function fetchNotificationCountsAndOrderBadges() {
  notificationsRepository ??= createNotificationsRepository();
  const repository = notificationsRepository;
  const ownerId = sessionStorage.getSession()?.userId;
  setOrderNotificationBadgeOwner(ownerId);

  const refreshOrderBadges = ownerId
    ? repository
        .getNotifications({ limit: 100 })
        .then(page => {
          if (sessionStorage.getSession()?.userId !== ownerId) return;
          replaceOrderNotificationBadges(page.items, ownerId);
        })
        .catch(error => {
          console.warn(
            '[useNotificationBadgeViewModel] order badge refresh failed',
            error,
          );
        })
    : Promise.resolve();

  const [counts] = await Promise.all([
    repository.getUnreadCounts(),
    refreshOrderBadges,
  ]);
  return counts;
}

const notificationBadgeSync = createNotificationBadgeSync({
  fetchNotificationCounts: fetchNotificationCountsAndOrderBadges,
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
  const sessionUserId = sessionStorage.getSession()?.userId;
  const { notificationCount, messageCount } = useUnreadBadgeCounts();

  useEffect(() => {
    setOrderNotificationBadgeOwner(sessionUserId);
  }, [sessionUserId]);

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
