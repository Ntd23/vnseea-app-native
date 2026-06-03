// Notifications API Repository (Infrastructure)
// Port từ: client/src/notifications/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { NotificationsRepository } from '../../domain/repositories/NotificationsRepository';
import type {
  NotificationsItem,
  NotificationsUnreadCounts,
} from '../../domain/types/notifications.types';
import { asRecord } from '../../../foundation/application/normalizers/resolveValue';

type NotificationRecord = Record<string, unknown>;
type NotificationsResponse = {
  api_status: number | string;
  api_text?: string;
  notifications?: NotificationRecord[];
  count_notifications?: number;
  new_notifications_count?: number;
  count_new_messages?: number;
  data?: NotificationRecord[];
  message?: string;
  errors?: { error_text?: string };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');
const NOTIFICATIONS_PAGE_SIZE = 100;

function readString(record: NotificationRecord | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(record: NotificationRecord | undefined, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const num = Number(record?.[key]);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function readBool(record: NotificationRecord | undefined, key: string): boolean {
  const val = record?.[key];
  if (typeof val === 'number') return val > 0;
  if (typeof val === 'string') return val !== '' && val !== '0' && val !== 'false';
  return val === true;
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

function mapNotification(raw: NotificationRecord): NotificationsItem {
  const notifierRaw = asRecord(raw.notifier) ?? raw;
  const notifierId = readString(notifierRaw, 'user_id', 'id');
  const notifierName = readString(notifierRaw, 'name', 'first_name', 'username');
  const notifierAvatar = normalizeUrl(
    readString(notifierRaw, 'avatar', 'avater')
  );

  return {
    id: readString(raw, 'id', 'notification_id', 'notif_id'),
    notification_id: readString(raw, 'notification_id', 'notif_id', 'id'),
    recipientId: readString(raw, 'recipient_id'),
    notifierId,
    type: readString(raw, 'type'),
    text: readString(raw, 'type_text', 'text', 'description'),
    url: normalizeUrl(readString(raw, 'url')),
    postId: readString(raw, 'post_id', 'postId'),
    pageId: readString(raw, 'page_id'),
    groupId: readString(raw, 'group_id', 'groupId'),
    eventId: readString(raw, 'event_id', 'eventId'),
    seen: readBool(raw, 'seen'),
    seenAt: readNumber(raw, 'seen_at', 'seenAt'),
    createdAt: readNumber(raw, 'time', 'created_at', 'posted_at') ?? 0,
    timeText: readString(raw, 'time_text', 'time_ago'),
    notifier: {
      id: notifierId,
      name: notifierName,
      avatarUrl: notifierAvatar,
      username: readString(notifierRaw, 'username'),
      verified: readBool(notifierRaw, 'verified'),
      isFollowing: readBool(notifierRaw, 'following'),
      isFollowed: readBool(notifierRaw, 'followers'),
    },
  };
}

function isSuccess(status: number | string | undefined): boolean {
  return status === 200 || status === '200' || status === 'success';
}

function mapUnreadCounts(response: NotificationsResponse): NotificationsUnreadCounts {
  return {
    notificationCount:
      response.new_notifications_count ?? response.count_notifications ?? 0,
    messageCount: response.count_new_messages ?? 0,
  };
}

function fetchNotificationsResponse(offset?: string | number | null) {
  const payload: Record<string, string> = {
    fetch: 'notifications,count_new_messages',
    include_all_notifications: '1',
  };
  if (offset) {
    payload.offset = String(offset);
  }

  return apiBridge.post<NotificationsResponse>(
    apiRoutes.notifications.list,
    payload,
  );
}

export function createNotificationsRepository(): NotificationsRepository {
  return {
    async getNotifications(options = {}) {
      try {
        const response = await fetchNotificationsResponse(options.offset);
        const counts = mapUnreadCounts(response);

        const rawItems = response.notifications ?? response.data ?? [];
        const items = Array.isArray(rawItems) ? rawItems : [];

        const mapped: NotificationsItem[] = items.map(item =>
          mapNotification(item as NotificationRecord)
        );

        const lastItem = items[items.length - 1] as NotificationRecord | undefined;
        const nextOffset = readString(lastItem, 'id', 'notification_id') || null;

        return {
          items: mapped,
          nextOffset,
          hasMore: mapped.length >= NOTIFICATIONS_PAGE_SIZE,
          unreadCount: counts.notificationCount,
          unreadMessageCount: counts.messageCount,
        };
      } catch (error) {
        console.warn('[ApiNotificationsRepository] getNotifications failed', error);
        throw error;
      }
    },

    async getUnreadCounts() {
      try {
        const response = await fetchNotificationsResponse();
        return mapUnreadCounts(response);
      } catch (error) {
        console.warn('[ApiNotificationsRepository] getUnreadCounts failed', error);
        throw error;
      }
    },

    async markAsSeen(notificationId: string) {
      try {
        const response = await apiBridge.post<{ api_status: number | string; message?: string }>(
          apiRoutes.notifications.markSeen,
          {
            type: 'mark_seen',
            id: notificationId,
          },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(response.message ?? 'Không thể đánh dấu đã đọc');
        }
      } catch (error) {
        console.warn('[ApiNotificationsRepository] markAsSeen failed', error);
        throw error;
      }
    },

    async deleteNotification(notificationId: string) {
      try {
        const response = await apiBridge.post<{ api_status: number | string; message?: string }>(
          apiRoutes.notifications.delete,
          {
            type: 'delete',
            id: notificationId,
          },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(response.message ?? 'Không thể xóa thông báo');
        }
      } catch (error) {
        console.warn('[ApiNotificationsRepository] deleteNotification failed', error);
        throw error;
      }
    },
  };
}
