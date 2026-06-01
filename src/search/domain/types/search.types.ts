// Search domain types
// Based on WoWonder API responses

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

export type SearchResponse = {
  users: SearchResult[];
  pages?: unknown[];
  groups?: unknown[];
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
