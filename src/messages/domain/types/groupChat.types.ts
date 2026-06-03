// Description: Group chat types for VNSEEA app
// English description: Defines group chat item types from the WoWonder group_chat API.

export interface GroupChatUser {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  cover: string;
}

export interface GroupChatPart {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  last_seen: number;
  active: number;
}

export interface GroupChatMessage {
  id: number;
  from_id: number;
  group_id: number;
  text: string;
  media: string;
  mediaFileName: string;
  time: number;
  time_text: string;
  position: 'left' | 'right';
  type: string;
  stickers: string;
  seen: number;
  reply_id: number;
  lng: number;
  lat: number;
  user_data: GroupChatUser;
  messageUser?: GroupChatUser;
  reply?: GroupChatMessage;
}

export interface GroupChatItem {
  id: number;
  user_id: number;
  group_name: string;
  avatar: string;
  type: 'group' | 'channel' | 'secret';
  parts: GroupChatPart[];
  last_message?: {
    id: number;
    text: string;
    from_id: number;
    time: number;
    user_data: GroupChatUser;
  };
  mute: {
    notify: string;
    call_chat: string;
    archive: string;
    fav: string;
    pin: string;
  };
  messages?: GroupChatMessage[];
}

export interface GroupChatListResponse {
  api_status: number;
  data: GroupChatItem[];
}

export interface GroupChatCreateResponse {
  api_status: number;
  data: GroupChatItem[];
  message_data?: string;
}

export interface GroupChatDetailResponse {
  api_status: number;
  data: GroupChatItem[];
}

export interface GroupChatMessageResponse {
  api_status: number;
  data: GroupChatMessage | GroupChatMessage[];
}

export interface GroupChatSearchUsersResponse {
  api_status: number;
  data: GroupChatUser[];
}

export interface CreateGroupChatPayload {
  groupName: string;
  parts: number[]; // user IDs
  groupType?: 'group' | 'channel' | 'secret';
  avatar?: {
    uri: string;
    name: string;
    type: string;
  };
}

export type GroupChatType = 'group' | 'channel' | 'secret';

export const GROUP_CHAT_TYPE_LABELS: Record<GroupChatType, string> = {
  group: 'Nhóm',
  channel: 'Kênh',
  secret: 'Bí mật',
};