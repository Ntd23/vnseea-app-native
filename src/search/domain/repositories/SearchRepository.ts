// Search Repository Interface
// Based on WoWonder API endpoints

import type {
  FollowResponse,
  NearbyResponse,
  SearchFilter,
  SearchResponse,
  SuggestionResponse,
} from '../types/search.types';

export interface SearchRepository {
  // Search users, pages, groups, jobs, and funding campaigns by keyword
  searchAll(filter: SearchFilter): Promise<SearchResponse>;

  // Search users by keyword
  searchUsers(filter: SearchFilter): Promise<SearchResponse>;

  // Get friend suggestions (people you may know)
  getSuggestions(limit?: number): Promise<SuggestionResponse>;

  // Get nearby users based on location
  getNearbyUsers(filter: SearchFilter): Promise<NearbyResponse>;

  // Follow a user
  followUser(userId: string): Promise<FollowResponse>;

  // Unfollow a user (same endpoint, toggles)
  unfollowUser(userId: string): Promise<FollowResponse>;
}
