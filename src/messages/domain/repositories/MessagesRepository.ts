// Messages Repository Interface
// Based on WoWonder API - get_chats, get_user_messages, send-message

import type {
  ChatItem,
  CreateGroupChatInput,
  GetChatsOptions,
  GetMessagesOptions,
  MessageAttachment,
  MessageItem,
  SendMessageResponse,
} from '../types/messages.types';

// Extended response that includes typing/recording status
export interface GetMessagesResult {
  messages: MessageItem[];
  typing: number;
  is_recording: number;
}

export interface MessagesRepository {
  /**
   * Get list of all conversations/chats
   * API: POST /api/get_chats
   */
  getChats(options?: GetChatsOptions): Promise<ChatItem[]>;

  /**
   * Get only group conversations.
   * API: POST /api/group_chat with type=get_list
   */
  getGroupChats(): Promise<ChatItem[]>;

  /**
   * Create a group chat.
   * API: POST /api/group_chat with type=create
   */
  createGroupChat(input: CreateGroupChatInput): Promise<ChatItem>;

  /**
   * Get only unread one-to-one chats for lightweight notification previews.
   * API: POST /api/get_chats
   */
  getUnreadChats(): Promise<ChatItem[]>;

  /**
   * Get messages from a specific conversation
   * API: POST /api/get_user_messages
   * Returns: messages array + typing/recording status from API
   */
  getMessages(userId: string, options?: GetMessagesOptions): Promise<GetMessagesResult>;

  /**
   * Get messages from a group conversation.
   * API: POST /api/group_chat with type=fetch_messages
   */
  getGroupMessages(groupId: string, options?: GetMessagesOptions): Promise<GetMessagesResult>;

  /**
   * Send a message to a user
   * API: POST /api/send-message
   */
  sendMessage(
    toUserId: string,
    message: string,
    attachment?: MessageAttachment,
  ): Promise<SendMessageResponse>;

  /**
   * Send a message to a group chat.
   * API: POST /api/group_chat with type=send
   */
  sendGroupMessage(
    groupId: string,
    message: string,
    attachment?: MessageAttachment,
  ): Promise<SendMessageResponse>;

  /**
   * Delete a conversation
   * API: POST /api/delete-conversation
   */
  deleteConversation(userId: string): Promise<void>;

  /**
   * Mark messages as seen
   * API: POST /api/delete-conversation (with action=seen)
   */
  markAsSeen(userId: string): Promise<void>;
}
