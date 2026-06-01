// Messages domain types
// Based on WoWonder API responses for get_chats and get_user_messages

export interface ChatItem {
  id: string;
  chatType: 'user' | 'group' | 'page';
  userId: string;
  username: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageKind?: ChatPreviewKind;
  lastMessageTime: number;
  unreadCount: number;
  isOnline: boolean;
  isVerified: boolean;
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
  message_data?: unknown[];
  sentMessages?: MessageItem[];
}
