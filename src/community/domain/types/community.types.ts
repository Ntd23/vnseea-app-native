// Community domain types
// Port từ: client/src/community/domain/types/

export interface CommunityItem {
  id: string | number;
  // TODO: thêm fields từ API response
}

export type GroupPrivacy = 'public' | 'private';

export interface GroupItem {
  id: string;
  groupId: string;
  groupName: string;
  groupTitle: string;
  about?: string;
  category?: string;
  privacy: GroupPrivacy;
  avatar?: string;
  cover?: string;
  url?: string;
  members?: number;
  isJoined?: boolean;
  isOwner?: boolean;
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
