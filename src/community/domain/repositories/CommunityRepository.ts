// Description: Defines repository operations for community group data.
// Port từ: client/src/community/domain/repositories/

import type {
  CreateGroupDraft,
  GroupItem,
  GroupMember,
  GroupsListOptions,
  GroupsListPage,
  UpdateGroupDraft,
} from '../types/community.types';

export interface CreateGroupResult {
  group: GroupItem;
  message?: string;
}

export interface UpdateGroupResult {
  group: GroupItem;
  message?: string;
}

export interface CommunityRepository {
  getMyGroups(options?: GroupsListOptions): Promise<GroupsListPage>;
  getSuggestedGroups(options?: GroupsListOptions): Promise<GroupsListPage>;
  getJoinedGroups(
    userId: string | number,
    options?: GroupsListOptions,
  ): Promise<GroupsListPage>;
  getGroupMembers(
    groupId: string | number,
    options?: GroupsListOptions,
  ): Promise<GroupMember[]>;
  removeGroupMember(groupId: string | number, userId: string | number): Promise<void>;
  createGroup(draft: CreateGroupDraft): Promise<CreateGroupResult>;
  updateGroup(groupId: string | number, draft: UpdateGroupDraft): Promise<UpdateGroupResult>;
  updateGroupMedia(
    groupId: string | number,
    field: 'avatar' | 'cover',
    file: { uri: string; name?: string; type?: string },
  ): Promise<GroupItem>;
  deleteGroup(groupId: string | number, password: string): Promise<void>;
}
