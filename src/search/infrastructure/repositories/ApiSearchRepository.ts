// Search API Repository (Infrastructure)
// Implements SearchRepository using WoWonder API endpoints.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type { FundingItem } from '../../../funding/domain/types/funding.types';
import type { JobsItem, JobsListResponse } from '../../../jobs/domain/types/jobs.types';
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

type FundingListWireResponse = {
  api_status: number | string;
  data?: FundingItem[];
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

function readString(raw: RawRecord | undefined, key: string): string {
  const value = raw?.[key];
  return value === undefined || value === null ? '' : String(value);
}

function readNumber(raw: RawRecord | undefined, key: string): number | undefined {
  const parsed = Number(raw?.[key]);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function includesKeyword(...values: Array<string | number | undefined | null>) {
  return (keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return true;
    return values
      .filter(value => value !== undefined && value !== null)
      .some(value => String(value).toLowerCase().includes(normalized));
  };
}

function mapUserToSearchResult(user: RawRecord): SearchResult {
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
  };
}

function mapPage(raw: RawRecord): PagesItem {
  const pageId = readString(raw, 'page_id') || readString(raw, 'id');
  const pageName = readString(raw, 'page_name') || readString(raw, 'username');
  const pageTitle =
    readString(raw, 'page_title') ||
    readString(raw, 'name') ||
    readString(raw, 'title') ||
    pageName;

  return {
    id: pageId || pageName || pageTitle,
    pageId,
    pageName,
    pageTitle,
    pageDescription: readString(raw, 'page_description') || readString(raw, 'about'),
    pageCategory: readString(raw, 'page_category') || readString(raw, 'category'),
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
  const groupId = readString(raw, 'group_id') || readString(raw, 'id');
  const groupName = readString(raw, 'group_name') || readString(raw, 'username');
  const groupTitle =
    readString(raw, 'group_title') ||
    readString(raw, 'name') ||
    readString(raw, 'title') ||
    groupName;

  return {
    id: groupId || groupName || groupTitle,
    groupId,
    groupName,
    groupTitle,
    about: readString(raw, 'about'),
    category: readString(raw, 'category_id') || readString(raw, 'category'),
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

function mapJobItem(raw: RawRecord): JobsItem {
  const page = raw.page as RawRecord | undefined;

  return {
    id: String(raw.id ?? raw.job_id ?? ''),
    title: String(raw.title ?? raw.job_title ?? ''),
    description: String(raw.description ?? ''),
    location: String(raw.location ?? ''),
    lat: raw.lat as string | undefined,
    lng: raw.lng as string | undefined,
    minimum: typeof raw.minimum === 'number' ? raw.minimum : Number(raw.minimum) || undefined,
    maximum: typeof raw.maximum === 'number' ? raw.maximum : Number(raw.maximum) || undefined,
    salary_date: raw.salary_date as string | undefined,
    job_type: String(raw.job_type ?? 'full_time'),
    category: String(raw.category ?? ''),
    currency: raw.currency as string | undefined,
    image: normalizeUrl(String(raw.image ?? '')),
    image_type: raw.image_type as string | undefined,
    page_id: String(raw.page_id ?? ''),
    user_id: String(raw.user_id ?? ''),
    time: Number(raw.time) || 0,
    post_id: raw.post_id ? String(raw.post_id) : undefined,
    page: page
      ? {
          page_id: String(page.page_id ?? ''),
          page_title: String(page.page_title ?? ''),
          page_name: String(page.page_name ?? ''),
          page_description: String(page.page_description ?? ''),
          avatar: normalizeUrl(String(page.avatar ?? '')),
          cover: normalizeUrl(String(page.cover ?? '')),
          user_id: String(page.user_id ?? ''),
          is_page_onwer: Boolean(page.is_page_onwer),
        }
      : undefined,
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

function filterFunding(items: FundingItem[], keyword: string) {
  return items.filter(item =>
    includesKeyword(
      item.title,
      item.description,
      item.user_data?.username,
      item.user_data?.first_name,
      item.user_data?.last_name,
    )(keyword),
  );
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
  if (filter.verified) payload.verified = '1';
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

async function searchJobs(keyword: string): Promise<JobsItem[]> {
  const response = await apiBridge.post<JobsListResponse>('job', {
    type: 'search',
    keyword,
    limit: '20',
    offset: '0',
  });

  return ((response.data ?? []) as unknown as RawRecord[]).map(mapJobItem);
}

async function searchFunding(keyword: string): Promise<FundingItem[]> {
  const response = await apiBridge.post<FundingListWireResponse>(
    apiRoutes.funding.list,
    { type: 'funding', limit: 40, offset: 0 },
  );

  return filterFunding(response.data ?? [], keyword).slice(0, 20);
}

export function createSearchRepository(): SearchRepository {
  return {
    async searchAll(filter: SearchFilter): Promise<SearchResponse> {
      const keyword = filter.keyword?.trim() ?? '';
      if (!keyword) {
        return { users: [], pages: [], groups: [], jobs: [], funding: [] };
      }

      const [social, jobs, funding] = await Promise.all([
        searchUsersPagesGroups(filter),
        searchJobs(keyword).catch(error => {
          console.warn('[ApiSearchRepository] search jobs failed:', error);
          return [];
        }),
        searchFunding(keyword).catch(error => {
          console.warn('[ApiSearchRepository] search funding failed:', error);
          return [];
        }),
      ]);

      return {
        ...social,
        jobs,
        funding,
      };
    },

    async searchUsers(filter: SearchFilter): Promise<SearchResponse> {
      const social = await searchUsersPagesGroups(filter);
      return {
        ...social,
        jobs: [],
        funding: [],
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
  };
}
