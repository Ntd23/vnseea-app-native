// Notifications domain types
// Port từ: client/src/notifications/domain/types/

import type { UserSummary } from '../../../foundation';

export type NotificationType =
  | 'following'
  | 'comment'
  | 'comment_mention'
  | 'post_mention'
  | 'liked_post'
  | 'wondered_post'
  | 'shared_post'
  | 'liked_comment'
  | 'wondered_comment'
  | 'comment_reply'
  | 'comment_reply_mention'
  | 'profile_wall_post'
  | 'visited_profile'
  | 'liked_page'
  | 'joined_group'
  | 'accepted_invite'
  | 'added_you_to_group'
  | 'requested_to_join_group'
  | 'accepted_join_request'
  | 'interested_event'
  | 'going_event'
  | 'invited_event'
  | 'accepted_request'
  | string;

export interface NotificationsItem {
  id: string;
  notification_id: string;
  recipientId: string;
  notifierId: string;
  type: NotificationType;
  text: string;
  url: string;
  postId?: string;
  pageId?: string;
  groupId?: string;
  eventId?: string;
  seen: boolean;
  seenAt?: number;
  createdAt: number;
  timeText: string;
  notifier: UserSummary & {
    isFollowing?: boolean;
    isFollowed?: boolean;
  };
}

export interface NotificationsListOptions {
  limit?: number;
  offset?: string | number | null;
}

export interface NotificationsListPage {
  items: NotificationsItem[];
  nextOffset: string | null;
  hasMore: boolean;
  unreadCount: number;
}
