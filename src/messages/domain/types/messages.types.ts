// Description: Defines domain types for messages, chats, labels, and media.
// Based on WoWonder API responses for get_chats and get_user_messages

export interface ChatItem {
  id: string;
  chatId?: string;
  chatType: 'user' | 'group' | 'page';
  participantId?: string;
  groupId?: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageKind?: ChatPreviewKind;
  lastMessageTime: number;
  paginationCursorTime?: number;
  unreadCount: number;
  isOnline: boolean;
  isVerified: boolean;
  isFollowing?: boolean;
  isFollower?: boolean;
  labels?: MessageLabel[];
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
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'audio_call'
  | 'video_call'
  | 'product'
  | 'sticker';

export interface MessageItem {
  id: string;
  conversationId: string;
  fromId: string;
  toId: string;
  message: string;
  callEvent?: MessageCallEvent;
  media?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  time: number;
  isSentByMe: boolean;
  seen: number;
  deliveryState?: 'sending' | 'failed';
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
}

export interface GetMessagesOptions {
  limit?: number;
  beforeMessageId?: string;
  afterMessageId?: string;
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
