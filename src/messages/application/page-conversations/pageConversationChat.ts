// Description: Builds Page conversation chats for customers messaging a Page and for Page members answering in the Page Inbox.
import type {
  ChatItem,
  ConversationGroupMember,
  PageConversationRef,
} from '../../domain/types/messages.types';

const EMPTY_CHAT_FIELDS = {
  lastMessage: '',
  lastMessageTime: 0,
  unreadCount: 0,
  isOnline: false,
  isVerified: false,
} as const;

/** One key per Page thread (Page + customer), shared by every Page member. */
export function getPageConversationKey(page: PageConversationRef) {
  return `page:${page.pageId}:${page.customerId}`;
}

/** The customer's side: the chat shows the Page and replies come from it. */
export function createCustomerPageChat(input: {
  pageId: string;
  ownerId: string;
  viewerId: string;
  pageTitle: string;
  pageName?: string;
  avatar?: string;
}): ChatItem {
  const page: PageConversationRef = {
    pageId: input.pageId,
    ownerId: input.ownerId,
    customerId: input.viewerId,
    actsAsPage: false,
    pageTitle: input.pageTitle,
    pageAvatar: input.avatar || undefined,
  };
  return {
    ...EMPTY_CHAT_FIELDS,
    id: getPageConversationKey(page),
    chatType: 'page',
    participantId: input.ownerId,
    userId: input.pageId,
    username: input.pageName || '',
    name: input.pageTitle,
    avatar: input.avatar || '',
    page,
  };
}

/** A Page member's side: the chat shows the customer they answer as the Page. */
export function createPageInboxChat(input: {
  pageId: string;
  pageTitle: string;
  pageAvatar?: string;
  ownerId?: string;
  customer: ConversationGroupMember;
  unreadCount?: number;
}): ChatItem {
  const page: PageConversationRef = {
    pageId: input.pageId,
    ownerId: input.ownerId || '',
    customerId: input.customer.id,
    actsAsPage: true,
    pageTitle: input.pageTitle,
    pageAvatar: input.pageAvatar || undefined,
  };
  return {
    ...EMPTY_CHAT_FIELDS,
    id: getPageConversationKey(page),
    chatType: 'page',
    participantId: input.customer.id,
    userId: input.pageId,
    username: input.customer.username,
    name: input.customer.name || input.customer.username,
    avatar: input.customer.avatar,
    unreadCount: input.unreadCount ?? 0,
    page,
  };
}

/**
 * Whether a raw message was sent from the Page side. The Page Inbox marks it
 * explicitly; elsewhere the Page side is the owner's user id.
 */
export function isPageSideMessage(
  page: PageConversationRef,
  raw: { is_page_side?: unknown; from_id?: unknown },
  fromId: string,
) {
  if (raw.is_page_side !== undefined && raw.is_page_side !== null) {
    return String(raw.is_page_side) === '1' || raw.is_page_side === true;
  }
  return Boolean(page.ownerId) && fromId === page.ownerId;
}
