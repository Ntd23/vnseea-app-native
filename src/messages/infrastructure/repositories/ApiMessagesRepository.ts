// Messages API Repository (Infrastructure)
// Based on WoWonder API - get_chats, get_user_messages, send-message

import CryptoJS from 'crypto-js';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { MessagesRepository } from '../../domain/repositories/MessagesRepository';
import type {
  ChatItem,
  ChatPreviewKind,
  CreateGroupChatInput,
  GetChatsResponse,
  GetChatsOptions,
  GetMessagesOptions,
  GetMessagesResponse,
  MessageAttachment,
  MessageCallEvent,
  MessageItem,
  SendMessageResponse,
} from '../../domain/types/messages.types';

type RawRecord = Record<string, unknown>;

type GroupChatResponse = {
  api_status: number;
  data?: unknown;
  message?: string;
  message_data?: unknown[];
};

const DISCOVERY_CACHE_TTL_MS = 2 * 60 * 1000;
const DISCOVERY_PAGE_SIZE = 100;
const MAX_DISCOVERY_CANDIDATES = 500;
const DISCOVERY_BATCH_SIZE = 12;
const CHAT_PAGE_SIZE = 50;
const MAX_CACHED_CHAT_PAGES = 5;

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

function asRecordArray(value: unknown): RawRecord[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is RawRecord =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  );
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

function decryptMessageText(value: string, time: number): string {
  if (!value) return '';

  const isBase64Cipher =
    value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
  if (!time || !isBase64Cipher) {
    return cleanText(value);
  }

  try {
    const cipherBytes = CryptoJS.enc.Base64.parse(value).sigBytes;
    if (cipherBytes === 0 || cipherBytes % 16 !== 0) {
      return cleanText(value);
    }

    const key = CryptoJS.enc.Utf8.parse(
      String(time).padEnd(16, '\0').slice(0, 16),
    );
    const decrypted = CryptoJS.AES.decrypt(value, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);

    return decrypted ? cleanText(decrypted) : 'Tin nhắn';
  } catch {
    return 'Tin nhắn';
  }
}

function parseCallEvent(
  value: string,
  sessionUserId: string,
): MessageCallEvent | undefined {
  if (!value.startsWith('{') || !value.endsWith('}')) return undefined;

  try {
    const payload = JSON.parse(value) as RawRecord;
    const callId = readString(payload, 'call_id');
    const initiatorId = readString(payload, 'initiator_id');
    const receiverId = readString(payload, 'receiver_id');

    if (!callId || !initiatorId || !receiverId) return undefined;

    return {
      callId,
      callType: readString(payload, 'call_type') === 'video' ? 'video' : 'audio',
      status: readString(payload, 'status') || 'calling',
      duration: readNumber(payload, 'duration'),
      initiatorId,
      receiverId,
      statusBy: readString(payload, 'status_by'),
      isInitiator: initiatorId === sessionUserId,
      isReceiver: receiverId === sessionUserId,
    };
  } catch {
    return undefined;
  }
}

type MessagePreview = {
  text: string;
  kind: ChatPreviewKind;
};

function readGroupUnreadCount(raw: Record<string, unknown>, chatId: string) {
  const explicitCount = readNumber(
    raw,
    'message_count',
    'unread',
    'messages_count',
  );
  if (explicitCount > 0 || !chatId) return explicitCount;

  const lastSeen = raw.last_seen;
  if (!Array.isArray(lastSeen)) return explicitCount;

  return lastSeen.some(value => String(value) === chatId) ? 1 : 0;
}

function getCallPreview(callEvent: MessageCallEvent): MessagePreview {
  return callEvent.callType === 'video'
    ? { text: 'Cuộc gọi video', kind: 'video_call' }
    : { text: 'Cuộc gọi thoại', kind: 'audio_call' };
}

function getMessagePreview(raw: Record<string, unknown>): MessagePreview {
  if (readNumber(raw, 'product_id') > 0 || asRecord(raw.product)) {
    return { text: 'Đã gửi một sản phẩm', kind: 'product' };
  }
  if (readString(raw, 'stickers', 'gif')) {
    return { text: 'Đã gửi một nhãn dán', kind: 'sticker' };
  }

  const media = readString(raw, 'media');
  if (media) {
    const mediaType = readMediaType(raw);
    if (mediaType === 'image') {
      return { text: 'Đã gửi một ảnh', kind: 'image' };
    }
    if (mediaType === 'video') {
      return { text: 'Đã gửi một video', kind: 'video' };
    }
    if (mediaType === 'audio') {
      return { text: 'Đã gửi một đoạn âm thanh', kind: 'audio' };
    }
    return { text: 'Đã gửi một tệp', kind: 'file' };
  }

  const plainText = readString(raw, 'or_text', 'message');
  const decryptedText = decryptMessageText(
    readString(raw, 'text'),
    readNumber(raw, 'time'),
  );
  const previewText = plainText ? cleanText(plainText) : decryptedText;
  const callEvent = parseCallEvent(
    previewText,
    sessionStorage.getSession()?.userId ?? '',
  );
  if (callEvent) return getCallPreview(callEvent);

  if (previewText) return { text: previewText, kind: 'text' };

  // WoWonder encrypts `last_message.text` in `/api/get_chats` with
  // AES-128-ECB. Do not leak the encoded payload into the conversation list.
  return {
    text: readString(raw, 'text') ? 'Tin nhắn mới' : '',
    kind: 'text',
  };
}

function mapChat(raw: Record<string, unknown>): ChatItem {
  const chatTypeValue = readString(raw, 'chat_type');
  const chatType: ChatItem['chatType'] =
    chatTypeValue === 'group' || chatTypeValue === 'page'
      ? chatTypeValue
      : 'user';
  const userData = asRecord(raw.user_data) ?? raw;
  const lastMessage = asRecord(raw.last_message) ?? {};
  const lastMessagePreview = getMessagePreview(lastMessage);
  const chatId =
    readString(raw, 'chat_id', 'id', 'group_id', 'page_id') ||
    readString(userData, 'user_id', 'id');
  const userId =
    chatType === 'group' || chatType === 'page'
      ? chatId
      : readString(userData, 'user_id', 'id');
  const username = readString(userData, 'username');
  const firstName = readString(userData, 'first_name');
  const lastName = readString(userData, 'last_name');
  const name =
    readString(raw, 'name', 'group_name', 'group_title', 'page_title') ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    username ||
    readString(userData, 'name') ||
    'Người dùng';
  return {
    id: `${chatType}:${chatId}`,
    chatType,
    userId,
    username,
    name,
    avatar:
      readString(raw, 'avatar') ||
      readString(userData, 'avatar', 'profile_picture'),
    lastMessage: lastMessagePreview.text,
    lastMessageKind: lastMessagePreview.kind,
    lastMessageTime:
      readNumber(raw, 'chat_time', 'time') || readNumber(lastMessage, 'time'),
    unreadCount:
      chatType === 'group'
        ? readGroupUnreadCount(raw, chatId)
        : readNumber(raw, 'message_count', 'unread', 'messages_count'),
    isOnline: readBool(userData, 'online'),
    isVerified: readBool(userData, 'verified'),
  };
}

async function fetchRawUserMessages(
  userId: string,
  options: GetMessagesOptions = {},
) {
  const response = await apiBridge.post<GetMessagesResponse>(
    apiRoutes.messages.messages,
    {
      recipient_id: userId,
      limit: options.limit ?? 20,
      before_message_id: options.beforeMessageId,
      after_message_id: options.afterMessageId,
    },
  );

  // Return messages along with typing/recording status
  return {
    messages: (response.messages ?? []) as RawRecord[],
    typing: response.typing,
    is_recording: response.is_recording,
  };
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

  return [...chats.values()].sort((left, right) => {
    const timeDifference = right.lastMessageTime - left.lastMessageTime;
    if (timeDifference !== 0) return timeDifference;

    return right.unreadCount - left.unreadCount;
  });
}

type CachedChatPageConfig = {
  dataType: 'users' | 'groups' | 'pages';
  chatType: ChatItem['chatType'];
  limitKey: 'user_limit' | 'group_limit' | 'page_limit';
  offsetKey: 'user_offset' | 'group_offset' | 'page_offset';
};

const CACHED_CHAT_PAGE_CONFIGS: CachedChatPageConfig[] = [
  {
    dataType: 'users',
    chatType: 'user',
    limitKey: 'user_limit',
    offsetKey: 'user_offset',
  },
  {
    dataType: 'groups',
    chatType: 'group',
    limitKey: 'group_limit',
    offsetKey: 'group_offset',
  },
  {
    dataType: 'pages',
    chatType: 'page',
    limitKey: 'page_limit',
    offsetKey: 'page_offset',
  },
];

async function fetchAdditionalCachedChats(
  config: CachedChatPageConfig,
  initialChats: ChatItem[],
) {
  let previousPage = initialChats.filter(
    chat => chat.chatType === config.chatType,
  );
  const chats: ChatItem[] = [];

  for (
    let page = 1;
    page < MAX_CACHED_CHAT_PAGES && previousPage.length === CHAT_PAGE_SIZE;
    page += 1
  ) {
    const offset = Math.min(
      ...previousPage.map(chat => chat.lastMessageTime).filter(Boolean),
    );
    if (!Number.isFinite(offset) || offset <= 0) break;

    const response = await apiBridge.post<GetChatsResponse>(
      apiRoutes.messages.chats,
      {
        data_type: config.dataType,
        [config.limitKey]: CHAT_PAGE_SIZE,
        [config.offsetKey]: offset,
      },
    );
    const nextPage = (response.data ?? [])
      .map(item => mapChat(item as RawRecord))
      .filter(chat => chat.chatType === config.chatType);

    if (nextPage.length === 0) break;

    chats.push(...nextPage);
    previousPage = nextPage;
  }

  return chats;
}

async function fetchCachedChats() {
  const response = await apiBridge.post<GetChatsResponse>(
    apiRoutes.messages.chats,
    {
      user_limit: CHAT_PAGE_SIZE,
      group_limit: CHAT_PAGE_SIZE,
      page_limit: CHAT_PAGE_SIZE,
    },
  );
  const initialChats = (response.data ?? []).map(item =>
    mapChat(item as RawRecord),
  );
  const additionalChats = await Promise.all(
    CACHED_CHAT_PAGE_CONFIGS.map(config =>
      fetchAdditionalCachedChats(config, initialChats),
    ),
  );

  return mergeChats(initialChats, ...additionalChats);
}

async function fetchLatestCachedChats() {
  const response = await apiBridge.post<GetChatsResponse>(
    apiRoutes.messages.chats,
    {
      user_limit: CHAT_PAGE_SIZE,
      group_limit: CHAT_PAGE_SIZE,
      page_limit: CHAT_PAGE_SIZE,
    },
  );

  return mergeChats(
    (response.data ?? []).map(item => mapChat(item as RawRecord)),
  );
}

async function fetchGroupChats() {
  let offset = 0;
  const chats: ChatItem[] = [];

  for (let page = 0; page < MAX_CACHED_CHAT_PAGES; page += 1) {
    const response = await apiBridge.post<GetChatsResponse>(
      apiRoutes.messages.groupChat,
      {
        type: 'get_list',
        limit: CHAT_PAGE_SIZE,
        offset,
      },
    );
    const nextPage = (response.data ?? [])
      .map(item =>
        mapChat({
          ...(item as RawRecord),
          chat_type: 'group',
        }),
      )
      .filter(chat => chat.chatType === 'group');

    if (nextPage.length === 0) break;

    chats.push(...nextPage);

    const nextOffset = Math.min(
      ...nextPage.map(chat => chat.lastMessageTime).filter(Boolean),
    );
    if (
      nextPage.length < CHAT_PAGE_SIZE ||
      !Number.isFinite(nextOffset) ||
      nextOffset <= 0 ||
      nextOffset === offset
    ) {
      break;
    }

    offset = nextOffset;
  }

  return mergeChats(chats);
}

async function createGroupChatRequest(input: CreateGroupChatInput) {
  const memberUserIds = [
    ...new Set(input.memberUserIds.map(id => id.trim()).filter(Boolean)),
  ];
  const response = await apiBridge.post<GroupChatResponse>(
    apiRoutes.messages.groupChat,
    {
      type: 'create',
      group_name: input.groupName.trim(),
      parts: memberUserIds.join(','),
      group_type: 'group',
    },
  );
  const group =
    asRecordArray(response.data)[0] ?? asRecord(response.data ?? undefined);

  if (!group) {
    throw new Error(response.message ?? 'Không tạo được nhóm chat.');
  }

  discoveryCache = undefined;

  return mapChat({
    ...group,
    chat_type: 'group',
  });
}

async function fetchRawGroupMessages(
  groupId: string,
  options: GetMessagesOptions = {},
) {
  const response = await apiBridge.post<GroupChatResponse>(
    apiRoutes.messages.groupChat,
    {
      type: 'fetch_messages',
      id: groupId,
      limit: options.limit ?? 20,
      before_message_id: options.beforeMessageId,
      after_message_id: options.afterMessageId,
    },
  );
  const groupData = asRecord(response.data);

  return {
    messages: asRecordArray(groupData?.messages),
    typing: 0,
    is_recording: 0,
  };
}

async function sendGroupMessageRequest(
  groupId: string,
  message: string,
  attachment?: MessageAttachment,
) {
  const payload = {
    type: 'send',
    id: groupId,
    text: message,
    message_hash_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
  const response = attachment
    ? await apiBridge.multipart<GroupChatResponse>(
        apiRoutes.messages.groupChat,
        {
          ...payload,
          ...(attachment.mediaType === 'audio' ? { message_type: 'audio' } : {}),
          file: attachment,
        },
      )
    : await apiBridge.post<GroupChatResponse>(
        apiRoutes.messages.groupChat,
        payload,
      );
  const dataMessages = asRecordArray(response.data);
  const sentRawMessages =
    dataMessages.length > 0 ? dataMessages : asRecordArray(response.message_data);

  discoveryCache = undefined;

  return {
    ...response,
    sentMessages: sentRawMessages.map(item => mapMessage(item)),
  };
}

async function fetchUnreadUserChats() {
  const response = await apiBridge.post<GetChatsResponse>(
    apiRoutes.messages.chats,
    {
      data_type: 'users',
      user_limit: CHAT_PAGE_SIZE,
    },
  );

  return (response.data ?? [])
    .map(item => mapChat(item as RawRecord))
    .filter(chat => chat.chatType === 'user' && chat.unreadCount > 0)
    .sort((left, right) => right.lastMessageTime - left.lastMessageTime);
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

        const result = await fetchRawUserMessages(userId, { limit: 1 }).catch(
          () => ({ messages: [], typing: 0, is_recording: 0 }),
        );
        const lastMessage = result.messages[0];
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
  const media = readString(raw, 'media', 'mediaFile');
  const message = decryptMessageText(
    readString(raw, 'text', 'message'),
    readNumber(raw, 'time'),
  );
  const callEvent = parseCallEvent(message, sessionUserId);
  const displayMessage =
    media && message === 'Tin nhắn' ? '' : message;

  return {
    id: readString(raw, 'id', 'message_id'),
    conversationId: readString(raw, 'conversation_id'),
    fromId,
    toId,
    message: callEvent ? '' : displayMessage,
    callEvent,
    media,
    mediaType: readMediaType(raw),
    time: readNumber(raw, 'time'),
    isSentByMe: fromId === sessionUserId,
    seen: readNumber(raw, 'seen'),
  };
}

function readMediaType(raw: Record<string, unknown>): 'image' | 'video' | 'audio' | 'file' | undefined {
  const explicitType = readString(
    raw,
    'type_two',
    'message_type',
    'mediaType',
  )
    .toLowerCase()
    .replace(/^(left|right)_/, '');
  const responseType = readString(raw, 'type')
    .toLowerCase()
    .replace(/^(left|right)_/, '');
  const media = readString(raw, 'extension', 'media', 'mediaFile').toLowerCase();

  // Android voice recordings are MPEG-4 containers (`.mp4`). WoWonder keeps
  // the semantic message kind in `type_two=audio`, so prefer it over the file
  // extension to avoid rendering a voice note as a video.
  if (explicitType === 'audio') return 'audio';
  if (explicitType === 'image') return 'image';
  if (explicitType === 'video') return 'video';
  if (responseType === 'audio') return 'audio';
  if (responseType === 'image') return 'image';
  if (responseType === 'video') return 'video';
  if (responseType === 'file') return 'file';
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(media)) return 'image';
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(media)) return 'audio';
  if (/\.(mp4|mov|avi|mkv)(\?|$)/i.test(media)) return 'video';

  return undefined;
}

export function createMessagesRepository(): MessagesRepository {
  return {
    async getChats(options?: GetChatsOptions) {
      const includeDiscovery = options?.includeDiscovery ?? true;
      const [cachedChats, discoveredChats] = await Promise.all([
        options?.latestOnly ? fetchLatestCachedChats() : fetchCachedChats(),
        includeDiscovery ? fetchDiscoveredUserChats().catch(() => []) : [],
      ]);
      return mergeChats(discoveredChats, cachedChats);
    },

    async getGroupChats() {
      return fetchGroupChats();
    },

    async createGroupChat(input: CreateGroupChatInput) {
      return createGroupChatRequest(input);
    },

    async getUnreadChats() {
      return fetchUnreadUserChats();
    },

    async getMessages(userId: string, options?: GetMessagesOptions) {
      const result = await fetchRawUserMessages(userId, options);
      return {
        messages: result.messages.map(item => mapMessage(item)),
        typing: result.typing ?? 0,
        is_recording: result.is_recording ?? 0,
      };
    },

    async getGroupMessages(groupId: string, options?: GetMessagesOptions) {
      const result = await fetchRawGroupMessages(groupId, options);
      return {
        messages: result.messages.map(item => mapMessage(item)),
        typing: result.typing,
        is_recording: result.is_recording,
      };
    },

    async sendMessage(
      toUserId: string,
      message: string,
      attachment?: MessageAttachment,
    ) {
      const payload = {
        user_id: toUserId,
        text: message,
        message_hash_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      };
      const response = attachment
        ? await apiBridge.multipart<SendMessageResponse>(
            apiRoutes.messages.send,
            {
              ...payload,
              ...(attachment.mediaType === 'audio'
                ? { message_type: 'audio' }
                : {}),
              file: attachment,
            },
          )
        : await apiBridge.post<SendMessageResponse>(
            apiRoutes.messages.send,
            payload,
          );

      discoveryCache = undefined;

      return {
        ...response,
        sentMessages: (response.message_data ?? []).map(item =>
          mapMessage(item as RawRecord),
        ),
      };
    },

    async sendGroupMessage(
      groupId: string,
      message: string,
      attachment?: MessageAttachment,
    ) {
      return sendGroupMessageRequest(groupId, message, attachment);
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
