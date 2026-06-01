// Notifications API Repository (Infrastructure)
// Port từ: client/src/notifications/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { NotificationsRepository } from '../../domain/repositories/NotificationsRepository';
import type {
  NotificationsItem,
  NotificationsListOptions,
  NotificationsListPage,
} from '../../domain/types/notifications.types';
import { mapUserSummary } from '../../../foundation/application/mappers/userSummaryMapper';
import { asRecord } from '../../../foundation/application/normalizers/resolveValue';

type NotificationRecord = Record<string, unknown>;
type NotificationsResponse = {
  api_status: number | string;
  api_text?: string;
  notifications?: NotificationRecord[];
  count_notifications?: number;
  data?: NotificationRecord[];
  message?: string;
  errors?: { error_text?: string };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

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
  return val === 1 || val === '1' || val === true;
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
    text: readString(raw, 'text', 'description'),
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

export function createNotificationsRepository(): NotificationsRepository {
  return {
    async getNotifications(options = {}) {
      const limit = options.limit ?? 30;

      try {
        const response = await apiBridge.post<NotificationsResponse>(
          apiRoutes.notifications.list,
          {
            user_id: 'me',
            limit: String(limit),
            offset: options.offset ? String(options.offset) : undefined,
          },
        );

        // Handle both response formats: notifications[] or data[]
        const rawItems = response.notifications ?? response.data ?? [];
        const items = Array.isArray(rawItems) ? rawItems : [];

        const mapped: NotificationsItem[] = items.map(item =>
          mapNotification(item as NotificationRecord)
        );

        const lastItem = items[items.length - 1] as NotificationRecord | undefined;
        const nextOffset = lastItem
          ? String(readNumber(lastItem, 'id', 'notification_id') ?? '')
          : null;

        return {
          items: mapped,
          nextOffset,
          hasMore: mapped.length >= limit,
          unreadCount: response.count_notifications ?? 0,
        };
      } catch (error) {
        console.warn('[ApiNotificationsRepository] getNotifications failed', error);
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
