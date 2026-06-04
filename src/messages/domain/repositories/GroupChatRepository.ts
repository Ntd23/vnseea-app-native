// Description: Group chat repository interface
// English description: Defines the group chat repository contract.

import type {
  GroupChatItem,
  GroupChatUser,
  GroupChatMessage,
  CreateGroupChatPayload,
  GroupChatType,
} from '../types/groupChat.types';

export interface GroupChatRepository {
  // Get list of group chats
  getList(options?: {
    limit?: number;
    offset?: number;
  }): Promise<GroupChatItem[]>;

  // Create a new group chat
  createGroup(payload: CreateGroupChatPayload): Promise<GroupChatItem[]>;

  // Get group chat by ID
  getById(groupId: number): Promise<GroupChatItem[]>;

  // Delete a group chat
  deleteGroup(groupId: number): Promise<void>;

  // Edit group chat (name, avatar)
  editGroup(groupId: number, name: string, avatar?: any): Promise<GroupChatItem[]>;

  // Leave a group chat
  leaveGroup(groupId: number): Promise<void>;

  // Add users to group
  addUsers(groupId: number, userIds: number[]): Promise<void>;

  // Remove users from group
  removeUsers(groupId: number, userIds: number[]): Promise<void>;

  // Search addable users
  searchAddableUsers(groupId: number, keyword?: string, limit?: number): Promise<GroupChatUser[]>;

  // Join a group
  joinGroup(groupId: number): Promise<void>;

  // Accept group invitation
  acceptGroup(groupId: number): Promise<void>;

  // Reject group invitation
  rejectGroup(groupId: number): Promise<void>;

  // Fetch messages for a group
  fetchMessages(groupId: number, options?: {
    limit?: number;
    before_message_id?: number;
    after_message_id?: number;
  }): Promise<GroupChatItem>;

  // Send a message to group
  sendMessage(groupId: number, message: {
    text?: string;
    image_url?: string;
    gif?: string;
    lat?: number;
    lng?: number;
    file?: any;
  }): Promise<GroupChatMessage[]>;
}