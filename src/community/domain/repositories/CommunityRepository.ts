// Community Repository Interface
// Port từ: client/src/community/domain/repositories/

import type {
  CreateGroupDraft,
  GroupItem,
  GroupsListOptions,
  GroupsListPage,
} from '../types/community.types';

export interface CreateGroupResult {
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
  createGroup(draft: CreateGroupDraft): Promise<CreateGroupResult>;
}
