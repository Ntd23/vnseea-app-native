// Description: Defines repository operations for user, page, group, and hashtag search.

import type {
  FollowResponse,
  NearbyResponse,
  SearchFilter,
  SearchResponse,
  SuggestionResponse,
} from '../types/search.types';

export interface SearchRepository {
  // Search users, pages, groups, and hashtags by keyword.
  searchAll(filter: SearchFilter): Promise<SearchResponse>;

  // Load discoverable users, groups, and pages; keyword may be empty.
  discover(filter: SearchFilter): Promise<SearchResponse>;

  // Search users by keyword.
  searchUsers(filter: SearchFilter): Promise<SearchResponse>;

  // Get friend suggestions (people you may know).
  getSuggestions(limit?: number): Promise<SuggestionResponse>;

  // Get nearby users based on location.
  getNearbyUsers(filter: SearchFilter): Promise<NearbyResponse>;

  // Follow a user.
  followUser(userId: string): Promise<FollowResponse>;

  // Unfollow a user (same endpoint, toggles).
  unfollowUser(userId: string): Promise<FollowResponse>;

  toggleGroupJoin(groupId: string): Promise<{ isJoined: boolean; requested: boolean }>;
  togglePageLike(pageId: string): Promise<{ isLiked: boolean }>;
}
