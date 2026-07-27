// Description: Defines community domain types for groups and community lists.
// Port từ: client/src/community/domain/types/

export interface CommunityItem {
  id: string | number;
  // TODO: thêm fields từ API response
}

export type GroupPrivacy = 'public' | 'private';
export type GroupMembershipStatus =
  | 'owner'
  | 'joined'
  | 'requested'
  | 'not_joined';

export interface GroupItem {
  id: string;
  groupId: string;
  groupName: string;
  groupTitle: string;
  about?: string;
  category?: string;
  privacy: GroupPrivacy;
  joinPrivacy?: 'open' | 'approval';
  avatar?: string;
  cover?: string;
  url?: string;
  members?: number;
  membershipStatus?: GroupMembershipStatus;
  isJoined?: boolean;
  isOwner?: boolean;
  raw?: unknown;
}

export interface GroupMember {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  isAdmin?: boolean;
  isFollowing?: boolean;
  raw?: unknown;
}

export type GroupsFilter = 'mine' | 'suggested' | 'joined';

export interface GroupsListOptions {
  limit?: number;
  offset?: string | number | null;
}

export interface GroupsListPage {
  items: GroupItem[];
  nextOffset: string | null;
  hasMore: boolean;
}

export interface CreateGroupDraft {
  groupName: string;
  groupTitle: string;
  about: string;
  category: string;
  privacy: GroupPrivacy;
  groupSubCategory?: string;
}

export interface UpdateGroupDraft extends CreateGroupDraft {
  joinPrivacy?: 'open' | 'approval';
}
