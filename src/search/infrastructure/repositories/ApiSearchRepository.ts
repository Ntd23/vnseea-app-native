// Search API Repository (Infrastructure)
// Implements SearchRepository using WoWonder API endpoints

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { SearchRepository } from '../../domain/repositories/SearchRepository';
import type {
  FollowResponse,
  NearbyResponse,
  SearchFilter,
  SearchResponse,
  SearchResult,
  SuggestionResponse,
  SuggestionResult,
} from '../../domain/types/search.types';

// Helper to map raw user data to SearchResult
function mapUserToSearchResult(user: Record<string, unknown>): SearchResult {
  return {
    userId: String(user.user_id ?? ''),
    username: String(user.username ?? ''),
    name: String(user.name ?? user.username ?? ''),
    avatar: String(user.avatar ?? ''),
    cover: user.cover ? String(user.cover) : undefined,
    gender: String(user.gender ?? ''),
    verified: Boolean(user.verified === 1 || user.verified === '1'),
    isFollowing:
      user.is_following === 1 ||
      user.is_following === '1' ||
      user.is_following === 'yes' ||
      user.is_following === true,
    lastSeen: user.lastseen ? String(user.lastseen) : undefined,
    lastSeenText: user.lastseen_time_text ? String(user.lastseen_time_text) : undefined,
    followingCount: user.following_count ? Number(user.following_count) : undefined,
    followersCount: user.followers_count ? Number(user.followers_count) : undefined,
    mutualFriends: user.mutual_friends ? Number(user.mutual_friends) : undefined,
    distance: user.distance ? Number(user.distance) : undefined,
  };
}

function mapUserToSuggestionResult(user: Record<string, unknown>): SuggestionResult {
  return {
    userId: String(user.user_id ?? ''),
    username: String(user.username ?? ''),
    name: String(user.name ?? user.username ?? ''),
    avatar: String(user.avatar ?? ''),
    mutualFriends: user.mutual_friends ? Number(user.mutual_friends) : undefined,
    isFollowing:
      user.is_following === 1 ||
      user.is_following === '1' ||
      user.is_following === 'yes' ||
      user.is_following === true,
  };
}

export function createSearchRepository(): SearchRepository {
  return {
    async searchUsers(filter: SearchFilter): Promise<SearchResponse> {
      const payload: Record<string, unknown> = {
        limit: 35,
        user_offset: 0,
      };

      if (filter.keyword) {
        payload.search_key = filter.keyword;
      }
      if (filter.gender) {
        payload.gender = filter.gender;
      }
      if (filter.country) {
        payload.country = filter.country;
      }
      if (filter.verified) {
        payload.verified = '1';
      }
      if (filter.ageFrom) {
        payload.age_from = filter.ageFrom;
      }
      if (filter.ageTo) {
        payload.age_to = filter.ageTo;
      }

      const response = await apiBridge.post<{
        api_status: number;
        users?: Record<string, unknown>[];
      }>(apiRoutes.search.all, payload);

      const users: SearchResult[] = (response.users ?? []).map(user =>
        mapUserToSearchResult(user),
      );

      return {
        users,
        pages: [],
        groups: [],
      };
    },

    async getSuggestions(limit = 20): Promise<SuggestionResponse> {
      const response = await apiBridge.post<{
        api_status: number;
        suggestions?: Record<string, unknown>[];
        contacts_suggestions?: Record<string, unknown>[];
        users?: Record<string, unknown>[];
      }>(apiRoutes.user.suggestions, {
        limit,
      });

      // Combine suggestions, contacts_suggestions, and users from WoWonder API
      const allUsers = [
        ...(response.suggestions ?? []),
        ...(response.contacts_suggestions ?? []),
        ...(response.users ?? []),
      ];

      const seen = new Set<string>();
      const suggestions: SuggestionResult[] = [];

      for (const user of allUsers) {
        const userId = String(user.user_id ?? '');
        if (!seen.has(userId)) {
          seen.add(userId);
          suggestions.push(mapUserToSuggestionResult(user));
          if (suggestions.length >= limit) break;
        }
      }

      return {
        suggestions,
        contactsSuggestions: [],
      };
    },

    async getNearbyUsers(filter: SearchFilter): Promise<NearbyResponse> {
      const payload: Record<string, unknown> = {
        limit: 35,
        offset: 0,
      };

      if (filter.keyword) {
        payload.keyword = filter.keyword;
      }
      if (filter.gender) {
        payload.gender = filter.gender;
      }
      if (filter.distance) {
        payload.distance = filter.distance;
      }
      if (filter.lat) {
        payload.lat = filter.lat;
      }
      if (filter.lng) {
        payload.lng = filter.lng;
      }

      const response = await apiBridge.post<{
        api_status: number;
        nearby_users?: Record<string, unknown>[];
        users?: Record<string, unknown>[];
      }>(apiRoutes.user.nearby, payload);

      const users: SearchResult[] = (
        response.nearby_users ??
        response.users ??
        []
      ).map(user => mapUserToSearchResult(user));

      return { users };
    },

    async followUser(userId: string): Promise<FollowResponse> {
      const response = await apiBridge.post<{
        api_status: number;
        follow_status: string;
      }>(apiRoutes.social.follow, {
        user_id: userId,
      });

      return {
        followStatus: response.follow_status as FollowResponse['followStatus'],
      };
    },

    async unfollowUser(userId: string): Promise<FollowResponse> {
      // Same endpoint as follow - toggles
      return this.followUser(userId);
    },
  };
}
