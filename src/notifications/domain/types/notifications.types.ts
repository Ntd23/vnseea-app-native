// Description: Defines notification domain models and target identifiers for in-app navigation.
// Notifications domain types
// Port từ: client/src/notifications/domain/types/

import type { UserSummary } from '../../../foundation';
import type { EventsItem } from '../../../events/domain/types/events.types';

export const GROUP_CHAT_INVITE_NOTIFICATION = 'group_chat_invite' as const;

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
  | 'accept_group_chat_request' // Người khác chấp nhận lời mời nhóm chat
  | 'declined_group_chat_request' // Người khác từ chối lời mời nhóm chat
  | typeof GROUP_CHAT_INVITE_NOTIFICATION
  | 'poked' // Người khác chọc bạn
  | string;

export interface NotificationsItem {
  id: string;
  notification_id: string;
  recipientId: string;
  notifierId: string;
  type: NotificationType;
  type2?: string;
  text: string;
  url: string;
  postId?: string;
  pageId?: string;
  pageName?: string;
  groupId?: string;
  groupName?: string;
  eventId?: string;
  event?: EventsItem;
  storyId?: string;
  productId?: string;
  fundingId?: string;
  blogId?: string;
  jobId?: string;
  orderId?: string;
  orderMode?: 'purchased' | 'seller';
  groupChatId?: string; // ID của nhóm chat khi có lời mời tham gia
  messageConversationType?: 'user' | 'page' | 'group';
  messageConversationId?: string;
  focusComments?: boolean;
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
  unreadMessageCount: number;
}

export interface NotificationsUnreadCounts {
  notificationCount: number;
  messageCount: number;
}
