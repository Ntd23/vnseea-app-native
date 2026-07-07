// Description: Implements the Messages API repository through the WoWonder mobile API bridge.
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
  GroupAddableUser,
  GroupChatInfo,
  GroupChatMember,
  GroupSharedAssets,
  LabelRecipient,
  MessageAttachment,
  MessageCallEvent,
  MessageItem,
  MessageLabel,
  SendMessageResponse,
} from '../../domain/types/messages.types';
type RawRecord = Record<string, unknown>;
type ChatTarget =
  | {
      type: 'user' | 'page';
      id: string;
    }
  | {
      type: 'group';
      id: string;
    };
const DISCOVERY_CACHE_TTL_MS = 2 * 60 * 1000;
const DISCOVERY_PAGE_SIZE = 100;
const MAX_DISCOVERY_CANDIDATES = 500;
const DISCOVERY_BATCH_SIZE = 12;
const CHAT_PAGE_SIZE = 50;
const MAX_CACHED_CHAT_PAGES = 5;
const RECALLED_MESSAGE_PREFIX = '__VNSEEA_MESSAGE_RECALLED__';
const GROUP_VOICE_MESSAGE_MARKER = '\u200b\u200c\u200d\u2060';
let discoveryCache:
  | {
      sessionUserId: string;
      expiresAt: number;
      chats: ChatItem[];
    }
  | undefined;
let followingCache:
  | {
      sessionUserId: string;
      expiresAt: number;
      followingIds: Set<string>;
      followerIds: Set<string>;
    }
  | undefined;
const FOLLOWING_CACHE_TTL_MS = 60 * 1000; // 60s cache
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
function readUserOnline(raw: Record<string, unknown>): boolean {
  const onlineValue = raw.online ?? raw.is_online ?? raw.isOnline;
  if (
    onlineValue === true ||
    onlineValue === 'true' ||
    onlineValue === '1' ||
    onlineValue === 1
  ) {
    return true;
  }

  const status = readString(
    raw,
    'lastseen_status',
    'last_seen_status',
    'online_status',
  ).toLowerCase();
  if (status === 'online' || status === 'on') return true;
  if (status === 'offline' || status === 'off') return false;

  const lastseenText = readString(raw, 'lastseen').toLowerCase();
  if (lastseenText === 'online' || lastseenText === 'on') return true;
  if (lastseenText === 'offline' || lastseenText === 'off') return false;

  const lastseen = readNumber(
    raw,
    'lastseen',
    'last_seen',
    'lastseen_unix_time',
    'last_seen_unix_time',
  );
  return lastseen > 0 && lastseen > Math.floor(Date.now() / 1000) - 60;
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
    .replace(/&#34;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .trim();
}
function stripGroupVoiceMessageMarker(value: string): string {
  return value.replace(GROUP_VOICE_MESSAGE_MARKER, '').trim();
}
function isRecalledMessageText(value: string): boolean {
  return cleanText(value).startsWith(RECALLED_MESSAGE_PREFIX);
}
function normalizeMessageText(value: string, hasMedia: boolean): string {
  const text = stripGroupVoiceMessageMarker(cleanText(value));
  if (!text) return '';
  if (isRecalledMessageText(text)) {
    return hasMedia ? '' : 'Tin nhắn đã thu hồi';
  }
  return text;
}
function readMessageMedia(raw: Record<string, unknown>): string {
  return readString(
    raw,
    'media',
    'mediaFile',
    'media_file',
    'mediaUrl',
    'media_url',
    'file_url',
    'file',
    'uri',
    'url',
  );
}
function readMessageThumbnail(raw: Record<string, unknown>): string {
  return readString(
    raw,
    'thumbnail',
    'thumb',
    'poster',
    'video_thumb',
    'videoThumb',
    'postFileThumb',
    'media_thumb',
    'mediaThumb',
  );
}
function getJsonTextCandidates(value: string): string[] {
  const candidates = new Set<string>();
  const addCandidate = (nextValue: string) => {
    const text = cleanText(nextValue).trim();
    if (!text) return;
    candidates.add(text);
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      candidates.add(text.slice(firstBrace, lastBrace + 1));
    }
    if (text.includes('\\"')) {
      addCandidate(text.replace(/\\"/g, '"'));
    }
  };
  addCandidate(value);
  for (const candidate of [...candidates]) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (typeof parsed === 'string') {
        addCandidate(parsed);
      } else if (parsed && typeof parsed === 'object') {
        candidates.add(JSON.stringify(parsed));
      }
    } catch {
      // Non-JSON chat text should stay as normal message content.
    }
  }
  return [...candidates];
}
function getChatTarget(chat: ChatItem | string): ChatTarget {
  if (typeof chat === 'string') {
    return { type: 'user', id: chat };
  }
  if (chat.chatType === 'group') {
    return {
      type: 'group',
      id:
        chat.groupId ||
        chat.chatId ||
        chat.userId ||
        chat.id.replace(/^group:/, ''),
    };
  }
  return {
    type: chat.chatType === 'page' ? 'page' : 'user',
    id: chat.participantId || chat.userId || chat.chatId || '',
  };
}
function getRawUserName(raw: RawRecord): string {
  const firstName = readString(raw, 'first_name');
  const lastName = readString(raw, 'last_name');
  return (
    readString(raw, 'name') ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(raw, 'username') ||
    'Người dùng'
  );
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
  for (const candidate of getJsonTextCandidates(value)) {
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
      continue;
    }
    try {
      const event = parseCallEventRecord(
        JSON.parse(candidate) as unknown,
        sessionUserId,
      );
      if (event) return event;
    } catch {
      // Keep trying other normalized candidates before treating as text.
    }
  }
  return undefined;
}
function parseCallEventRecord(
  value: unknown,
  sessionUserId: string,
): MessageCallEvent | undefined {
  const payload = asRecord(value);
  if (!payload) return undefined;
  const callId = readString(payload, 'call_id', 'callId');
  const initiatorId = readString(payload, 'initiator_id', 'initiatorId');
  const receiverId = readString(payload, 'receiver_id', 'receiverId');
  const groupId = readString(payload, 'group_id', 'groupId');
  const action = readString(payload, 'action');
  if (!callId || !initiatorId || (!receiverId && !groupId)) return undefined;
  return {
    callId,
    callType:
      readString(payload, 'call_type', 'callType') === 'video'
        ? 'video'
        : 'audio',
    status: readString(payload, 'status', 'call_status') || action || 'calling',
    duration: readNumber(payload, 'duration'),
    initiatorId,
    receiverId: receiverId || groupId,
    statusBy: readString(payload, 'status_by', 'statusBy'),
    isInitiator: initiatorId === sessionUserId,
    isReceiver: receiverId === sessionUserId,
    isGroupCall: Boolean(groupId),
    groupId,
    action,
  };
}
type MessagePreview = {
  text: string;
  kind: ChatPreviewKind;
};

const WEB_URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:\/[^\s<>"']*)?/i;

function hasWebUrl(value: string): boolean {
  return WEB_URL_PATTERN.test(value);
}

function getCallPreview(callEvent: MessageCallEvent): MessagePreview {
  if (callEvent.isGroupCall) {
    return callEvent.callType === 'video'
      ? { text: 'Cuộc gọi video nhóm', kind: 'video_call' }
      : { text: 'Cuộc gọi thoại nhóm', kind: 'audio_call' };
  }
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
  const media = readMessageMedia(raw);
  const plainText = readString(raw, 'or_text');
  const decryptedText = decryptMessageText(
    readString(raw, 'text'),
    readNumber(raw, 'time'),
  );
  const messageText = plainText ? plainText : decryptedText;
  if (media) {
    const mediaType = readMediaType(raw, messageText);
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
  const previewText = normalizeMessageText(
    messageText,
    false,
  );
  const sessionUserId = sessionStorage.getSession()?.userId ?? '';
  const callEvent =
    parseCallEventRecord(raw.call_event ?? raw.callEvent, sessionUserId) ??
    parseCallEvent(previewText, sessionUserId);
  if (callEvent) return getCallPreview(callEvent);
  if (previewText) {
    return {
      text: previewText,
      kind: hasWebUrl(previewText) ? 'link' : 'text',
    };
  }
  // WoWonder encrypts `last_message.text` in `/api/get_chats` with
  // AES-128-ECB. Do not leak the encoded payload into the conversation list.
  return {
    text: readString(raw, 'text') ? 'Tin nhắn mới' : '',
    kind: 'text',
  };
}
function readGroupUnreadCount(raw: RawRecord, groupId: string): number {
  const directCount = readNumber(
    raw,
    'message_count',
    'unread',
    'unread_count',
    'messages_count',
  );
  if (directCount > 0) return directCount;

  const unreadByGroup = asRecord(raw.unread_by_group);
  const groupedCount = groupId && unreadByGroup ? readNumber(unreadByGroup, groupId) : 0;
  if (groupedCount > 0) return groupedCount;

  const unreadGroupIds = Array.isArray(raw.last_seen)
    ? raw.last_seen.map(value => String(value))
    : [];
  return groupId && unreadGroupIds.includes(String(groupId)) ? 1 : 0;
}

function readGroupOnline(raw: RawRecord): boolean {
  const sessionUserId = sessionStorage.getSession()?.userId ?? '';
  const parts = Array.isArray(raw.parts) ? raw.parts : [];

  return parts.some(part => {
    const member = asRecord(part);
    if (!member) return false;
    const memberId = readString(member, 'user_id', 'id');
    if (!memberId || memberId === sessionUserId) return false;
    return readUserOnline(member);
  });
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
  const userId = readString(userData, 'user_id', 'id');
  const groupId = readString(raw, 'group_id', 'chat_id', 'id');
  const pageId = readString(raw, 'page_id', 'chat_id', 'id');
  const participantId =
    chatType === 'group'
      ? undefined
      : chatType === 'page'
      ? pageId || userId
      : userId;
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
    readString(raw, 'chat_id', 'id', 'group_id', 'page_id') ||
    participantId ||
    groupId;
  const targetId =
    chatType === 'group' ? groupId || chatId : participantId || chatId;
  const lastMessageTime =
    readNumber(lastMessage, 'time') ||
    readNumber(raw, 'last_message_time', 'time', 'chat_time', 'last_time');
  const paginationCursorTime =
    readNumber(
      raw,
      'pagination_cursor_time',
      'cursor_time',
      'chat_time',
      'last_time',
    ) || lastMessageTime;
  return {
    id: `${chatType}:${chatId}`,
    chatId,
    chatType,
    participantId,
    groupId: chatType === 'group' ? targetId : undefined,
    userId: targetId,
    username,
    name,
    avatar:
      readString(raw, 'avatar') ||
      readString(userData, 'avatar', 'profile_picture'),
    lastMessage: lastMessagePreview.text,
    lastMessageKind: lastMessagePreview.kind,
    lastMessageTime: lastMessageTime || paginationCursorTime,
    paginationCursorTime: paginationCursorTime || lastMessageTime,
    unreadCount:
      chatType === 'group'
        ? readGroupUnreadCount(raw, chatId)
        : readNumber(raw, 'message_count', 'unread', 'messages_count'),
    isOnline:
      chatType === 'group'
        ? readGroupOnline(raw)
        : readUserOnline(userData),
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
  return (response.messages ?? []) as RawRecord[];
}
async function fetchRawGroupMessages(
  groupId: string,
  options: GetMessagesOptions = {},
) {
  type GroupMessagesResponse = {
    data?: RawRecord & {
      messages?: RawRecord[];
    };
  };
  const response = await apiBridge.post<GroupMessagesResponse>(
    apiRoutes.messages.groupChat,
    {
      type: 'fetch_messages',
      id: groupId,
      limit: options.limit ?? 20,
      before_message_id: options.beforeMessageId,
      after_message_id: options.afterMessageId,
    },
  );
  return (response.data?.messages ?? []) as RawRecord[];
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
    if (!current) {
      chats.set(key, chat);
    } else if (chat.lastMessageTime >= current.lastMessageTime) {
      chats.set(key, chat);
    } else {
      chats.set(key, {
        ...current,
        isOnline: chat.isOnline,
      });
    }
  }
  return [...chats.values()].sort(
    (left, right) => right.lastMessageTime - left.lastMessageTime,
  );
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
      ...previousPage
        .map(chat => chat.paginationCursorTime ?? chat.lastMessageTime)
        .filter(Boolean),
    );
    if (!Number.isFinite(offset) || offset <= 0) break;
    const response = await apiBridge.post<GetChatsResponse>(
      apiRoutes.messages.chats,
      {
        SetOnline: 1,
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
      SetOnline: 1,
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
      SetOnline: 1,
      user_limit: 20,
      group_limit: 20,
      page_limit: 20,
    },
  );
  return (response.data ?? []).map(item => mapChat(item as RawRecord));
}

async function fetchGroupChats() {
  const response = await apiBridge.post<{
    data?: unknown[];
    groups?: unknown[];
  }>(apiRoutes.messages.groupChat, {
    type: 'get_list',
    limit: 50,
  });
  const rawGroups = response.data ?? response.groups ?? [];
  return rawGroups
    .map(item => ({
      ...(asRecord(item) ?? {}),
      chat_type: 'group',
    }))
    .map(mapChat)
    .filter(chat => chat.groupId || chat.userId);
}

async function createGroupChatRequest(input: CreateGroupChatInput) {
  const response = await apiBridge.post<{
    data?: unknown[] | RawRecord;
    group?: RawRecord;
    id?: string | number;
    group_id?: string | number;
  }>(apiRoutes.messages.groupChat, {
    type: 'create',
    group_name: input.groupName,
    parts: input.memberUserIds.join(','),
  });
  const rawGroup =
    (Array.isArray(response.data)
      ? asRecord(response.data[0])
      : asRecord(response.data)) ??
    response.group ??
    ({
      group_id: response.group_id ?? response.id,
      group_name: input.groupName,
    } as RawRecord);
  return mapChat({
    ...rawGroup,
    chat_type: 'group',
  });
}

async function fetchUnreadUserChats() {
  const response = await apiBridge.post<GetChatsResponse>(
    apiRoutes.messages.chats,
    {
      SetOnline: 1,
      data_type: 'users',
      user_limit: CHAT_PAGE_SIZE,
    },
  );
  return (response.data ?? [])
    .map(item => mapChat(item as RawRecord))
    .filter(chat => chat.chatType === 'user' && chat.unreadCount > 0)
    .sort((left, right) => right.lastMessageTime - left.lastMessageTime);
}

async function fetchUnreadChats() {
  const [userChats, groupChats] = await Promise.all([
    fetchUnreadUserChats(),
    fetchGroupChats().catch(() => []),
  ]);

  return mergeChats(
    userChats,
    groupChats.filter(chat => chat.unreadCount > 0),
  );
}

async function fetchFriendsList(forceRefresh = false): Promise<{ following: Set<string>; followers: Set<string> }> {
  const sessionUserId = sessionStorage.getSession()?.userId;
  if (!sessionUserId) return { following: new Set(), followers: new Set() };
  if (
    !forceRefresh &&
    followingCache?.sessionUserId === sessionUserId &&
    followingCache.expiresAt > Date.now()
  ) {
    return {
      following: followingCache.followingIds,
      followers: followingCache.followerIds,
    };
  }
  type FriendsResponse = {
    data?: {
      following?: RawRecord[];
      followers?: RawRecord[];
    };
  };
  try {
    const response = await apiBridge.post<FriendsResponse>(
      apiRoutes.social.friends,
      {
        user_id: sessionUserId,
        type: 'following,followers',
        limit: 500,
      },
    );
    const followingList = response.data?.following ?? [];
    const followersList = response.data?.followers ?? [];
    const following = new Set<string>();
    const followers = new Set<string>();
    for (const user of followingList) {
      const id = readString(user, 'user_id', 'id');
      if (id && id !== sessionUserId) following.add(id);
    }
    for (const user of followersList) {
      const id = readString(user, 'user_id', 'id');
      if (id && id !== sessionUserId) followers.add(id);
    }
    followingCache = {
      sessionUserId,
      expiresAt: Date.now() + FOLLOWING_CACHE_TTL_MS,
      followingIds: following,
      followerIds: followers,
    };
    return { following, followers };
  } catch {
    return {
      following: followingCache?.followingIds ?? new Set(),
      followers: followingCache?.followerIds ?? new Set(),
    };
  }
}
async function fetchFollowingUserIds(forceRefresh = false): Promise<Set<string>> {
  const res = await fetchFriendsList(forceRefresh);
  return res.following;
}
async function fetchFollowerUserIds(forceRefresh = false): Promise<Set<string>> {
  const res = await fetchFriendsList(forceRefresh);
  return res.followers;
}
async function fetchDiscoveredUserChats(forceRefresh?: boolean): Promise<ChatItem[]> {
  const sessionUserId = sessionStorage.getSession()?.userId;
  if (!sessionUserId) return [];
  if (
    !forceRefresh &&
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

  try {
    const friendsResponse = await apiBridge
      .post<FriendsResponse>(apiRoutes.social.friends, {
        user_id: sessionUserId,
        type: 'following,followers',
        limit: 500,
      })
      .catch(() => ({} as FriendsResponse));

    const followingUserIds = new Set<string>();
    const followerUserIds = new Set<string>();
    const candidates = new Map<string, RawRecord>();

    const followingList = friendsResponse.data?.following ?? [];
    const followersList = friendsResponse.data?.followers ?? [];

    for (const user of followingList) {
      const id = readString(user, 'user_id', 'id');
      if (id && id !== sessionUserId) {
        followingUserIds.add(id);
        candidates.set(id, user);
      }
    }

    for (const user of followersList) {
      const id = readString(user, 'user_id', 'id');
      if (id && id !== sessionUserId) {
        followerUserIds.add(id);
        if (!candidates.has(id)) {
          candidates.set(id, user);
        }
      }
    }

    // Update the friends cache (followingCache) so other queries can use it
    followingCache = {
      sessionUserId,
      expiresAt: Date.now() + FOLLOWING_CACHE_TTL_MS,
      followingIds: followingUserIds,
      followerIds: followerUserIds,
    };

    const chats: ChatItem[] = [];
    for (const user of candidates.values()) {
      const userId = readString(user, 'user_id', 'id');
      if (!userId) continue;

      chats.push(
        mapChat({
          ...user,
          chat_type: 'user',
          chat_id: userId,
          chat_time: 0,
          last_message: undefined,
          message_count: 0,
        })
      );
    }

    const discoveredChats = mergeChats(chats);
    discoveryCache = {
      sessionUserId,
      expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS,
      chats: discoveredChats,
    };
    return discoveredChats;
  } catch (err) {
    console.error('fetchDiscoveredUserChats error:', err);
    return [];
  }
}
function mapMessage(raw: Record<string, unknown>): MessageItem {
  const fromId = String(raw.from_id ?? raw.fromId ?? '');
  const toId = String(raw.to_id ?? raw.toId ?? '');
  const sessionUserId = sessionStorage.getSession()?.userId ?? '';
  const media = readMessageMedia(raw);
  const rawText = readString(raw, 'or_text');
  const decodedMessage = rawText
    ? rawText
    : decryptMessageText(
        readString(raw, 'text', 'message'),
        readNumber(raw, 'time'),
      );
  const message = normalizeMessageText(decodedMessage, Boolean(media));
  const callEvent =
    parseCallEventRecord(raw.call_event ?? raw.callEvent, sessionUserId) ??
    parseCallEvent(message, sessionUserId);
  const displayMessage = media && message === 'Tin nhắn' ? '' : message;
  return {
    id: readString(raw, 'id', 'message_id'),
    conversationId: readString(raw, 'conversation_id', 'group_id'),
    fromId,
    toId,
    message: callEvent ? '' : displayMessage,
    callEvent,
    media,
    mediaType: readMediaType(raw, decodedMessage),
    thumbnail: readMessageThumbnail(raw) || undefined,
    time: readNumber(raw, 'time'),
    isSentByMe: callEvent ? callEvent.isInitiator : (fromId === sessionUserId),
    seen: readNumber(raw, 'seen'),
  };
}
function mapGroupMember(raw: RawRecord, ownerId: string): GroupChatMember {
  const userId = readString(raw, 'user_id', 'id');
  return {
    id: userId,
    name: getRawUserName(raw),
    username: readString(raw, 'username'),
    avatar: readString(raw, 'avatar', 'profile_picture'),
    isOwner: userId === ownerId,
    isAdmin: readBool(raw, 'is_admin') || userId === ownerId,
    isOnline: readUserOnline(raw),
  };
}
function mapAddableUser(raw: RawRecord): GroupAddableUser {
  return {
    id: readString(raw, 'user_id', 'id'),
    name: getRawUserName(raw),
    username: readString(raw, 'username'),
    avatar: readString(raw, 'avatar', 'profile_picture'),
    isOnline: readUserOnline(raw),
  };
}

function mapMessageLabel(raw: RawRecord): MessageLabel {
  return {
    id: readString(raw, 'id', 'label_id', 'tag_id'),
    name: readString(raw, 'name', 'label_name') || 'Label',
    color: readString(raw, 'color', 'label_color') || '#3B82F6',
  };
}

function mapLabelRecipient(raw: RawRecord): LabelRecipient {
  const label = mapMessageLabel(raw);
  const userId = readString(raw, 'target_user_id', 'user_id', 'id');
  return {
    userId,
    name: getRawUserName(raw),
    username: readString(raw, 'username'),
    avatar: readString(raw, 'avatar', 'profile_picture'),
    labels: label.id ? [label] : [],
  };
}

function mergeLabelRecipients(recipients: LabelRecipient[]) {
  const byUserId = new Map<string, LabelRecipient>();

  for (const recipient of recipients) {
    if (!recipient.userId) continue;
    const current = byUserId.get(recipient.userId);
    if (!current) {
      byUserId.set(recipient.userId, recipient);
      continue;
    }

    const labels = new Map(current.labels.map(label => [label.id, label]));
    for (const label of recipient.labels) {
      if (label.id) labels.set(label.id, label);
    }
    byUserId.set(recipient.userId, {
      ...current,
      name: current.name || recipient.name,
      username: current.username || recipient.username,
      avatar: current.avatar || recipient.avatar,
      labels: [...labels.values()],
    });
  }

  return [...byUserId.values()];
}
function mapGroupInfo(raw: RawRecord): GroupChatInfo {
  const group = Array.isArray(raw.data) ? asRecord(raw.data[0]) ?? {} : raw;
  const parts = Array.isArray(group.parts) ? (group.parts as RawRecord[]) : [];
  const ownerId = readString(group, 'user_id', 'owner_id');
  const sessionUserId = sessionStorage.getSession()?.userId ?? '';
  const members = parts.map(part =>
    mapGroupMember(asRecord(part) ?? {}, ownerId),
  );
  return {
    id: readString(group, 'group_id', 'id', 'chat_id'),
    name: readString(group, 'group_name', 'name') || 'Nhóm',
    avatar: readString(group, 'avatar'),
    ownerId,
    type: readString(group, 'type') || 'group',
    memberCount:
      readNumber(group, 'members_count', 'parts_count') || members.length,
    isOwner: ownerId === sessionUserId,
    members,
  };
}
function mapSharedAssets(raw: RawRecord): GroupSharedAssets {
  const media = Array.isArray(raw.media) ? raw.media : [];
  const files = Array.isArray(raw.files) ? raw.files : [];
  const links = Array.isArray(raw.links) ? raw.links : [];
  return {
    media: media
      .map(item => asRecord(item) ?? {})
      .map(item => ({
        id: readString(item, 'id'),
        uri: readString(item, 'uri', 'media'),
        mediaType:
          readString(item, 'media_type') === 'video'
            ? ('video' as const)
            : ('image' as const),
        time: readNumber(item, 'time'),
      }))
      .filter(item => item.id && item.uri),
    files: files
      .map(item => asRecord(item) ?? {})
      .map(item => ({
        id: readString(item, 'id'),
        uri: readString(item, 'uri', 'media'),
        name: readString(item, 'name') || 'Tệp đính kèm',
        time: readNumber(item, 'time'),
      }))
      .filter(item => item.id && item.uri),
    links: links
      .map(item => asRecord(item) ?? {})
      .map(item => ({
        id: readString(item, 'id'),
        url: readString(item, 'url'),
        title: readString(item, 'title') || readString(item, 'url'),
        time: readNumber(item, 'time'),
      }))
      .filter(item => item.id && item.url),
  };
}
function readMediaType(
  raw: Record<string, unknown>,
  decodedMessage = '',
): 'image' | 'video' | 'audio' | 'file' | undefined {
  const explicitType = readString(
    raw,
    'type_two',
    'message_type',
    'media_type',
    'mediaType',
  )
    .toLowerCase()
    .replace(/^(left|right)_/, '');
  const responseType = readString(raw, 'type')
    .toLowerCase()
    .replace(/^(left|right)_/, '');
  const originalMediaName = readString(
    raw,
    'mediaFileName',
    'media_file_name',
    'file_name',
    'filename',
    'name',
  ).toLowerCase();
  const media = readString(
    raw,
    'extension',
    'media',
    'mediaFile',
    'media_file',
    'mediaUrl',
    'media_url',
    'file_url',
    'file',
    'uri',
    'url',
    'mediaFileName',
    'file_name',
    'filename',
    'name',
  ).toLowerCase();
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
  if (decodedMessage.includes(GROUP_VOICE_MESSAGE_MARKER)) {
    return 'audio';
  }
  if (/^(voice|audio|recording|record)[-_ ]/.test(originalMediaName)) {
    return 'audio';
  }
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(media)) return 'image';
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(media)) return 'audio';
  if (/\.(mp4|mov|avi|mkv)(\?|$)/i.test(media)) return 'video';
  return undefined;
}

type TagsApiResponse = {
  status?: number | string;
  message?: string;
  data?: unknown[];
  labels?: unknown[];
  tags?: unknown[];
  user_ids?: unknown[];
};

function assertTagsResponse(response: TagsApiResponse) {
  const status = String(response.status ?? '200');
  if (status !== '200') {
    throw new Error(response.message || 'Khong xu ly duoc nhan tin nhan');
  }
}

export function createMessagesRepository(): MessagesRepository {
  return {
    async getChats(options?: GetChatsOptions) {
      const includeDiscovery = options?.includeDiscovery ?? true;
      const [cachedChats, discoveredChats] = await Promise.all([
        options?.latestOnly ? fetchLatestCachedChats() : fetchCachedChats(),
        includeDiscovery ? fetchDiscoveredUserChats(options?.forceRefresh).catch(() => []) : [],
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
      return fetchUnreadChats();
    },
    async getMessages(chat: ChatItem | string, options?: GetMessagesOptions) {
      const target = getChatTarget(chat);
      const messages =
        target.type === 'group'
          ? await fetchRawGroupMessages(target.id, options)
          : await fetchRawUserMessages(target.id, options);
      return messages.map(item => mapMessage(item));
    },
    async sendGroupMessage(
      groupId: string,
      message: string,
      attachment?: MessageAttachment,
    ) {
      return this.sendMessage(
        {
          id: `group:${groupId}`,
          chatId: groupId,
          chatType: 'group',
          groupId,
          userId: groupId,
          username: '',
          name: '',
          avatar: '',
          lastMessage: '',
          lastMessageTime: 0,
          unreadCount: 0,
          isOnline: false,
          isVerified: false,
        },
        message,
        attachment,
      );
    },
    async sendMessage(
      chat: ChatItem | string,
      message: string,
      attachment?: MessageAttachment,
    ) {
      const target = getChatTarget(chat);
      const messageHashId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const textPayload =
        target.type === 'group' && attachment?.mediaType === 'audio'
          ? [message, GROUP_VOICE_MESSAGE_MARKER].filter(Boolean).join('\n')
          : message;
      const userPayload = {
        user_id: target.id,
        text: textPayload,
        message_hash_id: messageHashId,
      };
      const groupPayload = {
        type: 'send',
        id: target.id,
        text: textPayload,
        message_hash_id: messageHashId,
      };
      const route =
        target.type === 'group'
          ? apiRoutes.messages.groupChat
          : apiRoutes.messages.send;
      const payload = target.type === 'group' ? groupPayload : userPayload;
      const response = attachment
        ? await apiBridge.multipart<SendMessageResponse>(route, {
            ...payload,
            ...(attachment.mediaType
              ? {
                  message_type: attachment.mediaType,
                  media_type: attachment.mediaType,
                  type_two: attachment.mediaType,
                }
              : {}),
            file: attachment,
          })
        : await apiBridge.post<SendMessageResponse>(route, payload);
      discoveryCache = undefined;
      const rawSentMessages =
        response.message_data ?? (response as { data?: unknown[] }).data ?? [];
      return {
        ...response,
        sentMessages: rawSentMessages.map(item =>
          mapMessage(item as RawRecord),
        ),
      };
    },
    async deleteConversation(userId: string) {
      await apiBridge.post(apiRoutes.messages.delete, { user_id: userId });
    },
    async markAsSeen(userId: string) {
      await apiBridge.post(apiRoutes.messages.read, { recipient_id: userId });
    },
    async getGroupInfo(groupId: string) {
      const response = await apiBridge.post<{ data?: unknown[] }>(
        apiRoutes.messages.groupChat,
        {
          type: 'get_by_id',
          id: groupId,
        },
      );
      return mapGroupInfo({ data: response.data ?? [] });
    },
    async searchAddableUsers(groupId: string, keyword = '') {
      const response = await apiBridge.post<{ data?: unknown[] }>(
        apiRoutes.messages.groupChat,
        {
          type: 'search_addable_users',
          id: groupId,
          keyword,
          limit: 25,
        },
      );
      return (response.data ?? [])
        .map(item => mapAddableUser(item as RawRecord))
        .filter(item => item.id);
    },
    async addGroupUsers(groupId: string, userIds: string[]) {
      await apiBridge.post(apiRoutes.messages.groupChat, {
        type: 'add_user',
        id: groupId,
        parts: userIds.join(','),
      });
    },
    async removeGroupUser(groupId: string, userId: string) {
      await apiBridge.post(apiRoutes.messages.groupChat, {
        type: 'remove_user',
        id: groupId,
        parts: userId,
      });
    },
    async clearGroupHistory(groupId: string) {
      await apiBridge.post(apiRoutes.messages.groupChat, {
        type: 'clear_history',
        id: groupId,
      });
    },
    async leaveGroup(groupId: string) {
      await apiBridge.post(apiRoutes.messages.groupChat, {
        type: 'leave',
        id: groupId,
      });
    },
    async deleteGroup(groupId: string) {
      await apiBridge.post(apiRoutes.messages.groupChat, {
        type: 'delete',
        id: groupId,
      });
    },
    async editGroup(groupId: string, input) {
      const payload = {
        type: 'edit',
        id: groupId,
        group_name: input.name,
      };
      const response = input.avatar
        ? await apiBridge.multipart<{ data?: unknown[] }>(
            apiRoutes.messages.groupChat,
            { ...payload, avatar: input.avatar },
          )
        : await apiBridge.post<{ data?: unknown[] }>(
            apiRoutes.messages.groupChat,
            payload,
          );
      return mapGroupInfo({ data: response.data ?? [] });
    },
    async getGroupSharedAssets(groupId: string) {
      const response = await apiBridge.post<any>(
        apiRoutes.messages.groupChat,
        {
          type: 'shared_assets',
          id: groupId,
        },
      );
      const rawData = response?.data || response;
      return mapSharedAssets(rawData as unknown as RawRecord);
    },

    async listLabels() {
      const response = await apiBridge.post<TagsApiResponse>(
        apiRoutes.messages.labels,
        {
          s: 'list_labels',
        },
      );
      assertTagsResponse(response);
      return (response.labels ?? response.data ?? [])
        .map(item => mapMessageLabel(asRecord(item) ?? {}))
        .filter(label => label.id);
    },

    async createLabel(name: string, color: string) {
      const response = await apiBridge.post<TagsApiResponse>(
        apiRoutes.messages.labels,
        {
          s: 'create_label',
          label_name: name,
          label_color: color,
        },
      );
      assertTagsResponse(response);
    },

    async deleteLabel(labelId: string) {
      const response = await apiBridge.post<TagsApiResponse>(
        apiRoutes.messages.labels,
        {
          s: 'delete_label',
          label_id: labelId,
        },
      );
      assertTagsResponse(response);
    },

    async listTargetLabels(userId: string) {
      const response = await apiBridge.post<TagsApiResponse>(
        apiRoutes.messages.labels,
        {
          s: 'list_target_tags',
          target_user_id: userId,
        },
      );
      assertTagsResponse(response);
      return (response.tags ?? response.labels ?? response.data ?? [])
        .map(item => mapMessageLabel(asRecord(item) ?? {}))
        .filter(label => label.id);
    },

    async attachLabel(userId: string, labelId: string) {
      const response = await apiBridge.post<TagsApiResponse>(
        apiRoutes.messages.labels,
        {
          s: 'attach_label',
          target_user_id: userId,
          label_id: labelId,
        },
      );
      assertTagsResponse(response);
    },

    async detachLabel(userId: string, labelId: string) {
      const response = await apiBridge.post<TagsApiResponse>(
        apiRoutes.messages.labels,
        {
          s: 'detach',
          target_user_id: userId,
          label_id: labelId,
        },
      );
      assertTagsResponse(response);
    },

    async getFollowingUserIds(forceRefresh?: boolean) {
      return fetchFollowingUserIds(forceRefresh);
    },

    async getFollowerUserIds(forceRefresh?: boolean) {
      return fetchFollowerUserIds(forceRefresh);
    },

    async getUsersByLabel(labelId: string) {
      const response = await apiBridge.post<TagsApiResponse>(
        apiRoutes.messages.labels,
        {
          s: 'selected_tags',
          tag_id: labelId,
        },
      );
      assertTagsResponse(response);
      return mergeLabelRecipients(
        (response.data ?? []).map(item =>
          mapLabelRecipient(asRecord(item) ?? {}),
        ),
      );
    },
  };
}
