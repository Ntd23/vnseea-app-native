// Messages API Repository (Infrastructure)
// Based on WoWonder API - get_chats, get_user_messages, send-message

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { MessagesRepository } from '../../domain/repositories/MessagesRepository';
import type {
  ChatItem,
  GetChatsResponse,
  GetMessagesResponse,
  MessageItem,
  SendMessageResponse,
} from '../../domain/types/messages.types';

type RawRecord = Record<string, unknown>;

const DISCOVERY_CACHE_TTL_MS = 2 * 60 * 1000;
const DISCOVERY_PAGE_SIZE = 100;
const MAX_DISCOVERY_CANDIDATES = 500;
const DISCOVERY_BATCH_SIZE = 12;

let discoveryCache:
  | {
      sessionUserId: string;
      expiresAt: number;
      chats: ChatItem[];
    }
  | undefined;

function readString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function readBool(raw: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

function getMessagePreview(raw: Record<string, unknown>): string {
  if (raw.product_id || raw.product) return 'Đã gửi một sản phẩm';
  if (readString(raw, 'stickers', 'gif')) return 'Đã gửi một nhãn dán';

  const media = readString(raw, 'media');
  if (media) {
    const mediaType = readMediaType(raw);
    if (mediaType === 'image') return 'Đã gửi một ảnh';
    if (mediaType === 'video') return 'Đã gửi một video';
    if (mediaType === 'audio') return 'Đã gửi một đoạn âm thanh';
    return 'Đã gửi một tệp';
  }

  const plainText = readString(raw, 'or_text', 'message');
  if (plainText) return cleanText(plainText);

  // WoWonder encrypts `last_message.text` in `/api/get_chats` with
  // AES-128-ECB. Do not leak the encoded payload into the conversation list.
  return readString(raw, 'text') ? 'Tin nhắn mới' : '';
}

function mapChat(raw: Record<string, unknown>): ChatItem {
  const chatTypeValue = readString(raw, 'chat_type');
  const chatType: ChatItem['chatType'] =
    chatTypeValue === 'group' || chatTypeValue === 'page'
      ? chatTypeValue
      : 'user';
  const userData = asRecord(raw.user_data) ?? raw;
  const lastMessage = asRecord(raw.last_message) ?? {};
  const userId = readString(userData, 'user_id', 'id');
  const username = readString(userData, 'username');
  const firstName = readString(userData, 'first_name');
  const lastName = readString(userData, 'last_name');
  const name =
    readString(raw, 'name', 'group_name', 'group_title', 'page_title') ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    username ||
    readString(userData, 'name') ||
    'Người dùng';
  const chatId =
    readString(raw, 'chat_id', 'id', 'group_id', 'page_id') || userId;

  return {
    id: `${chatType}:${chatId}`,
    chatType,
    userId,
    username,
    name,
    avatar:
      readString(raw, 'avatar') ||
      readString(userData, 'avatar', 'profile_picture'),
    lastMessage: getMessagePreview(lastMessage),
    lastMessageTime:
      readNumber(raw, 'chat_time', 'time') || readNumber(lastMessage, 'time'),
    unreadCount: readNumber(raw, 'message_count', 'unread', 'messages_count'),
    isOnline: readBool(userData, 'online'),
    isVerified: readBool(userData, 'verified'),
  };
}

async function fetchRawUserMessages(userId: string, limit: number) {
  const response = await apiBridge.post<GetMessagesResponse>(
    apiRoutes.messages.messages,
    {
      recipient_id: userId,
      limit,
    },
  );

  return (response.messages ?? []) as RawRecord[];
}

function addCandidateUsers(
  candidates: Map<string, RawRecord>,
  users: RawRecord[] | undefined,
  sessionUserId: string,
) {
  for (const user of users ?? []) {
    const userId = readString(user, 'user_id', 'id');
    if (!userId || userId === sessionUserId || candidates.has(userId)) {
      continue;
    }

    candidates.set(userId, user);
  }
}

async function fetchSearchCandidates(
  candidates: Map<string, RawRecord>,
  sessionUserId: string,
) {
  type SearchResponse = {
    users?: RawRecord[];
  };

  let userOffset = 0;

  while (candidates.size < MAX_DISCOVERY_CANDIDATES) {
    const response = await apiBridge
      .post<SearchResponse>(apiRoutes.search.all, {
        limit: DISCOVERY_PAGE_SIZE,
        user_offset: userOffset,
      })
      .catch(() => ({} as SearchResponse));
    const users = response.users ?? [];

    addCandidateUsers(candidates, users, sessionUserId);

    const ids = users
      .map(user => readNumber(user, 'user_id', 'id'))
      .filter(id => id > 0);
    const nextOffset = ids.length > 0 ? Math.min(...ids) : 0;

    if (
      users.length < DISCOVERY_PAGE_SIZE ||
      nextOffset === 0 ||
      nextOffset === userOffset
    ) {
      break;
    }

    userOffset = nextOffset;
  }
}

function mergeChats(...chatLists: ChatItem[][]): ChatItem[] {
  const chats = new Map<string, ChatItem>();

  for (const chat of chatLists.flat()) {
    const key =
      chat.chatType === 'user' ? `${chat.chatType}:${chat.userId}` : chat.id;
    const current = chats.get(key);

    if (!current || chat.lastMessageTime >= current.lastMessageTime) {
      chats.set(key, chat);
    }
  }

  return [...chats.values()].sort(
    (left, right) => right.lastMessageTime - left.lastMessageTime,
  );
}

async function fetchDiscoveredUserChats(): Promise<ChatItem[]> {
  const sessionUserId = sessionStorage.getSession()?.userId;
  if (!sessionUserId) return [];

  if (
    discoveryCache?.sessionUserId === sessionUserId &&
    discoveryCache.expiresAt > Date.now()
  ) {
    return discoveryCache.chats;
  }

  type FriendsResponse = {
    data?: {
      following?: RawRecord[];
      followers?: RawRecord[];
    };
  };

  const searchCandidates = new Map<string, RawRecord>();
  const [friendsResponse] = await Promise.all([
    apiBridge
      .post<FriendsResponse>(apiRoutes.social.friends, {
        user_id: sessionUserId,
        type: 'following,followers',
        limit: 50,
      })
      .catch(() => ({} as FriendsResponse)),
    fetchSearchCandidates(searchCandidates, sessionUserId),
  ]);

  const candidates = new Map<string, RawRecord>();
  addCandidateUsers(candidates, friendsResponse.data?.following, sessionUserId);
  addCandidateUsers(candidates, friendsResponse.data?.followers, sessionUserId);
  addCandidateUsers(
    candidates,
    [...searchCandidates.values()],
    sessionUserId,
  );

  const chats: ChatItem[] = [];
  const candidateUsers = [...candidates.values()].slice(
    0,
    MAX_DISCOVERY_CANDIDATES,
  );

  for (
    let offset = 0;
    offset < candidateUsers.length;
    offset += DISCOVERY_BATCH_SIZE
  ) {
    const batch = candidateUsers.slice(offset, offset + DISCOVERY_BATCH_SIZE);
    const batchChats = await Promise.all(
      batch.map(async user => {
        const userId = readString(user, 'user_id', 'id');
        if (!userId) return null;

        const messages = await fetchRawUserMessages(userId, 1).catch(() => []);
        const lastMessage = messages[0];
        if (!lastMessage) return null;

        const isUnread =
          readString(lastMessage, 'to_id') === sessionUserId &&
          readNumber(lastMessage, 'seen') === 0;

        return mapChat({
          ...user,
          chat_type: 'user',
          chat_id: `fallback-${userId}`,
          chat_time: readNumber(lastMessage, 'time'),
          last_message: lastMessage,
          message_count: isUnread ? 1 : 0,
        });
      }),
    );

    chats.push(...batchChats.filter((chat): chat is ChatItem => chat !== null));
  }

  const discoveredChats = mergeChats(chats);
  discoveryCache = {
    sessionUserId,
    expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS,
    chats: discoveredChats,
  };

  return discoveredChats;
}

function mapMessage(raw: Record<string, unknown>): MessageItem {
  const fromId = String(raw.from_id ?? raw.fromId ?? '');
  const toId = String(raw.to_id ?? raw.toId ?? '');
  const sessionUserId = sessionStorage.getSession()?.userId ?? '';

  return {
    id: readString(raw, 'id', 'message_id'),
    conversationId: readString(raw, 'conversation_id'),
    fromId,
    toId,
    message: readString(raw, 'text', 'message'),
    media: readString(raw, 'media', 'mediaFile'),
    mediaType: readMediaType(raw),
    time: readNumber(raw, 'time'),
    isSentByMe: fromId === sessionUserId,
    seen: readNumber(raw, 'seen'),
  };
}

function readMediaType(raw: Record<string, unknown>): 'image' | 'video' | 'audio' | 'file' | undefined {
  const type = readString(raw, 'mediaType', 'type').toLowerCase();
  const media = readString(raw, 'extension', 'media', 'mediaFile').toLowerCase();

  if (type.includes('image') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(media)) return 'image';
  if (type.includes('video') || /\.(mp4|mov|avi|mkv)(\?|$)/i.test(media)) return 'video';
  if (type.includes('audio') || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(media)) return 'audio';

  return undefined;
}

export function createMessagesRepository(): MessagesRepository {
  return {
    async getChats() {
      const response = await apiBridge.post<GetChatsResponse>(
        apiRoutes.messages.chats,
        {
          user_limit: 50,
          group_limit: 50,
          page_limit: 50,
        },
      );

      const chats = (response.data ?? []).map(item =>
        mapChat(item as RawRecord),
      );
      const userChatCount = chats.filter(chat => chat.chatType === 'user').length;

      if (userChatCount >= 50) {
        return chats;
      }

      const discoveredChats = await fetchDiscoveredUserChats().catch(() => []);
      return mergeChats(discoveredChats, chats);
    },

    async getMessages(userId: string) {
      const messages = await fetchRawUserMessages(userId, 50);
      return messages.map(item => mapMessage(item));
    },

    async sendMessage(toUserId: string, message: string) {
      const response = await apiBridge.post<SendMessageResponse>(
        apiRoutes.messages.send,
        {
          user_id: toUserId,
          text: message,
          message_hash_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
      );

      return response;
    },

    async deleteConversation(userId: string) {
      await apiBridge.post(
        apiRoutes.messages.delete,
        { user_id: userId },
      );
    },

    async markAsSeen(_userId: string) {
      await apiBridge.post(
        apiRoutes.messages.read,
      );
    },
  };
}
