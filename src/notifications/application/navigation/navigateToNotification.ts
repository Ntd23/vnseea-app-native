// Description: Navigates notification targets from both the in-app list and push clicks.

import { Linking } from 'react-native';

import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import type { OrdersItem } from '../../../orders/domain/types/orders.types';
import { createOrdersRepository } from '../../../orders/infrastructure/repositories/ApiOrdersRepository';
import { createEventsRepository } from '../../../events/infrastructure/repositories/ApiEventsRepository';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import { resolveNotificationDestination } from './resolveNotificationDestination';

export type NotificationNavigator = {
  navigate: (...args: any[]) => void;
  push?: (...args: any[]) => void;
  getParent?: () => NotificationNavigator | undefined;
};

const ordersRepository = createOrdersRepository();
const eventsRepository = createEventsRepository();

function toPositiveNumberId(value: string | undefined) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function toPageRouteItem(item: NotificationsItem): PagesItem {
  const pageId = item.pageId ?? '';
  const pageName = item.pageName ?? '';
  return {
    id: pageId || pageName,
    pageId,
    pageName,
    pageTitle: item.text || 'Trang',
    likes: 0,
  };
}

function toGroupRouteItem(item: NotificationsItem): GroupItem {
  const groupId = item.groupId || item.groupName || '';
  return {
    id: groupId,
    groupId,
    groupName: item.groupName ?? '',
    groupTitle: item.text || 'Nhóm',
    privacy: 'public',
    url: item.url || undefined,
  };
}

function normalizeOrderIdentifier(value: string | undefined) {
  return (value ?? '').trim().replace(/^#/, '').toLowerCase();
}

function findOrderByIdentifier(items: OrdersItem[], orderId: string) {
  const target = normalizeOrderIdentifier(orderId);
  if (!target) return undefined;
  return items.find(order => {
    if (normalizeOrderIdentifier(order.id) === target) return true;
    if (normalizeOrderIdentifier(order.code) === target) return true;
    return order.lines.some(
      line => normalizeOrderIdentifier(line.id) === target,
    );
  });
}

function toGroupChatRouteItem(
  item: NotificationsItem,
  groupChatId: string,
): ChatItem {
  return {
    id: `group:${groupChatId}`,
    chatType: 'group',
    userId: groupChatId,
    username: '',
    name: item.notifier?.name || item.text || 'Nhóm chat',
    avatar: item.notifier?.avatarUrl || '',
    lastMessage: '',
    lastMessageTime: Date.now() / 1000,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

function toMessageThreadRouteItem(
  item: NotificationsItem,
  conversationType: 'user' | 'page' | 'group',
  conversationId: string,
): ChatItem {
  const isGroup = conversationType === 'group';
  const isPage = conversationType === 'page';
  const name = isGroup
    ? item.groupName || 'Nhóm chat'
    : isPage
    ? item.pageName || 'Trang'
    : item.notifier?.name || item.text || 'Người dùng';

  return {
    id: `${conversationType}:${conversationId}`,
    chatId: isGroup || isPage ? conversationId : undefined,
    hasConversationRecord: false,
    chatType: conversationType,
    participantId: isGroup ? undefined : conversationId,
    groupId: isGroup ? conversationId : undefined,
    userId: conversationId,
    username: item.notifier?.username || '',
    name,
    avatar: isGroup || isPage ? '' : item.notifier?.avatarUrl || '',
    lastMessage: item.text || '',
    lastMessageTime: item.createdAt || Date.now() / 1_000,
    unreadCount: 1,
    isOnline: false,
    isVerified: Boolean(item.notifier?.verified),
  };
}

async function openExternalNotificationUrl(
  url: string,
  navigation: NotificationNavigator,
) {
  try {
    await Linking.openURL(url);
  } catch {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.FEED,
    });
  }
}

export async function navigateToNotification(
  item: NotificationsItem,
  navigation: NotificationNavigator,
) {
  const destination = resolveNotificationDestination(item);

  switch (destination.kind) {
    case 'profile':
      navigateToUserProfile(navigation, destination.userId);
      return;
    case 'groupChat':
      navigation.navigate(ROUTES.CHAT, {
        chat: toGroupChatRouteItem(item, destination.groupChatId),
      });
      return;
    case 'messageThread':
      navigation.navigate(ROUTES.CHAT, {
        chat: toMessageThreadRouteItem(
          item,
          destination.conversationType,
          destination.conversationId,
        ),
      });
      return;
    case 'funding':
      navigation.navigate(ROUTES.FUNDING_DETAIL, {
        fundId: destination.fundId,
      });
      return;
    case 'product': {
      const productId = toPositiveNumberId(destination.productId);
      if (productId) {
        navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId });
      } else if (destination.fallbackUrl) {
        await openExternalNotificationUrl(destination.fallbackUrl, navigation);
      } else {
        navigation.navigate(ROUTES.MARKETPLACE);
      }
      return;
    }
    case 'job':
      navigation.navigate(ROUTES.JOB_DETAIL, { jobId: destination.jobId });
      return;
    case 'blog':
      navigation.navigate(ROUTES.BLOG_DETAIL, { blogId: destination.blogId });
      return;
    case 'live': {
      const postId = toPositiveNumberId(destination.postId);
      if (postId) navigation.navigate(ROUTES.LIVE_ROOM, { postId });
      else navigation.navigate(ROUTES.LIVE);
      return;
    }
    case 'post':
      navigation.navigate(ROUTES.POST_DETAIL, { postId: destination.postId });
      return;
    case 'page':
      navigation.navigate(ROUTES.PAGE_DETAIL, { page: toPageRouteItem(item) });
      return;
    case 'pages':
      navigation.navigate(ROUTES.PAGES);
      return;
    case 'group':
      navigation.navigate(ROUTES.GROUP_DETAIL, {
        group: toGroupRouteItem(item),
      });
      return;
    case 'groups':
      navigation.navigate(ROUTES.EXPLORE_GROUPS);
      return;
    case 'event': {
      try {
        const event =
          destination.event ??
          (destination.eventId
            ? await eventsRepository.getById(destination.eventId)
            : null);
        if (event) {
          navigation.navigate(ROUTES.EVENT_DETAIL, { event });
          return;
        }
      } catch (error) {
        console.warn('[NotificationNavigation] load event target failed', error);
      }
      navigation.navigate(ROUTES.EVENTS);
      return;
    }
    case 'events':
      navigation.navigate(ROUTES.EVENTS);
      return;
    case 'messages':
      navigation.navigate(ROUTES.MESSAGES);
      return;
    case 'memories':
      navigation.navigate(ROUTES.MEMORIES);
      return;
    case 'forum':
      navigation.navigate(ROUTES.FORUM);
      return;
    case 'stories':
      navigation.navigate(ROUTES.STORIES_LIST);
      return;
    case 'points':
      navigation.navigate(ROUTES.MY_POINTS);
      return;
    case 'balance':
      navigation.navigate(ROUTES.MY_BALANCE);
      return;
    case 'withdrawal':
      navigation.navigate(ROUTES.WITHDRAWAL);
      return;
    case 'orders': {
      if (destination.orderId) {
        try {
          const page =
            destination.mode === 'seller'
              ? await ordersRepository.getSellerOrders({ limit: 100 })
              : await ordersRepository.getPurchasedOrders({ limit: 100 });
          const order = findOrderByIdentifier(page.items, destination.orderId);
          if (order) {
            navigation.navigate(ROUTES.ORDER_DETAIL, { order });
            return;
          }
        } catch (error) {
          console.warn('[NotificationNavigation] load order target failed', error);
        }
      }
      navigation.navigate(ROUTES.MY_PRODUCTS, {
        initialTab: destination.mode === 'seller' ? 'orders' : 'purchased',
      });
      return;
    }
    case 'external':
      await openExternalNotificationUrl(destination.url, navigation);
      return;
    case 'feed':
    default:
      navigation.navigate(ROUTES.MAIN_TABS, {
        screen: ROUTES.FEED,
      });
  }
}
