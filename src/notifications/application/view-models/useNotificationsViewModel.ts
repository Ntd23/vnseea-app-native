// Description: Manages non-message notification list state, unread badge counts, filters, and language.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { createNotificationsRepository } from '../../infrastructure/repositories/ApiNotificationsRepository';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import {
  filterNotificationsByType,
  getCopy,
  type NotificationFilterType,
} from '../../application/i18n/notificationCopy';
import { createLatestRequestGuard } from './notificationRequestGuard';

const PAGE_SIZE = 100;

// API response types
type GroupChatActionResponse = {
  api_status: number;
  message_data?: string;
  errors?: { error_text: string };
};

export type NotificationTab = 'all' | 'unread';

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

  // Pending actions state (for accept/reject group chat)
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // UI state — tabs, filter, language
  const [activeTab, setActiveTabState] = useState<NotificationTab>('all');
  const [activeFilter, setActiveFilterState] = useState<NotificationFilterType>('all');
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    languageStorage.getLanguage(),
  );

  const latestRequestGuardRef = useRef(createLatestRequestGuard());

  const setActiveTab = useCallback((tab: NotificationTab) => {
    setActiveTabState(tab);
  }, []);

  const setActiveFilter = useCallback((filter: NotificationFilterType) => {
    setActiveFilterState(filter);
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    languageStorage.setLanguage(next);
    setLanguageState(next);
  }, []);

  const copy = useMemo(() => getCopy(language), [language]);

  // Tab-filtered + type-filtered list.
  const filteredNotifications = useMemo(() => {
    const typeFiltered = filterNotificationsByType(notifications, activeFilter);
    if (activeTab === 'unread') {
      return typeFiltered.filter(item => !item.seen);
    }
    return typeFiltered;
  }, [activeFilter, activeTab, notifications]);

  useEffect(() => {
    setUnreadBadgeCounts({
      notificationCount: unreadCount,
    });
  }, [unreadCount]);

  // Load first page
  const loadFirstPage = useCallback(
    async (refreshing = false, silent = false) => {
      const requestId = latestRequestGuardRef.current.begin();
      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await repository.getNotifications({ limit: PAGE_SIZE });
        if (!latestRequestGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setNotifications(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
        setUnreadCount(result.unreadCount);
      } catch (err) {
        if (!latestRequestGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông báo.',
        );
      } finally {
        if (latestRequestGuardRef.current.isCurrent(requestId)) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [repository],
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

  // Accept group chat invitation
  const acceptGroupChatInvitation = useCallback(
    async (groupChatId: string): Promise<boolean> => {
      // Prevent duplicate actions
      if (pendingActions.has(groupChatId)) {
        return false;
      }

      setPendingActions(prev => new Set(prev).add(groupChatId));

      try {
        const response = await apiBridge.post<GroupChatActionResponse>(
          'group_chat',
          { type: 'accept', group_id: groupChatId },
        );

        if (response.api_status === 200) {
          setNotifications(prev =>
            prev.filter(n => n.groupChatId !== groupChatId)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
          return true;
        } else {
          const errorMsg = response.errors?.error_text || copy.acceptFailed;
          console.warn('[useNotificationsViewModel] Accept failed:', errorMsg);
          return false;
        }
      } catch (err) {
        console.error('[useNotificationsViewModel] Accept error:', err);
        return false;
      } finally {
        setPendingActions(prev => {
          const next = new Set(prev);
          next.delete(groupChatId);
          return next;
        });
      }
    },
    [copy.acceptFailed, pendingActions],
  );

  // Reject group chat invitation
  const rejectGroupChatInvitation = useCallback(
    async (groupChatId: string): Promise<boolean> => {
      // Prevent duplicate actions
      if (pendingActions.has(groupChatId)) {
        return false;
      }

      setPendingActions(prev => new Set(prev).add(groupChatId));

      try {
        const response = await apiBridge.post<GroupChatActionResponse>(
          'group_chat',
          { type: 'reject', group_id: groupChatId },
        );

        if (response.api_status === 200) {
          setNotifications(prev =>
            prev.filter(n => n.groupChatId !== groupChatId)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
          return true;
        } else {
          const errorMsg = response.errors?.error_text || copy.rejectFailed;
          console.warn('[useNotificationsViewModel] Reject failed:', errorMsg);
          return false;
        }
      } catch (err) {
        console.error('[useNotificationsViewModel] Reject error:', err);
        return false;
      } finally {
        setPendingActions(prev => {
          const next = new Set(prev);
          next.delete(groupChatId);
          return next;
        });
      }
    },
    [copy.rejectFailed, pendingActions],
  );

  return {
    // State
    notifications,
    filteredNotifications,
    unreadCount,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    pendingActions,
    // UI state
    activeTab,
    setActiveTab,
    activeFilter,
    setActiveFilter,
    language,
    setLanguage,
    copy,
    // Actions
    loadFirstPage,
    refresh,
    loadMore,
    markAsSeen,
    markAllAsSeen,
    deleteNotification,
    retry,
    acceptGroupChatInvitation,
    rejectGroupChatInvitation,
  };
}
