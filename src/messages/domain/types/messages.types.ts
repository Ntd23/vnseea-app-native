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
  lastMessageTime: number;
  unreadCount: number;
  isOnline: boolean;
  isVerified: boolean;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  fromId: string;
  toId: string;
  message: string;
  media?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  time: number;
  isSentByMe: boolean;
  seen: number;
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
}

export interface SendMessageResponse {
  api_status: number;
  message_id?: string;
  message?: string;
}
