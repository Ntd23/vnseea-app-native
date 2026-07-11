// Description: Defines search domain types for users, pages, groups, and hashtags.

import type { GroupItem } from '../../../community/domain/types/community.types';
import type { TrendingHashtag } from '../../../explore/domain/types/explore.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';

export type SearchFilter = {
  keyword?: string;
  gender?: string;
  country?: string;
  verified?: boolean | 'on' | 'off';
  status?: 'on' | 'off';
  image?: 'on' | 'off';
  filterByAge?: 'yes' | 'no';
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
  postCount?: number;
};

export type GlobalSearchTab =
  | 'all'
  | 'users'
  | 'pages'
  | 'groups'
  | 'hashtags';

export type SearchResponse = {
  users: SearchResult[];
  pages: PagesItem[];
  groups: GroupItem[];
  hashtags: TrendingHashtag[];
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
