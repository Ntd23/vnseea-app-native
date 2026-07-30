// Description: Defines the messages repository contract for chats, groups, and labels.
// Based on WoWonder API - get_chats, get_user_messages, send-message

import type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';

import type {
  ChatItem,
  ConversationAssetCategory,
  ConversationAssetsPage,
  ConversationAssetsCursor,
  ConversationReportResult,
  CreateGroupChatInput,
  GetChatsOptions,
  GetMessagesOptions,
  GroupAddableUser,
  GroupChatInfo,
  GroupSharedAssets,
  LabelRecipient,
  MessageAttachment,
  MessageItem,
  MessageLabel,
  MessageReactionSummary,
  SendMessageOptions,
  PinnedMessageItem,
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
  findUserConversation(userId: string): Promise<ChatItem | undefined>;

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
    options?: SendMessageOptions,
  ): Promise<SendMessageResponse>;

  /**
   * Send a message to a group chat.
   * API: POST /api/group_chat with type=send
   */
  sendGroupMessage(
    groupId: string,
    message: string,
    attachment?: MessageAttachment,
    options?: SendMessageOptions,
  ): Promise<SendMessageResponse>;

  setMessageReaction(
    messageId: string,
    reaction: ReactionType | null,
  ): Promise<MessageReactionSummary>;

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

  searchConversationMessages(
    chat: ChatItem,
    query: string,
  ): Promise<MessageItem[]>;

  getConversationAssets(
    chat: ChatItem,
    category: ConversationAssetCategory,
    cursor?: ConversationAssetsCursor,
    limit?: number,
  ): Promise<ConversationAssetsPage>;

  setConversationNotifications(
    chat: ChatItem,
    enabled: boolean,
  ): Promise<void>;

  getPinnedMessages(chat: ChatItem | string): Promise<PinnedMessageItem[]>;

  setMessagePinned(
    chat: ChatItem | string,
    messageId: string,
    pinned: boolean,
  ): Promise<void>;

  blockConversationUser(userId: string): Promise<void>;

  reportConversationUser(
    userId: string,
    reason: string,
  ): Promise<ConversationReportResult>;

  getGroupInfo(groupId: string): Promise<GroupChatInfo>;

  searchAddableUsers(
    groupId: string,
    keyword?: string,
  ): Promise<GroupAddableUser[]>;

  addGroupUsers(groupId: string, userIds: string[]): Promise<void>;

  removeGroupUser(groupId: string, userId: string): Promise<void>;

  clearGroupHistory(chat: ChatItem): Promise<void>;

  leaveGroup(groupId: string): Promise<void>;

  deleteGroup(groupId: string): Promise<void>;

  editGroup(
    groupId: string,
    input: { name?: string; avatar?: MessageAttachment },
  ): Promise<GroupChatInfo>;

  getGroupSharedAssets(groupId: string): Promise<GroupSharedAssets>;

  listLabels(): Promise<MessageLabel[]>;

  createLabel(name: string, color: string): Promise<void>;

  updateLabel(labelId: string, name: string, color: string): Promise<void>;

  deleteLabel(labelId: string): Promise<void>;

  listTargetLabels(userId: string): Promise<MessageLabel[]>;

  attachLabel(userId: string, labelId: string): Promise<void>;

  detachLabel(userId: string, labelId: string): Promise<void>;

  getUsersByLabel(labelId: string): Promise<LabelRecipient[]>;

  getFollowingUserIds(forceRefresh?: boolean): Promise<Set<string>>;

  /**
   * Get the set of user IDs that are following the current user.
   * API: POST /api/get-friends
   */
  getFollowerUserIds(forceRefresh?: boolean): Promise<Set<string>>;
}
