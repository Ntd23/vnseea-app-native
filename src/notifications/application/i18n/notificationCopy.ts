// Description: Centralized i18n copy + helpers for the notifications bounded context.
// Mirrors the AppLanguage + Record<AppLanguage, Record<key, string>> pattern
// used by useSettingsViewModel.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type { NotificationsItem } from '../../domain/types/notifications.types';

export const NOTIFICATION_COPY: Record<AppLanguage, Record<string, string>> = {
  vi: {
    headerTitle: 'Thông báo',
    tabAll: 'Tất cả',
    tabUnread: 'Chưa đọc',
    markAllRead: 'Đánh dấu tất cả đã đọc',
    filter: 'Lọc',
    emptyTitle: 'Chưa có thông báo nào',
    emptyDescription: 'Khi có thông báo mới, chúng sẽ xuất hiện ở đây.',
    loading: 'Đang tải thông báo...',
    retry: 'Thử lại',
    allLoaded: 'Đã hiển thị tất cả thông báo',
    deleteTitle: 'Xóa thông báo',
    deleteMessage: 'Bạn có muốn xóa thông báo này?',
    deleteConfirm: 'Xóa',
    deleteCancel: 'Hủy',
    acceptInvite: 'Đồng ý',
    rejectInvite: 'Từ chối',
    groupJoined: 'Bạn đã tham gia nhóm chat!',
    acceptFailed: 'Không thể chấp nhận lời mời. Vui lòng thử lại.',
    rejectFailed: 'Không thể từ chối lời mời. Vui lòng thử lại.',
    markAllSeenToast: 'Đã đánh dấu tất cả là đã đọc',
    sectionToday: 'Hôm nay',
    sectionThisWeek: 'Tuần này',
    sectionThisMonth: 'Tháng này',
    sectionEarlier: 'Trước đó',
    filterAll: 'Tất cả',
    filterLikes: 'Lượt thích',
    filterComments: 'Bình luận',
    filterFollows: 'Lượt theo dõi',
    filterGroups: 'Nhóm',
    filterEvents: 'Sự kiện',
    noUnread: 'Bạn đã đọc hết thông báo',
    noUnreadDescription: 'Quay lại sau nhé, chúng tôi sẽ thông báo khi có gì mới.',
  },
  en: {
    headerTitle: 'Notifications',
    tabAll: 'All',
    tabUnread: 'Unread',
    markAllRead: 'Mark all as read',
    filter: 'Filter',
    emptyTitle: 'No notifications yet',
    emptyDescription: 'When you have new notifications, they will show up here.',
    loading: 'Loading notifications...',
    retry: 'Retry',
    allLoaded: 'All notifications loaded',
    deleteTitle: 'Delete notification',
    deleteMessage: 'Do you want to delete this notification?',
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
    acceptInvite: 'Accept',
    rejectInvite: 'Reject',
    groupJoined: 'You have joined the group chat!',
    acceptFailed: 'Could not accept invitation. Please try again.',
    rejectFailed: 'Could not reject invitation. Please try again.',
    markAllSeenToast: 'All notifications marked as read',
    sectionToday: 'Today',
    sectionThisWeek: 'This week',
    sectionThisMonth: 'This month',
    sectionEarlier: 'Earlier',
    filterAll: 'All',
    filterLikes: 'Likes',
    filterComments: 'Comments',
    filterFollows: 'Follows',
    filterGroups: 'Groups',
    filterEvents: 'Events',
    noUnread: 'You are all caught up',
    noUnreadDescription: 'Come back later, we will let you know when something is new.',
  },
};

export type NotificationCopyKey = keyof typeof NOTIFICATION_COPY.vi;

export function getCopy(language: AppLanguage): Record<NotificationCopyKey, string> {
  return NOTIFICATION_COPY[language] as Record<NotificationCopyKey, string>;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;

export type NotificationBucketKey = 'today' | 'thisWeek' | 'thisMonth' | 'earlier';

export interface NotificationBucket {
  key: NotificationBucketKey;
  title: string;
  items: NotificationsItem[];
}

export function groupNotificationsByTime(
  items: NotificationsItem[],
  language: AppLanguage,
): NotificationBucket[] {
  const copy = getCopy(language);
  const now = Date.now();

  const today: NotificationsItem[] = [];
  const thisWeek: NotificationsItem[] = [];
  const thisMonth: NotificationsItem[] = [];
  const earlier: NotificationsItem[] = [];

  for (const item of items) {
    const ts = item.createdAt;
    if (!ts) {
      today.push(item);
      continue;
    }
    const delta = now - ts;
    if (delta <= ONE_DAY_MS) {
      today.push(item);
    } else if (delta <= ONE_WEEK_MS) {
      thisWeek.push(item);
    } else if (delta <= ONE_MONTH_MS) {
      thisMonth.push(item);
    } else {
      earlier.push(item);
    }
  }

  const buckets: NotificationBucket[] = [];
  if (today.length > 0) buckets.push({ key: 'today', title: copy.sectionToday, items: today });
  if (thisWeek.length > 0)
    buckets.push({ key: 'thisWeek', title: copy.sectionThisWeek, items: thisWeek });
  if (thisMonth.length > 0)
    buckets.push({ key: 'thisMonth', title: copy.sectionThisMonth, items: thisMonth });
  if (earlier.length > 0)
    buckets.push({ key: 'earlier', title: copy.sectionEarlier, items: earlier });

  return buckets;
}

export type NotificationFilterType =
  | 'all'
  | 'likes'
  | 'comments'
  | 'follows'
  | 'groups'
  | 'events';

export const NOTIFICATION_FILTERS: ReadonlyArray<{
  id: NotificationFilterType;
  iconKey: string;
}> = [
  { id: 'all', iconKey: 'Inbox' },
  { id: 'likes', iconKey: 'Heart' },
  { id: 'comments', iconKey: 'MessageCircle' },
  { id: 'follows', iconKey: 'UserPlus' },
  { id: 'groups', iconKey: 'Users' },
  { id: 'events', iconKey: 'CalendarDays' },
];

export function filterLabelFor(
  filter: NotificationFilterType,
  language: AppLanguage,
): string {
  const copy = getCopy(language);
  switch (filter) {
    case 'all':
      return copy.filterAll;
    case 'likes':
      return copy.filterLikes;
    case 'comments':
      return copy.filterComments;
    case 'follows':
      return copy.filterFollows;
    case 'groups':
      return copy.filterGroups;
    case 'events':
      return copy.filterEvents;
    default:
      return copy.filterAll;
  }
}

export function filterNotificationsByType(
  items: NotificationsItem[],
  filter: NotificationFilterType,
): NotificationsItem[] {
  if (filter === 'all') return items;

  return items.filter(item => {
    switch (filter) {
      case 'likes':
        return (
          item.type === 'liked_post' ||
          item.type === 'wondered_post' ||
          item.type === 'liked_page'
        );
      case 'comments':
        return (
          item.type === 'comment' ||
          item.type === 'comment_reply' ||
          item.type === 'comment_mention' ||
          item.type === 'post_mention'
        );
      case 'follows':
        return item.type === 'following' || item.type === 'accepted_request';
      case 'groups':
        return (
          item.type === 'joined_group' ||
          item.type === 'requested_to_join_group' ||
          item.type === 'accepted_join_request'
        );
      case 'events':
        return (
          item.type === 'interested_event' ||
          item.type === 'going_event' ||
          item.type === 'invited_event'
        );
      default:
        return true;
    }
  });
}

const TEXT_TEMPLATES: Record<AppLanguage, Record<string, string>> = {
  vi: {
    following: '{name} đã theo dõi bạn',
    liked_post: '{name} đã thích bài viết của bạn',
    wondered_post: '{name} đã bày tỏ cảm xúc với bài viết của bạn',
    shared_post: '{name} đã chia sẻ bài viết của bạn',
    comment: '{name} đã bình luận về bài viết của bạn',
    comment_reply: '{name} đã trả lời bình luận của bạn',
    comment_mention: '{name} đã nhắc đến bạn trong bình luận',
    post_mention: '{name} đã nhắc đến bạn trong bài viết',
    profile_wall_post: '{name} đã đăng lên trang cá nhân của bạn',
    visited_profile: '{name} đã xem trang cá nhân của bạn',
    liked_page: '{name} đã thích trang của bạn',
    joined_group: '{name} đã tham gia nhóm của bạn',
    added_you_to_group: '{name} đã mời bạn vào nhóm chat',
    accept_group_chat_request: '{name} đã chấp nhận lời mời tham gia nhóm chat',
    declined_group_chat_request: '{name} đã từ chối lời mời tham gia nhóm chat',
    accepted_request: '{name} đã chấp nhận lời mời kết bạn',
    interested_event: '{name} quan tâm đến sự kiện của bạn',
    going_event: '{name} sẽ tham dự sự kiện của bạn',
    default: '{name} có thông báo mới',
  },
  en: {
    following: '{name} started following you',
    liked_post: '{name} liked your post',
    wondered_post: '{name} reacted to your post',
    shared_post: '{name} shared your post',
    comment: '{name} commented on your post',
    comment_reply: '{name} replied to your comment',
    comment_mention: '{name} mentioned you in a comment',
    post_mention: '{name} mentioned you in a post',
    profile_wall_post: '{name} posted on your timeline',
    visited_profile: '{name} visited your profile',
    liked_page: '{name} liked your page',
    joined_group: '{name} joined your group',
    added_you_to_group: '{name} invited you to a group chat',
    accept_group_chat_request: '{name} accepted your group chat invite',
    declined_group_chat_request: '{name} declined your group chat invite',
    accepted_request: '{name} accepted your friend request',
    interested_event: '{name} is interested in your event',
    going_event: '{name} is going to your event',
    default: '{name} has a new notification',
  },
};

function normalizeBackendNotificationText(text: string) {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatNotificationText(
  item: NotificationsItem,
  language: AppLanguage,
): string {
  const templates = TEXT_TEMPLATES[language];
  const template = templates[item.type] ?? templates.default;
  const name = item.notifier?.name || item.notifier?.username;
  const backendText = normalizeBackendNotificationText(item.text || '');

  if (backendText) {
    if (!name || backendText.toLowerCase().includes(name.toLowerCase())) {
      return backendText;
    }
    return `${name} ${backendText}`;
  }

  const fallbackName = language === 'vi' ? 'Người dùng' : 'Someone';
  return template.replace('{name}', name || fallbackName);
}
