// Notifications ViewModel
// Port từ: client/src/notifications/application/view-models/

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createNotificationsRepository } from '../../infrastructure/repositories/ApiNotificationsRepository';
import type {
  NotificationsItem,
} from '../../domain/types/notifications.types';

const PAGE_SIZE = 30;

export function useNotificationsViewModel() {
  const repository = useMemo(() => createNotificationsRepository(), []);

  // State
  const [notifications, setNotifications] = useState<NotificationsItem[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load first page
  const loadFirstPage = useCallback(
    async (refreshing = false) => {
      refreshing ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const result = await repository.getNotifications({ limit: PAGE_SIZE });

        setNotifications(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
        setUnreadCount(result.unreadCount);
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
    [repository],
  );

  // Refresh
  const refresh = useCallback(() => {
    void loadFirstPage(true);
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
    // Optimistic update all
    setNotifications(prev => prev.map(n => ({ ...n, seen: true })));
    setUnreadCount(0);
  }, []);

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
    void loadFirstPage(false);
  }, [loadFirstPage]);

  // Auto-load on mount
  useEffect(() => {
    void loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    notifications,
    unreadCount,
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
