// Messages Repository Interface
// Based on WoWonder API - get_chats, get_user_messages, send-message

import type {
  ChatItem,
  GetMessagesOptions,
  MessageAttachment,
  MessageItem,
  SendMessageResponse,
} from '../types/messages.types';

export interface MessagesRepository {
  /**
   * Get list of all conversations/chats
   * API: POST /api/get_chats
   */
  getChats(): Promise<ChatItem[]>;

  /**
   * Get messages from a specific conversation
   * API: POST /api/get_user_messages
   */
  getMessages(userId: string, options?: GetMessagesOptions): Promise<MessageItem[]>;

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
