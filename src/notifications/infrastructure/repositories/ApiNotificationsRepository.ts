// Description: Maps backend notification payloads into app notifications with navigation targets.
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
  group_chat_requests?: NotificationRecord[];
  count_notifications?: number;
  new_notifications_count?: number;
  new_group_chat_requests_count?: number | string;
  count_new_messages?: number;
  data?: NotificationRecord[];
  message?: string;
  errors?: { error_text?: string };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');
const NOTIFICATIONS_PAGE_SIZE = 100;
const MESSAGE_NOTIFICATION_TYPES = new Set([
  'added_you_to_group',
  'accept_group_chat_request',
  'declined_group_chat_request',
]);

function isMessageRelatedNotification(type: string) {
  const normalized = type.toLowerCase();
  return (
    MESSAGE_NOTIFICATION_TYPES.has(normalized) ||
    normalized.includes('message') ||
    normalized.includes('chat')
  );
}

function readString(record: NotificationRecord | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readTargetString(record: NotificationRecord | undefined, ...keys: string[]): string {
  const value = readString(record, ...keys).trim();
  return value && value !== '0' ? value : '';
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

function readUrlTargetId(url: string, patterns: RegExp[]): string {
  if (!url) return '';
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      const value = decodeURIComponent(match[1]).trim();
      if (value && value !== '0') {
        return value;
      }
    }
  }
  return '';
}

function readAnyUrlTargetId(urls: string[], patterns: RegExp[]): string {
  for (const url of urls) {
    const id = readUrlTargetId(url, patterns);
    if (id) return id;
  }
  return '';
}

function mapNotification(raw: NotificationRecord): NotificationsItem {
  const notifierRaw = asRecord(raw.notifier) ?? raw;
  const productRaw = asRecord(raw.product);
  const fundingRaw = asRecord(raw.fund) ?? asRecord(raw.funding);
  const jobRaw = asRecord(raw.job);
  const rawUrl = readString(raw, 'url');
  const ajaxUrl = readString(raw, 'ajax_url');
  const fullLink = readString(raw, 'full_link');
  const normalizedUrl = normalizeUrl(rawUrl);
  const targetUrls = [rawUrl, ajaxUrl, fullLink, normalizedUrl].filter(Boolean);
  const notifierId = readString(notifierRaw, 'user_id', 'id');
  const notifierName = readString(notifierRaw, 'name', 'first_name', 'username');
  const notifierAvatar = normalizeUrl(
    readString(notifierRaw, 'avatar', 'avater')
  );
  const postId =
    readTargetString(raw, 'post_id', 'postId') ||
    readAnyUrlTargetId(targetUrls, [
      /[?&]post_id=([^&#]+)/i,
      /[?&]link1=post[^#]*[?&]id=([^&#]+)/i,
      /\/post\/([^/?#]+)/i,
    ]);
  const productId =
    readTargetString(raw, 'product_id', 'productId') ||
    readTargetString(productRaw, 'product_id', 'id') ||
    readAnyUrlTargetId(targetUrls, [
      /[?&]product_id=([^&#]+)/i,
      /[?&]link1=(?:edit-product|products)[^#]*[?&](?:id|c_id)=([^&#]+)/i,
      /\/products?\/([^/?#]+)/i,
      /\/market(?:place)?\/(?:product\/)?([^/?#]+)/i,
    ]);
  const fundingId =
    readTargetString(raw, 'fund_id', 'funding_id', 'fundId', 'fundingId') ||
    readTargetString(fundingRaw, 'fund_id', 'funding_id', 'id', 'hashed_id') ||
    readAnyUrlTargetId(targetUrls, [
      /[?&]fund_id=([^&#]+)/i,
      /[?&]funding_id=([^&#]+)/i,
      /[?&]link1=show_fund[^#]*[?&]id=([^&#]+)/i,
      /\/(?:funding|show_fund|fund)\/([^/?#]+)/i,
    ]);
  const blogId =
    readTargetString(raw, 'blog_id', 'blogId') ||
    readAnyUrlTargetId(targetUrls, [
      /[?&]blog_id=([^&#]+)/i,
      /[?&]link1=read-blog[^#]*[?&]id=([^&#]+)/i,
      /\/(?:read-blog|blog)\/([^/?#]+)/i,
    ]);
  const jobId =
    readTargetString(raw, 'job_id', 'jobId') ||
    readTargetString(jobRaw, 'job_id', 'id') ||
    readAnyUrlTargetId(targetUrls, [
      /[?&]job_id=([^&#]+)/i,
      /[?&]type=job_apply[^#]*[?&]id=([^&#]+)/i,
      /\/jobs?\/([^/?#]+)/i,
    ]);

  return {
    id: readString(raw, 'id', 'notification_id', 'notif_id'),
    notification_id: readString(raw, 'notification_id', 'notif_id', 'id'),
    recipientId: readString(raw, 'recipient_id'),
    notifierId,
    type: readString(raw, 'type'),
    text: readString(raw, 'type_text', 'text', 'description'),
    url: normalizedUrl,
    postId,
    pageId: readTargetString(raw, 'page_id'),
    groupId: readTargetString(raw, 'group_id', 'groupId'),
    eventId: readTargetString(raw, 'event_id', 'eventId'),
    productId,
    fundingId,
    blogId,
    jobId,
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

function mapGroupChatRequest(raw: NotificationRecord): NotificationsItem | null {
  const groupTab = asRecord(raw.group_tab) ?? {};
  const groupChatId =
    readString(raw, 'group_id') || readString(groupTab, 'group_id', 'id');

  if (!groupChatId) {
    return null;
  }

  const groupName =
    readString(groupTab, 'group_name', 'name') || 'Nhóm chat';
  const ownerId = readString(groupTab, 'user_id');
  const avatar = normalizeUrl(readString(groupTab, 'avatar'));
  const createdAt =
    readNumber(groupTab, 'time', 'created_at') ??
    readNumber(raw, 'time', 'created_at') ??
    0;

  return {
    id: `group-chat-request:${groupChatId}`,
    notification_id: `group-chat-request:${groupChatId}`,
    recipientId: readString(raw, 'user_id'),
    notifierId: ownerId,
    type: 'added_you_to_group',
    text: `Bạn được mời vào nhóm chat ${groupName}`,
    url: '',
    groupChatId,
    seen: false,
    createdAt,
    timeText: readString(groupTab, 'time_text') || readString(raw, 'time_text'),
    notifier: {
      id: ownerId || groupChatId,
      name: groupName,
      avatarUrl: avatar,
      username: '',
      verified: false,
      isFollowing: false,
      isFollowed: false,
    },
  };
}

function isSuccess(status: number | string | undefined): boolean {
  return status === 200 || status === '200' || status === 'success';
}

function toCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function mapUnreadCounts(response: NotificationsResponse): NotificationsUnreadCounts {
  const rawItems = response.notifications ?? response.data ?? [];
  const visibleUnreadCount = Array.isArray(rawItems)
    ? rawItems
        .map(item => mapNotification(item as NotificationRecord))
        .filter(item => !isMessageRelatedNotification(item.type) && !item.seen)
        .length
    : toCount(response.new_notifications_count ?? response.count_notifications);

  return {
    notificationCount: visibleUnreadCount,
    messageCount: 0,
  };
}

function fetchNotificationsResponse(offset?: string | number | null) {
  const payload: Record<string, string> = {
    fetch: 'notifications',
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
        const mappedNotifications: NotificationsItem[] = items
          .map(item => mapNotification(item as NotificationRecord))
          .filter(item => !isMessageRelatedNotification(item.type));
        const mapped = mappedNotifications.sort(
          (left, right) => right.createdAt - left.createdAt,
        );

        const lastItem = items[items.length - 1] as NotificationRecord | undefined;
        const nextOffset = readString(lastItem, 'id', 'notification_id') || null;

        return {
          items: mapped,
          nextOffset,
          hasMore: items.length >= NOTIFICATIONS_PAGE_SIZE,
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
