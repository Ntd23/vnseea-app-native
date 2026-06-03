// Description: Group chat API repository implementation
// English description: Implements group chat data operations through the WoWonder group_chat API.
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { GroupChatRepository } from '../../domain/repositories/GroupChatRepository';
import type {
  GroupChatItem,
  GroupChatUser,
  GroupChatMessage,
  CreateGroupChatPayload,
  GroupChatListResponse,
  GroupChatCreateResponse,
  GroupChatDetailResponse,
  GroupChatMessageResponse,
  GroupChatSearchUsersResponse,
} from '../../domain/types/groupChat.types';

const siteRoot = 'https://v2.vnseea.vn';

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGroupChatUser(raw: any): GroupChatUser {
  return {
    user_id: Number(raw?.user_id ?? 0),
    username: String(raw?.username ?? ''),
    first_name: String(raw?.first_name ?? ''),
    last_name: String(raw?.last_name ?? ''),
    avatar: normalizeUrl(String(raw?.avatar ?? '')),
    cover: normalizeUrl(String(raw?.cover ?? '')),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGroupChatItem(raw: any): GroupChatItem {
  const parts = Array.isArray(raw?.parts)
    ? raw.parts.map((p: any) => ({
        user_id: Number(p?.user_id ?? 0),
        username: String(p?.username ?? ''),
        first_name: String(p?.first_name ?? ''),
        last_name: String(p?.last_name ?? ''),
        avatar: normalizeUrl(String(p?.avatar ?? '')),
        last_seen: Number(p?.last_seen ?? 0),
        active: Number(p?.active ?? 0),
      }))
    : [];

  const lastMessage = raw?.last_message
    ? {
        id: Number(raw.last_message?.id ?? 0),
        text: String(raw.last_message?.text ?? ''),
        from_id: Number(raw.last_message?.from_id ?? 0),
        time: Number(raw.last_message?.time ?? 0),
        user_data: raw.last_message?.user_data
          ? mapGroupChatUser(raw.last_message.user_data)
          : null,
      }
    : undefined;

  const mute = raw?.mute
    ? {
        notify: String(raw.mute?.notify ?? 'yes'),
        call_chat: String(raw.mute?.call_chat ?? 'yes'),
        archive: String(raw.mute?.archive ?? 'no'),
        fav: String(raw.mute?.fav ?? 'no'),
        pin: String(raw.mute?.pin ?? 'no'),
      }
    : { notify: 'yes', call_chat: 'yes', archive: 'no', fav: 'no', pin: 'no' };

  return {
    id: Number(raw?.id ?? 0),
    user_id: Number(raw?.user_id ?? 0),
    group_name: String(raw?.group_name ?? ''),
    avatar: normalizeUrl(String(raw?.avatar ?? '')),
    type: raw?.type || 'group',
    parts,
    last_message: lastMessage,
    mute,
  };
}

export function createGroupChatRepository(): GroupChatRepository {
  return {
    async getList(options = {}) {
      const { limit = 20, offset = 0 } = options;

      const response = await apiBridge.post<GroupChatListResponse>(
        'group_chat',
        { type: 'get_list', limit, offset },
      );

      if (response.api_status !== 200) {
        console.warn('[GroupChatRepository] getList failed:', response);
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (response.data ?? []).map((item: any) => mapGroupChatItem(item));
    },

    async createGroup(payload: CreateGroupChatPayload) {
      const partsString = payload.parts.join(',');

      const params: Record<string, string> = {
        type: 'create',
        group_name: payload.groupName,
        parts: partsString,
      };

      if (payload.groupType) {
        params.group_type = payload.groupType;
      }

      const response = await apiBridge.post<GroupChatCreateResponse>(
        'group_chat',
        params,
      );

      if (response.api_status !== 200) {
        console.warn('[GroupChatRepository] createGroup failed:', response);
        throw new Error('Tạo nhóm thất bại');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (response.data ?? []).map((item: any) => mapGroupChatItem(item));
    },

    async getById(groupId: number) {
      const response = await apiBridge.post<GroupChatDetailResponse>(
        'group_chat',
        { type: 'get_by_id', id: groupId },
      );

      if (response.api_status !== 200) {
        throw new Error('Không tìm thấy nhóm');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (response.data ?? []).map((item: any) => mapGroupChatItem(item));
    },

    async deleteGroup(groupId: number) {
      const response = await apiBridge.post<{ api_status: number; message_data?: string }>(
        'group_chat',
        { type: 'delete', id: groupId },
      );

      if (response.api_status !== 200) {
        throw new Error('Xóa nhóm thất bại');
      }
    },

    async editGroup(groupId: number, name: string) {
      const response = await apiBridge.post<GroupChatDetailResponse>(
        'group_chat',
        { type: 'edit', id: String(groupId), group_name: name },
      );

      if (response.api_status !== 200) {
        throw new Error('Cập nhật nhóm thất bại');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (response.data ?? []).map((item: any) => mapGroupChatItem(item));
    },

    async leaveGroup(groupId: number) {
      const response = await apiBridge.post<{ api_status: number; message_data?: string }>(
        'group_chat',
        { type: 'leave', id: groupId },
      );

      if (response.api_status !== 200) {
        throw new Error('Rời nhóm thất bại');
      }
    },

    async addUsers(groupId: number, userIds: number[]) {
      const response = await apiBridge.post<{ api_status: number; message_data?: string }>(
        'group_chat',
        { type: 'add_user', id: groupId, parts: userIds.join(',') },
      );

      if (response.api_status !== 200) {
        throw new Error('Thêm thành viên thất bại');
      }
    },

    async removeUsers(groupId: number, userIds: number[]) {
      const response = await apiBridge.post<{ api_status: number; message_data?: string }>(
        'group_chat',
        { type: 'remove_user', id: groupId, parts: userIds.join(',') },
      );

      if (response.api_status !== 200) {
        throw new Error('Xóa thành viên thất bại');
      }
    },

    async searchAddableUsers(groupId: number, keyword = '', limit = 12) {
      const response = await apiBridge.post<GroupChatSearchUsersResponse>(
        'group_chat',
        { type: 'search_addable_users', id: groupId, keyword, limit },
      );

      if (response.api_status !== 200) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (response.data ?? []).map((item: any) => mapGroupChatUser(item));
    },

    async joinGroup(groupId: number) {
      const response = await apiBridge.post<{ api_status: number; message_data?: string }>(
        'group_chat',
        { type: 'join', id: groupId },
      );

      if (response.api_status !== 200) {
        throw new Error('Tham gia nhóm thất bại');
      }
    },

    async acceptGroup(groupId: number) {
      const response = await apiBridge.post<{ api_status: number; message_data?: string }>(
        'group_chat',
        { type: 'accept', group_id: groupId },
      );

      if (response.api_status !== 200) {
        throw new Error('Chấp nhận lời mời thất bại');
      }
    },

    async rejectGroup(groupId: number) {
      const response = await apiBridge.post<{ api_status: number; message_data?: string }>(
        'group_chat',
        { type: 'reject', group_id: groupId },
      );

      if (response.api_status !== 200) {
        throw new Error('Từ chối lời mời thất bại');
      }
    },

    async fetchMessages(groupId: number, options = {}) {
      const { limit = 20, before_message_id, after_message_id } = options;

      const params: Record<string, string | number> = {
        type: 'fetch_messages',
        id: groupId,
        limit,
      };

      if (before_message_id) params.before_message_id = before_message_id;
      if (after_message_id) params.after_message_id = after_message_id;

      const response = await apiBridge.post<GroupChatDetailResponse>(
        'group_chat',
        params,
      );

      if (response.api_status !== 200) {
        throw new Error('Tải tin nhắn thất bại');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mapGroupChatItem(response.data?.[0] ?? {});
    },

    async sendMessage(groupId: number, message) {
      const params: Record<string, string> = {
        type: 'send',
        id: String(groupId),
      };

      if (message.text) params.text = message.text;
      if (message.image_url) params.image_url = message.image_url;
      if (message.gif) params.gif = message.gif;
      if (message.lat) params.lat = String(message.lat);
      if (message.lng) params.lng = String(message.lng);

      const response = await apiBridge.post<GroupChatMessageResponse>(
        'group_chat',
        params,
      );

      if (response.api_status !== 200) {
        throw new Error('Gửi tin nhắn thất bại');
      }

      return response.data as GroupChatMessage[];
    },
  };
}
