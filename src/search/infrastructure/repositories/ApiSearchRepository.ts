// Description: Implements user, page, group, and hashtag search through WoWonder API endpoints.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { normalizeConfiguredUrl } from '../../../shared-kernel/infrastructure/config/url';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type { TrendingHashtag } from '../../../explore/domain/types/explore.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
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

type RawRecord = Record<string, unknown>;

type RawSearchResponse = {
  api_status: number | string;
  users?: RawRecord[];
  pages?: RawRecord[];
  groups?: RawRecord[];
};

type HashtagSuggestionsResponse = {
  api_status: number | string;
  hashtags?: unknown;
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function normalizeUrl(url: string): string {
  return normalizeConfiguredUrl(url) ?? '';
}

function readString(raw: RawRecord | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: RawRecord | undefined, key: string): number | undefined {
  const parsed = Number(raw?.[key]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readHashtagNumber(raw: RawRecord | undefined, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function readBoolean(raw: RawRecord | undefined, key: string): boolean | undefined {
  const value = raw?.[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === '1' || lower === 'true' || lower === 'yes';
  }
  return undefined;
}

function mapUserToSearchResult(user: RawRecord): SearchResult {
  const details = user.details && typeof user.details === 'object'
    ? user.details as RawRecord
    : undefined;
  return {
    userId: String(user.user_id ?? user.id ?? ''),
    username: String(user.username ?? ''),
    name: String(user.name ?? user.full_name ?? user.username ?? ''),
    avatar: normalizeUrl(String(user.avatar ?? '')),
    cover: user.cover ? normalizeUrl(String(user.cover)) : undefined,
    gender: String(user.gender ?? ''),
    verified: Boolean(user.verified === 1 || user.verified === '1' || user.verified === true),
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
    postCount: readNumber(details, 'post_count') ?? readNumber(user, 'post_count'),
  };
}

function mapPage(raw: RawRecord): PagesItem {
  const pageId = readString(raw, 'page_id', 'id');
  const pageName = readString(raw, 'page_name', 'username');
  const pageTitle =
    readString(raw, 'page_title', 'name', 'title') ||
    pageName;

  return {
    id: pageId || pageName || pageTitle,
    pageId,
    pageName,
    pageTitle,
    pageDescription: readString(raw, 'page_description', 'about'),
    pageCategory: readString(raw, 'page_category', 'category'),
    address: readString(raw, 'address'),
    lat: readNumber(raw, 'lat'),
    lng: readNumber(raw, 'lng'),
    avatar: normalizeUrl(readString(raw, 'avatar')),
    cover: normalizeUrl(readString(raw, 'cover')),
    url: normalizeUrl(readString(raw, 'url')) || (pageName ? `${siteRoot}/${pageName}` : ''),
    likes: readNumber(raw, 'likes'),
    isLiked: readBoolean(raw, 'is_liked'),
    raw,
  };
}

function mapGroup(raw: RawRecord): GroupItem {
  const groupId = readString(raw, 'group_id', 'id');
  const groupName = readString(raw, 'group_name', 'username');
  const groupTitle =
    readString(raw, 'group_title', 'name', 'title') ||
    groupName;

  return {
    id: groupId || groupName || groupTitle,
    groupId,
    groupName,
    groupTitle,
    about: readString(raw, 'about'),
    category: readString(raw, 'category_id', 'category'),
    privacy: readString(raw, 'privacy') === '2' ? 'private' : 'public',
    avatar: normalizeUrl(readString(raw, 'avatar')),
    cover: normalizeUrl(readString(raw, 'cover')),
    url: normalizeUrl(readString(raw, 'url')) || (groupName ? `${siteRoot}/${groupName}` : ''),
    members: readNumber(raw, 'members') ?? readNumber(raw, 'members_count') ?? 0,
    isJoined: readBoolean(raw, 'is_joined') ?? readBoolean(raw, 'is_group_joined') ?? false,
    isOwner: readBoolean(raw, 'is_owner') ?? false,
    raw,
  };
}

function mapHashtag(rawInput: RawRecord | string): TrendingHashtag | null {
  const raw = typeof rawInput === 'string' ? { tag: rawInput } : rawInput;
  const tag = readString(raw, 'tag', 'label', 'hashtag', 'hash', 'name')
    .replace(/^#+/, '')
    .trim();

  if (!tag) return null;

  const rawTime = readString(raw, 'last_trend_time', 'time', 'created_at');

  return {
    id: readString(raw, 'id', 'hash_id', 'hashtag_id') || tag,
    tag,
    url: readString(raw, 'url'),
    useCount: readHashtagNumber(
      raw,
      'trend_use_num',
      'use_count',
      'post_count',
      'posts_count',
      'posts',
      'count',
      'total',
    ),
    lastTrendTime: rawTime.length > 0 ? rawTime : null,
  };
}

function toRawHashtagArray(input: unknown): Array<RawRecord | string> {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.filter(
      (item): item is RawRecord | string =>
        typeof item === 'string' ||
        (typeof item === 'object' && item !== null && !Array.isArray(item)),
    );
  }

  if (typeof input === 'string') return [input];

  if (typeof input === 'object') {
    const raw = input as RawRecord;
    if (readString(raw, 'tag', 'label', 'hashtag', 'hash', 'name').length > 0) {
      return [raw];
    }

    return Object.values(raw).filter(
      (item): item is RawRecord | string =>
        typeof item === 'string' ||
        (typeof item === 'object' && item !== null && !Array.isArray(item)),
    );
  }

  return [];
}

function dedupeHashtags(items: TrendingHashtag[]): TrendingHashtag[] {
  const byTag = new Map<string, TrendingHashtag>();

  items.forEach(item => {
    const key = item.tag.toLowerCase();
    const existing = byTag.get(key);
    if (!existing || item.useCount > existing.useCount) {
      byTag.set(key, item);
    }
  });

  return Array.from(byTag.values());
}

function buildExactHashtag(tag: string): TrendingHashtag {
  const normalizedTag = tag.trim().replace(/^#+/, '');
  return {
    id: normalizedTag,
    tag: normalizedTag,
    url: '',
    useCount: 0,
    lastTrendTime: null,
  };
}

function mapUserToSuggestionResult(user: RawRecord): SuggestionResult {
  const mapped = mapUserToSearchResult(user);
  return {
    userId: mapped.userId,
    username: mapped.username,
    name: mapped.name,
    avatar: mapped.avatar,
    mutualFriends: mapped.mutualFriends,
    isFollowing: mapped.isFollowing,
  };
}

async function searchUsersPagesGroups(
  filter: SearchFilter,
): Promise<Pick<SearchResponse, 'users' | 'pages' | 'groups'>> {
  const payload: Record<string, unknown> = {
    limit: 35,
    user_offset: 0,
    page_offset: 0,
    group_offset: 0,
  };

  if (filter.keyword) payload.search_key = filter.keyword;
  if (filter.gender) payload.gender = filter.gender;
  if (filter.country) payload.country = filter.country;
  if (filter.verified) payload.verified = filter.verified === true ? 'on' : filter.verified;
  if (filter.status) payload.status = filter.status;
  if (filter.image) payload.image = filter.image;
  if (filter.filterByAge) payload.filterbyage = filter.filterByAge;
  if (filter.ageFrom) payload.age_from = filter.ageFrom;
  if (filter.ageTo) payload.age_to = filter.ageTo;

  const response = await apiBridge.post<RawSearchResponse>(
    apiRoutes.search.all,
    payload,
  );

  return {
    users: (response.users ?? []).map(mapUserToSearchResult).filter(user => user.userId),
    pages: (response.pages ?? []).map(mapPage).filter(page => page.pageId || page.pageName),
    groups: (response.groups ?? []).map(mapGroup).filter(group => group.groupId || group.groupName),
  };
}

async function searchHashtags(keyword: string): Promise<TrendingHashtag[]> {
  const normalizedKeyword = keyword.trim().replace(/^#+/, '');

  if (!normalizedKeyword) return [];

  const items: TrendingHashtag[] = [];

  try {
    const response = await apiBridge.post<HashtagSuggestionsResponse>(
      apiRoutes.reels.hashtagSuggestions,
      { query: normalizedKeyword, limit: 20 },
    );

    items.push(
      ...toRawHashtagArray(response.hashtags)
        .map(mapHashtag)
        .filter((item): item is TrendingHashtag => Boolean(item)),
    );
  } catch (error) {
    console.warn('[ApiSearchRepository] search hashtags failed:', error);
  }

  const keywordLower = normalizedKeyword.toLowerCase();
  const hasExact = items.some(item => item.tag.toLowerCase() === keywordLower);
  if (!hasExact) {
    items.unshift(buildExactHashtag(normalizedKeyword));
  }

  return dedupeHashtags(items).slice(0, 20);
}

function emptySearchResponse(): SearchResponse {
  return { users: [], pages: [], groups: [], hashtags: [] };
}

export function createSearchRepository(): SearchRepository {
  return {
    async searchAll(filter: SearchFilter): Promise<SearchResponse> {
      const keyword = filter.keyword?.trim() ?? '';
      if (!keyword) {
        return emptySearchResponse();
      }

      const [social, hashtags] = await Promise.all([
        searchUsersPagesGroups(filter),
        searchHashtags(keyword),
      ]);

      return {
        ...social,
        hashtags,
      };
    },

    async discover(filter: SearchFilter): Promise<SearchResponse> {
      const social = await searchUsersPagesGroups(filter);
      return { ...social, hashtags: [] };
    },

    async searchUsers(filter: SearchFilter): Promise<SearchResponse> {
      const social = await searchUsersPagesGroups(filter);
      return {
        ...social,
        hashtags: [],
      };
    },

    async getSuggestions(limit = 20): Promise<SuggestionResponse> {
      const response = await apiBridge.post<{
        api_status: number;
        suggestions?: RawRecord[];
        contacts_suggestions?: RawRecord[];
        users?: RawRecord[];
      }>(apiRoutes.user.suggestions, {
        limit,
      });

      const allUsers = [
        ...(response.suggestions ?? []),
        ...(response.contacts_suggestions ?? []),
        ...(response.users ?? []),
      ];

      const seen = new Set<string>();
      const suggestions: SuggestionResult[] = [];

      for (const user of allUsers) {
        const userId = String(user.user_id ?? user.id ?? '');
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

      if (filter.keyword) payload.keyword = filter.keyword;
      if (filter.gender) payload.gender = filter.gender;
      if (filter.distance) payload.distance = filter.distance;
      if (filter.lat) payload.lat = filter.lat;
      if (filter.lng) payload.lng = filter.lng;

      const response = await apiBridge.post<{
        api_status: number;
        nearby_users?: RawRecord[];
        users?: RawRecord[];
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
      return this.followUser(userId);
    },

    async toggleGroupJoin(groupId: string) {
      const response = await apiBridge.post<{
        api_status: number | string;
        join_status?: string;
      }>(apiRoutes.groups.join, { group_id: groupId });
      const status = response.join_status ?? '';
      return {
        isJoined: status === 'joined',
        requested: status === 'requested',
      };
    },

    async togglePageLike(pageId: string) {
      const response = await apiBridge.post<{
        api_status: number | string;
        like_status?: string;
      }>(apiRoutes.pages.like, { page_id: pageId });
      return { isLiked: response.like_status === 'liked' };
    },
  };
}
