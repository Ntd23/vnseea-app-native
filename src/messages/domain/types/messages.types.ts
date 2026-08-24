// Description: Defines domain types for messages, chats, labels, and media.
// Based on WoWonder API responses for get_chats and get_user_messages

import type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';

export interface ChatItem {
  id: string;
  chatId?: string;
  hasConversationRecord?: boolean;
  chatType: 'user' | 'group' | 'page';
  participantId?: string;
  groupId?: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageId?: string;
  lastMessageKind?: ChatPreviewKind;
  lastMessageIsMine?: boolean;
  lastMessageIsReply?: boolean;
  lastMessageTime: number;
  relationshipActivityTime?: number;
  relationshipStateRevision?: number;
  relationshipEventOccurredAt?: number;
  paginationCursorTime?: number;
  unreadCount: number;
  isOnline: boolean;
  isVerified: boolean;
  isFollowing?: boolean;
  isFollower?: boolean;
  labels?: MessageLabel[];
  notificationsMuted?: boolean;
}

export interface ConversationGroupMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface MessageLabel {
  id: string;
  name: string;
  color: string;
}

export interface MessageLabelAssignment extends MessageLabel {
  targetUserId: string;
}

export interface LabelRecipient {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  labels: MessageLabel[];
}

export type ChatPreviewKind =
  | 'text'
  | 'link'
  | 'shared_post'
  | 'location'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'audio_call'
  | 'video_call'
  | 'product'
  | 'order'
  | 'story'
  | 'sticker';

export interface SharedPostMessageReference {
  postId: string;
  url: string;
  note: string;
  isLive?: boolean;
}

export interface StoryReplyMessageReference {
  storyId: string;
  publisherId: string;
  publisherName: string;
  publisherAvatar?: string;
  mediaType: 'image' | 'video' | 'shared_post';
  thumbnailUrl?: string;
  caption?: string;
  available: boolean;
}

export interface MessageLinkReference {
  url: string;
  host: string;
  page?: {
    pageName: string;
    pageTitle?: string;
    note?: string;
    publicUrl: string;
    explicit: boolean;
  };
}

export interface MessageLocationReference {
  title: string;
  latitude: number;
  longitude: number;
  pageId?: string;
  imageUrl?: string;
  subtitle?: string;
  address?: string;
}

export type MarketplaceMessageContext =
  | {
      type: 'product_inquiry';
      productId: string;
      name: string;
      price?: string;
      image?: string;
      location?: string;
      note?: string;
    }
  | {
      type: 'order_request';
      orderHash: string;
      buyerName: string;
      buyerPhone: string;
      buyerAddress: string;
      items: Array<{
        productId: string;
        name: string;
        image?: string;
        quantity: number;
        total: string;
      }>;
      total: string;
    };

export interface MessageReactionSummary {
  total: number;
  myReaction: ReactionType | null;
  topReactions: ReactionType[];
  breakdown: Partial<Record<ReactionType, number>>;
}

export type MessageMediaType = 'image' | 'video' | 'audio' | 'file';

export interface MessageReplyReference {
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
  contentKind: ChatPreviewKind;
  media?: string;
  mediaType?: MessageMediaType;
  thumbnail?: string;
  sharedPost?: SharedPostMessageReference;
  link?: MessageLinkReference;
  location?: MessageLocationReference;
  callEvent?: MessageCallEvent;
  marketplaceContext?: MarketplaceMessageContext;
  storyReply?: StoryReplyMessageReference;
}

export interface MessageMention {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface SendMessageOptions {
  replyTo?: MessageReplyReference;
  mentions?: MessageMention[];
  /** Identifier shared by media selected in one send action. */
  mediaGroupId?: string;
  productInquiry?: {
    productId: string;
    note?: string;
    name?: string;
    price?: string;
    image?: string;
    location?: string;
  };
  storyReply?: StoryReplyMessageReference;
}

export interface MessageSystemEvent {
  type: 'message_pinned' | 'user_followed';
  actorId: string;
  actorName: string;
  targetMessageId?: string;
  targetUserId?: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  fromId: string;
  toId: string;
  senderName?: string;
  senderAvatar?: string;
  mentions?: MessageMention[];
  message: string;
  callEvent?: MessageCallEvent;
  systemEvent?: MessageSystemEvent;
  media?: string;
  mediaType?: MessageMediaType;
  /** Keeps separately uploaded attachments from the same send action together. */
  mediaGroupId?: string;
  thumbnail?: string;
  sharedPost?: SharedPostMessageReference;
  contentKind?: ChatPreviewKind;
  link?: MessageLinkReference;
  location?: MessageLocationReference;
  marketplaceContext?: MarketplaceMessageContext;
  storyReply?: StoryReplyMessageReference;
  replyTo?: MessageReplyReference;
  reactions: MessageReactionSummary;
  time: number;
  isSentByMe: boolean;
  seen: number;
  deliveryState?: 'sending' | 'failed';
}

export interface PinnedMessageItem extends MessageItem {
  pinnedAt: number;
  pinnedByUserId: string;
  pinnedByName: string;
  canUnpin: boolean;
}

export interface MessageCallEvent {
  callId: string;
  callType: 'audio' | 'video';
  status: string;
  duration: number;
  initiatorId: string;
  receiverId: string;
  statusBy: string;
  isInitiator: boolean;
  isReceiver: boolean;
  isGroupCall?: boolean;
  groupId?: string;
  action?: string;
}

export interface MessageAttachment {
  uri: string;
  name: string;
  type: string;
  mediaType: 'image' | 'video' | 'audio';
  thumbnailUri?: string;
  thumbnailName?: string;
  thumbnailType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface GetMessagesOptions {
  limit?: number;
  beforeMessageId?: string;
  afterMessageId?: string;
  messageId?: string;
}

export type ConversationAssetCategory = 'media' | 'files' | 'links';

export type ConversationAssetMediaType =
  | 'images'
  | 'videos'
  | 'docs'
  | 'links';

export type ConversationAssetsCursor = Partial<
  Record<ConversationAssetMediaType, string | null>
>;

export interface ConversationAssetsPage {
  items: MessageItem[];
  nextCursor?: ConversationAssetsCursor;
}

export interface ConversationReportResult {
  reported: true;
  alreadyReported: boolean;
}

export interface GetChatsOptions {
  includeDiscovery?: boolean;
  latestOnly?: boolean;
  forceRefresh?: boolean;
}

export interface CreateGroupChatInput {
  groupName: string;
  memberUserIds: string[];
}

export interface ConversationItem {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  chatMessages: MessageItem[];
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isOnline: boolean;
  isVerified: boolean;
}

export interface GetChatsResponse {
  api_status: number;
  data: unknown[];
}

export interface GetMessagesResponse {
  api_status: number;
  messages: unknown[];
  typing?: number;
  is_recording?: number;
}

export interface SendMessageResponse {
  api_status: number;
  message_id?: string;
  message?: string;
  data?: unknown;
  message_data?: unknown[];
  sentMessages?: MessageItem[];
}

export interface GroupChatMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isOwner: boolean;
  isAdmin: boolean;
  isOnline: boolean;
}

export interface GroupAddableUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isOnline: boolean;
}

export interface GroupChatInfo {
  id: string;
  name: string;
  avatar: string;
  ownerId: string;
  type: string;
  memberCount: number;
  isOwner: boolean;
  members: GroupChatMember[];
}

export interface GroupSharedMedia {
  id: string;
  uri: string;
  mediaType: 'image' | 'video';
  time: number;
}

export interface GroupSharedFile {
  id: string;
  uri: string;
  name: string;
  time: number;
}

export interface GroupSharedLink {
  id: string;
  url: string;
  title: string;
  time: number;
}

export interface GroupSharedAssets {
  media: GroupSharedMedia[];
  files: GroupSharedFile[];
  links: GroupSharedLink[];
}
