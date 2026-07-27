// Description: Implements community group API calls for listing, creating, editing, media updates, and deletion.
// Port từ: client/src/community/infrastructure/repositories/

import type { CommunityRepository } from '../../domain/repositories/CommunityRepository';
import type {
  GroupItem,
  GroupMember,
  GroupMembershipStatus,
  UpdateGroupDraft,
} from '../../domain/types/community.types';
import {
  normalizeHostedMediaUrl,
  resolveGroupMembershipStatus,
} from '../../application/groupDetailState';
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

type GroupDetailResponse = {
  api_status: number | string;
  group_data?: RawGroup;
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type GroupMembersResponse = {
  api_status: number | string;
  users?: RawGroup[];
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type JoinGroupResponse = {
  api_status: number | string;
  join_status?: string;
  membership_status?: GroupMembershipStatus;
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type UpdateGroupResponse = {
  api_status?: number | string;
  status?: number | string;
  group_data?: RawGroup;
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
  return normalizeHostedMediaUrl(url, siteRoot);
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

  const membershipStatus = resolveGroupMembershipStatus(raw);

  return {
    id: groupId || groupName || groupTitle,
    groupId,
    groupName,
    groupTitle,
    about: readString(raw, 'about'),
    category: readString(raw, 'category_id') || readString(raw, 'category'),
    privacy: readString(raw, 'privacy') === '2' ? 'private' : 'public',
    joinPrivacy: readString(raw, 'join_privacy') === '2' ? 'approval' : 'open',
    avatar: normalizeUrl(readString(raw, 'avatar')),
    cover: normalizeUrl(readString(raw, 'cover')),
    url:
      normalizeUrl(readString(raw, 'url')) ||
      (groupName ? `${siteRoot}/${groupName}` : ''),
    members:
      readNumber(raw, 'members') ?? readNumber(raw, 'members_count') ?? 0,
    membershipStatus,
    isJoined:
      membershipStatus === 'owner' || membershipStatus === 'joined',
    isOwner: membershipStatus === 'owner',
    raw,
  };
}

function mapGroupMember(raw: RawGroup | undefined): GroupMember {
  const userId = readString(raw, 'user_id') || readString(raw, 'id');
  const username = readString(raw, 'username');
  const firstName = readString(raw, 'first_name');
  const lastName = readString(raw, 'last_name');
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const name =
    readString(raw, 'name') ||
    fullName ||
    username ||
    `#${userId}`;

  return {
    id: userId || username || name,
    userId,
    username,
    name,
    avatar: normalizeUrl(readString(raw, 'avatar')),
    isAdmin: readBoolean(raw, 'is_admin') ?? false,
    isFollowing: readBoolean(raw, 'is_following') ?? false,
    raw,
  };
}

function isSuccess(status: number | string | undefined) {
  return status === 200 || status === '200';
}

function isUpdateSuccess(response: UpdateGroupResponse) {
  return isSuccess(response.api_status) || isSuccess(response.status);
}

function mapUpdateGroupPayload(groupId: string | number, draft: UpdateGroupDraft) {
  return {
    group_id: String(groupId),
    group_name: draft.groupName,
    group_title: draft.groupTitle,
    about: draft.about,
    category: draft.category,
    privacy: draft.privacy === 'private' ? '2' : '1',
    join_privacy: draft.joinPrivacy === 'approval' ? '2' : '1',
    group_sub_category: draft.groupSubCategory,
  };
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
    async getGroupById(groupId) {
      const response = await apiBridge.post<GroupDetailResponse>(
        apiRoutes.groups.getById,
        { group_id: String(groupId) },
      );

      if (!isSuccess(response.api_status) || !response.group_data) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tải thông tin nhóm.',
        );
      }

      return mapGroup(response.group_data);
    },

    async joinGroup(groupId) {
      const response = await apiBridge.post<JoinGroupResponse>(
        apiRoutes.groups.join,
        {
          group_id: String(groupId),
          action: 'join',
        },
      );

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tham gia nhóm.',
        );
      }

      const status =
        response.membership_status ?? response.join_status;
      if (status === 'joined' || status === 'requested' || status === 'owner') {
        return status;
      }

      throw new Error('Không thể xác định trạng thái tham gia nhóm.');
    },

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
          items: page.items.map(group => ({
            ...group,
            membershipStatus: 'owner',
            isJoined: true,
            isOwner: true,
          })),
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

    async getGroupMembers(groupId, options = {}) {
      const limit = options.limit ?? 20;
      const offset = options.offset ? String(options.offset) : '0';

      try {
        const response = await apiBridge.post<GroupMembersResponse>(
          apiRoutes.groups.members,
          {
            group_id: String(groupId),
            limit,
            offset,
          },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Không thấy thành viên nhóm',
          );
        }

        return (response.users ?? [])
          .map(mapGroupMember)
          .filter(member => member.userId || member.username);
      } catch (error) {
        console.warn('[ApiCommunityRepository] get group members failed', error);
        throw new Error(
          error instanceof Error
            ? error.message
            : 'Không thấy thành viên nhóm',
        );
      }
    },

    async removeGroupMember(groupId, userId) {
      const response = await apiBridge.post<UpdateGroupResponse>(
        apiRoutes.groups.removeMember,
        {
          group_id: String(groupId),
          user_id: String(userId),
        },
      );

      if (!isUpdateSuccess(response)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể xóa thành viên khỏi nhóm.',
        );
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

    async updateGroup(groupId, draft) {
      let response: UpdateGroupResponse;

      try {
        response = await apiBridge.post<UpdateGroupResponse>(
          apiRoutes.groups.update,
          mapUpdateGroupPayload(groupId, draft),
        );
      } catch (error) {
        console.warn('[ApiCommunityRepository] update group failed', error);
        throw new Error(mapCreateGroupError(error));
      }

      if (!isUpdateSuccess(response)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể cập nhật nhóm. Vui lòng thử lại.',
        );
      }

      return {
        group: {
          id: String(groupId),
          groupId: String(groupId),
          groupName: draft.groupName,
          groupTitle: draft.groupTitle,
          about: draft.about,
          category: draft.category,
          privacy: draft.privacy,
          joinPrivacy: draft.joinPrivacy,
        },
        message: response.message,
      };
    },

    async updateGroupMedia(groupId, field, file) {
      const response = await apiBridge.multipart<UpdateGroupResponse>(
        apiRoutes.groups.update,
        {
          group_id: String(groupId),
          [field]: {
            uri: file.uri,
            name: file.name || `${field}_${Date.now()}.jpg`,
            type: file.type || 'image/jpeg',
          },
        },
      );

      if (!isUpdateSuccess(response)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            `Không thể cập nhật ${field === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'} nhóm.`,
        );
      }

      const updatedGroup = await apiBridge.post<GroupDetailResponse>(
        apiRoutes.groups.getById,
        { group_id: String(groupId) },
      );

      if (isSuccess(updatedGroup.api_status) && updatedGroup.group_data) {
        return mapGroup(updatedGroup.group_data);
      }

      return { id: String(groupId), groupId: String(groupId), groupName: '', groupTitle: '', privacy: 'public' };
    },

    async deleteGroup(groupId, password) {
      const response = await apiBridge.post<UpdateGroupResponse>(
        apiRoutes.groups.delete,
        {
          group_id: String(groupId),
          password,
        },
      );

      if (!isUpdateSuccess(response)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể xóa nhóm. Vui lòng thử lại.',
        );
      }
    },
  };
}
