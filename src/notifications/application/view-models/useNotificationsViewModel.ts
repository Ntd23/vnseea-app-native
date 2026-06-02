// Notifications ViewModel
// Port từ: client/src/notifications/application/view-models/

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createMessagesRepository } from '../../../messages/infrastructure/repositories/ApiMessagesRepository';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { createNotificationsRepository } from '../../infrastructure/repositories/ApiNotificationsRepository';
import type {
  NotificationsItem,
} from '../../domain/types/notifications.types';

const PAGE_SIZE = 100;

export function useNotificationsViewModel() {
  const repository = useMemo(() => createNotificationsRepository(), []);
  const messagesRepository = useMemo(() => createMessagesRepository(), []);

  // State
  const [notifications, setNotifications] = useState<NotificationsItem[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadMessageChats, setUnreadMessageChats] = useState<ChatItem[]>([]);

  useEffect(() => {
    setUnreadBadgeCounts({
      notificationCount: unreadCount,
      messageCount: unreadMessageCount,
    });
  }, [unreadCount, unreadMessageCount]);

  // Load first page
  const loadFirstPage = useCallback(
    async (refreshing = false, silent = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [result, unreadChats] = await Promise.all([
          repository.getNotifications({ limit: PAGE_SIZE }),
          messagesRepository.getUnreadChats().catch(() => []),
        ]);

        setNotifications(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
        setUnreadCount(result.unreadCount);
        setUnreadMessageCount(result.unreadMessageCount);
        setUnreadMessageChats(unreadChats);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông báo.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [messagesRepository, repository],
  );

  // Refresh
  const refresh = useCallback(() => {
    loadFirstPage(true);
  }, [loadFirstPage]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!nextOffset || !hasMore || isLoading || isRefreshing || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await repository.getNotifications({
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const fresh = result.items.filter(n => !existingIds.has(n.id));
        return [...prev, ...fresh];
      });

      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải thêm thông báo.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, nextOffset, repository]);

  // Mark single as seen
  const markAsSeen = useCallback(
    async (notificationId: string) => {
      try {
        await repository.markAsSeen(notificationId);

        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, seen: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('[useNotificationsViewModel] markAsSeen failed', err);
      }
    },
    [repository],
  );

  // Mark all as seen
  const markAllAsSeen = useCallback(async () => {
    const unreadNotifications = notifications.filter(notification => !notification.seen);
    if (unreadNotifications.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, seen: true })));
    setUnreadCount(0);

    const results = await Promise.allSettled(
      unreadNotifications.map(notification => repository.markAsSeen(notification.id)),
    );
    const failedIds = new Set(
      unreadNotifications
        .filter((_, index) => results[index].status === 'rejected')
        .map(notification => notification.id),
    );

    if (failedIds.size > 0) {
      setNotifications(prev =>
        prev.map(notification =>
          failedIds.has(notification.id) ? { ...notification, seen: false } : notification
        )
      );
      setUnreadCount(prev => prev + failedIds.size);
      console.warn('[useNotificationsViewModel] markAllAsSeen partially failed');
    }
  }, [notifications, repository]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      // Optimistic remove
      const target = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (target && !target.seen) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      try {
        await repository.deleteNotification(notificationId);
      } catch (err) {
        // Revert on failure
        if (target) {
          setNotifications(prev => [target, ...prev]);
          if (target && !target.seen) {
            setUnreadCount(prev => prev + 1);
          }
        }
        console.warn('[useNotificationsViewModel] deleteNotification failed', err);
      }
    },
    [notifications, repository],
  );

  // Retry
  const retry = useCallback(() => {
    loadFirstPage(false);
  }, [loadFirstPage]);

  return {
    // State
    notifications,
    unreadCount,
    unreadMessageCount,
    unreadMessageChats,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    // Actions
    loadFirstPage,
    refresh,
    loadMore,
    markAsSeen,
    markAllAsSeen,
    deleteNotification,
    retry,
  };
}
