// Messages Repository Interface
// Based on WoWonder API - get_chats, get_user_messages, send-message

import type {
  ChatItem,
  GetMessagesOptions,
  GroupAddableUser,
  GroupChatInfo,
  GroupSharedAssets,
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
   * Get only unread one-to-one chats for lightweight notification previews.
   * API: POST /api/get_chats
   */
  getUnreadChats(): Promise<ChatItem[]>;

  /**
   * Get messages from a specific conversation
   * API: POST /api/get_user_messages
   */
  getMessages(
    chat: ChatItem | string,
    options?: GetMessagesOptions,
  ): Promise<MessageItem[]>;

  /**
   * Send a message to a user
   * API: POST /api/send-message
   */
  sendMessage(
    chat: ChatItem | string,
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

  getGroupInfo(groupId: string): Promise<GroupChatInfo>;

  searchAddableUsers(
    groupId: string,
    keyword?: string,
  ): Promise<GroupAddableUser[]>;

  addGroupUsers(groupId: string, userIds: string[]): Promise<void>;

  removeGroupUser(groupId: string, userId: string): Promise<void>;

  clearGroupHistory(groupId: string): Promise<void>;

  leaveGroup(groupId: string): Promise<void>;

  editGroup(
    groupId: string,
    input: { name?: string; avatar?: MessageAttachment },
  ): Promise<GroupChatInfo>;

  getGroupSharedAssets(groupId: string): Promise<GroupSharedAssets>;
}
