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
import { getLocallySeenSyntheticNotificationIds } from '../../infrastructure/storage/notificationsCacheStorage';
import {
  replaceOrderNotificationBadges,
  setOrderNotificationBadgeOwner,
} from '../../../orders/application/notifications/orderNotificationBadgeStore';
import { createNotificationBadgeSync } from './notificationBadgeSync';
import { subscribeToMessageRealtimeEvent } from '../../../messages/infrastructure/realtime/messageRealtimeRuntime';

let notificationsRepository: ReturnType<
  typeof createNotificationsRepository
> | null = null;
let messagesRepository: ReturnType<typeof createMessagesRepository> | null = null;

async function fetchNotificationCountsAndOrderBadges() {
  notificationsRepository ??= createNotificationsRepository();
  const repository = notificationsRepository;
  const ownerId = sessionStorage.getSession()?.userId;
  setOrderNotificationBadgeOwner(ownerId);

  const notificationsPagePromise = ownerId
    ? repository
        .getNotifications({ limit: 100 })
        .catch(error => {
          console.warn(
            '[useNotificationBadgeViewModel] order badge refresh failed',
            error,
          );
          return null;
        })
    : Promise.resolve(null);

  const [counts, page] = await Promise.all([
    repository.getUnreadCounts(),
    notificationsPagePromise,
  ]);

  if (page && sessionStorage.getSession()?.userId === ownerId) {
    replaceOrderNotificationBadges(page.items, ownerId);
  }

  const locallySeenSyntheticIds =
    getLocallySeenSyntheticNotificationIds(ownerId);
  const locallySeenSyntheticCount = (page?.items ?? []).filter(
    item => !item.seen && locallySeenSyntheticIds.has(item.id),
  ).length;

  return {
    ...counts,
    notificationCount: Math.max(
      0,
      counts.notificationCount - locallySeenSyntheticCount,
    ),
  };
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
  subscribeToRealtime: listener => {
    const unsubscribers = [
      subscribeToMessageRealtimeEvent('notification:counts-changed', listener),
      subscribeToMessageRealtimeEvent('request:new', listener),
      subscribeToMessageRealtimeEvent('group-chat-request:new', listener),
      subscribeToMessageRealtimeEvent('navigation:counts-changed', listener),
    ];
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  },
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
