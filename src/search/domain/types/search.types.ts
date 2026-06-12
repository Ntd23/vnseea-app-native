// Search domain types
// Global search covers users, pages, groups, jobs, and funding campaigns.

import type { GroupItem } from '../../../community/domain/types/community.types';
import type { FundingItem } from '../../../funding/domain/types/funding.types';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';

export type SearchFilter = {
  keyword?: string;
  gender?: string;
  country?: string;
  verified?: boolean;
  distance?: number;
  ageFrom?: number;
  ageTo?: number;
  lat?: number;
  lng?: number;
};

export type SearchResult = {
  userId: string;
  username: string;
  name: string;
  avatar: string;
  cover?: string;
  gender: string;
  verified: boolean;
  isFollowing: boolean;
  lastSeen?: string;
  lastSeenText?: string;
  followingCount?: number;
  followersCount?: number;
  mutualFriends?: number;
  distance?: number;
};

export type GlobalSearchTab =
  | 'all'
  | 'users'
  | 'pages'
  | 'groups'
  | 'jobs'
  | 'funding';

export type SearchResponse = {
  users: SearchResult[];
  pages: PagesItem[];
  groups: GroupItem[];
  jobs: JobsItem[];
  funding: FundingItem[];
};

export type SuggestionResult = {
  userId: string;
  username: string;
  name: string;
  avatar: string;
  mutualFriends?: number;
  isFollowing: boolean;
};

export type SuggestionResponse = {
  suggestions: SuggestionResult[];
  contactsSuggestions?: SuggestionResult[];
};

export type NearbyResponse = {
  users: SearchResult[];
};

export type FollowStatus = 'followed' | 'unfollowed' | 'requested';

export type FollowResponse = {
  followStatus: FollowStatus;
};
