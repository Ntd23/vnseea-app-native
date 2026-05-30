// Community API Repository (Infrastructure)
// Port từ: client/src/community/infrastructure/repositories/

import type { CommunityRepository } from '../../domain/repositories/CommunityRepository';
import type { GroupItem } from '../../domain/types/community.types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';

type RawGroup = Record<string, unknown>;

type CreateGroupResponse = {
  api_status: number | string;
  message?: string;
  group_data?: RawGroup;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type GroupsListResponse = {
  api_status: number | string;
  data?: RawGroup[];
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function readString(raw: RawGroup | undefined, key: string): string {
  const value = raw?.[key];
  return value === undefined || value === null ? '' : String(value);
}

function normalizeUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

function readNumber(raw: RawGroup | undefined, key: string): number | undefined {
  const number = Number(raw?.[key]);
  return Number.isFinite(number) ? number : undefined;
}

function readBoolean(raw: RawGroup | undefined, key: string) {
  const value = raw?.[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return undefined;
}

function mapGroup(raw: RawGroup | undefined): GroupItem {
  const groupId = readString(raw, 'group_id') || readString(raw, 'id');
  const groupName = readString(raw, 'group_name');
  const groupTitle = readString(raw, 'group_title') || readString(raw, 'name');

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
    url:
      normalizeUrl(readString(raw, 'url')) ||
      (groupName ? `${siteRoot}/${groupName}` : ''),
    members:
      readNumber(raw, 'members') ?? readNumber(raw, 'members_count') ?? 0,
    isJoined:
      readBoolean(raw, 'is_joined') ??
      readBoolean(raw, 'is_group_joined') ??
      false,
    isOwner: readBoolean(raw, 'is_owner') ?? false,
    raw,
  };
}

function isSuccess(status: number | string | undefined) {
  return status === 200 || status === '200';
}

function mapCreateGroupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Group name is already exists')) {
    return 'URL nhóm này đã tồn tại. Vui lòng chọn URL khác.';
  }

  if (message.includes('Group name must be between')) {
    return 'URL nhóm phải từ 5 đến 32 ký tự.';
  }

  if (message.includes('Invalid group name characters')) {
    return 'URL nhóm chỉ được dùng chữ cái không dấu.';
  }

  if (message.includes('required field')) {
    return 'Backend đang yêu cầu thêm trường thông tin nhóm. App chưa nhận được cấu hình trường bắt buộc đó.';
  }

  return message || 'Không thể tạo nhóm. Vui lòng thử lại.';
}

function mapGroupsListError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('type can not be empty')) {
    return 'API danh sách nhóm thiếu tham số type.';
  }

  if (message.includes('user_id (POST) is missing')) {
    return 'Không tìm thấy tài khoản hiện tại để tải nhóm đã tham gia.';
  }

  return message || 'Không thể tải danh sách nhóm. Vui lòng thử lại.';
}

function toGroupsPage(
  response: GroupsListResponse,
  limit: number,
  paginated = true,
) {
  if (!isSuccess(response.api_status)) {
    throw new Error(
      response.errors?.error_text ||
        response.message ||
        'Không thể tải danh sách nhóm. Vui lòng thử lại.',
    );
  }

  const rawGroups = Array.isArray(response.data) ? response.data : [];
  const items = rawGroups
    .map(mapGroup)
    .filter(group => group.groupId || group.groupName);
  const lastGroup = items[items.length - 1];

  return {
    items,
    nextOffset: paginated ? lastGroup?.groupId || null : null,
    hasMore:
      paginated && rawGroups.length >= limit && Boolean(lastGroup?.groupId),
  };
}

export function createCommunityRepository(): CommunityRepository {
  return {
    async getMyGroups(options = {}) {
      const limit = options.limit ?? 20;
      const offset = options.offset ? String(options.offset) : undefined;

      try {
        const response = await apiBridge.post<GroupsListResponse>(
          apiRoutes.groups.getMine,
          {
            type: 'my_groups',
            limit,
            offset,
          },
        );

        const page = toGroupsPage(response, limit);
        return {
          ...page,
          items: page.items.map(group => ({ ...group, isOwner: true })),
        };
      } catch (error) {
        console.warn('[ApiCommunityRepository] get my groups failed', error);
        throw new Error(mapGroupsListError(error));
      }
    },

    async getSuggestedGroups(options = {}) {
      const limit = options.limit ?? 20;

      try {
        const response = await apiBridge.post<GroupsListResponse>(
          apiRoutes.groups.recommended,
          {
            type: 'groups',
            limit,
          },
        );

        return toGroupsPage(response, limit, false);
      } catch (error) {
        console.warn(
          '[ApiCommunityRepository] get suggested groups failed',
          error,
        );
        throw new Error(mapGroupsListError(error));
      }
    },

    async getJoinedGroups(userId, options = {}) {
      const limit = options.limit ?? 20;
      const offset = options.offset ? String(options.offset) : undefined;

      try {
        const response = await apiBridge.post<GroupsListResponse>(
          apiRoutes.groups.getMine,
          {
            type: 'joined_groups',
            user_id: String(userId),
            limit,
            offset,
          },
        );

        return toGroupsPage(response, limit);
      } catch (error) {
        console.warn(
          '[ApiCommunityRepository] get joined groups failed',
          error,
        );
        throw new Error(mapGroupsListError(error));
      }
    },

    async createGroup(draft) {
      let response: CreateGroupResponse;

      try {
        response = await apiBridge.post<CreateGroupResponse>(
          apiRoutes.groups.create,
          {
            group_name: draft.groupName,
            group_title: draft.groupTitle,
            about: draft.about,
            category: draft.category,
            privacy: draft.privacy === 'private' ? '2' : '1',
            group_sub_category: draft.groupSubCategory,
          },
        );
      } catch (error) {
        console.warn('[ApiCommunityRepository] create group failed', error);
        throw new Error(mapCreateGroupError(error));
      }

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tạo nhóm. Vui lòng thử lại.',
        );
      }

      return {
        group: mapGroup(response.group_data),
        message: response.message,
      };
    },
  };
}
