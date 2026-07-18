// Description: Resolves backend notification types into app navigation targets.

import type { EventsItem } from '../../../events/domain/types/events.types';
import {
  GROUP_CHAT_INVITE_NOTIFICATION,
  type NotificationsItem,
} from '../../domain/types/notifications.types';

export { GROUP_CHAT_INVITE_NOTIFICATION } from '../../domain/types/notifications.types';

export type NotificationDestination =
  | { kind: 'profile'; userId: string }
  | { kind: 'groupChat'; groupChatId: string }
  | { kind: 'funding'; fundId: string }
  | { kind: 'product'; productId: string; fallbackUrl?: string }
  | { kind: 'job'; jobId: string }
  | { kind: 'blog'; blogId: string }
  | { kind: 'live'; postId: string }
  | { kind: 'post'; postId: string }
  | { kind: 'page' }
  | { kind: 'pages' }
  | { kind: 'group' }
  | { kind: 'groups' }
  | { kind: 'event'; event?: EventsItem; eventId?: string }
  | { kind: 'events' }
  | { kind: 'messages' }
  | { kind: 'memories' }
  | { kind: 'forum' }
  | { kind: 'stories' }
  | { kind: 'points' }
  | { kind: 'balance' }
  | { kind: 'withdrawal' }
  | {
      kind: 'orders';
      orderId?: string;
      mode: 'purchased' | 'seller';
    }
  | { kind: 'external'; url: string }
  | { kind: 'feed' };

const PROFILE_NOTIFICATION_TYPES = new Set([
  'following',
  'visited_profile',
  'accepted_request',
  'friends_request',
  'added_u_as',
  'accept_u_as',
  'rejected_u_as',
  'gift',
  'poke',
  'poked',
]);

const PAGE_NOTIFICATION_TYPES = new Set([
  'liked_page',
  'invited_page',
  'accepted_invite',
  'page_admin',
]);

const GROUP_NOTIFICATION_TYPES = new Set([
  'joined_group',
  'requested_to_join_group',
  'accepted_join_request',
  'added_you_to_group',
  'group_admin',
]);

const EVENT_NOTIFICATION_TYPES = new Set([
  'interested_event',
  'going_event',
  'invited_event',
]);

const FORUM_NOTIFICATION_TYPES = new Set(['forum_reply', 'thread_reply']);
const TRACKING_NOTIFICATION_TYPES = new Set([
  'added_tracking',
  'added_tracking_info',
]);

function normalized(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function resolveNotificationDestination(
  item: NotificationsItem,
): NotificationDestination {
  const type = normalized(item.type);
  const type2 = normalized(item.type2);

  if (type === GROUP_CHAT_INVITE_NOTIFICATION) {
    return { kind: 'messages' };
  }

  if (type === 'accept_group_chat_request' && item.groupChatId) {
    return { kind: 'groupChat', groupChatId: item.groupChatId };
  }

  if (
    type === 'accept_group_chat_request' ||
    type === 'declined_group_chat_request'
  ) {
    return { kind: 'messages' };
  }

  if (PROFILE_NOTIFICATION_TYPES.has(type) && item.notifierId) {
    return { kind: 'profile', userId: item.notifierId };
  }

  if (type === 'sent_u_money') {
    return { kind: 'points' };
  }

  if (
    type === 'subscribed_to_you' ||
    type === 'bank_pro' ||
    type === 'bank_wallet' ||
    type === 'bank_decline' ||
    type2 === 'coinpayments_canceled' ||
    type2 === 'coinpayments_approved'
  ) {
    return { kind: 'balance' };
  }

  if (type2 === 'withdraw_approve' || type2 === 'withdraw_declined') {
    return { kind: 'withdrawal' };
  }

  if (type === 'memory') {
    return { kind: 'memories' };
  }

  if (FORUM_NOTIFICATION_TYPES.has(type)) {
    return item.url ? { kind: 'external', url: item.url } : { kind: 'forum' };
  }

  if (type === 'viewed_story') {
    return { kind: 'stories' };
  }

  if (PAGE_NOTIFICATION_TYPES.has(type)) {
    return item.pageId || item.pageName ? { kind: 'page' } : { kind: 'pages' };
  }

  if (GROUP_NOTIFICATION_TYPES.has(type)) {
    if (item.groupId) {
      return { kind: 'group' };
    }
    if (item.url) {
      return { kind: 'external', url: item.url };
    }
    return item.groupName ? { kind: 'group' } : { kind: 'groups' };
  }

  if (EVENT_NOTIFICATION_TYPES.has(type)) {
    return item.event || item.eventId
      ? { kind: 'event', event: item.event, eventId: item.eventId }
      : { kind: 'events' };
  }

  if (type === 'new_orders') {
    return { kind: 'orders', mode: 'seller' };
  }

  if (TRACKING_NOTIFICATION_TYPES.has(type)) {
    return {
      kind: 'orders',
      orderId: item.orderId,
      mode: item.orderMode ?? 'purchased',
    };
  }

  if (
    type === 'status_changed' ||
    type2 === 'admin_status_changed' ||
    type2 === 'refund_decline'
  ) {
    return {
      kind: 'orders',
      orderId: item.orderId,
      mode: item.orderMode ?? 'purchased',
    };
  }

  if (item.fundingId) {
    return { kind: 'funding', fundId: item.fundingId };
  }

  if (type === 'new_review') {
    if (item.productId) {
      return {
        kind: 'product',
        productId: item.productId,
        fallbackUrl: item.url || undefined,
      };
    }
    return item.url ? { kind: 'external', url: item.url } : { kind: 'feed' };
  }

  if (item.productId) {
    return {
      kind: 'product',
      productId: item.productId,
      fallbackUrl: item.url || undefined,
    };
  }

  if (item.jobId) {
    return { kind: 'job', jobId: item.jobId };
  }

  if (item.blogId) {
    return { kind: 'blog', blogId: item.blogId };
  }

  if (item.postId && type === 'live_video') {
    return { kind: 'live', postId: item.postId };
  }

  if (item.postId) {
    return { kind: 'post', postId: item.postId };
  }

  if (item.url) {
    return { kind: 'external', url: item.url };
  }

  return { kind: 'feed' };
}
