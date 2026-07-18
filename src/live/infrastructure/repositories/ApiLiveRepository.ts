// Live API Repository (Infrastructure)
// Connects the mobile app to WoWonder API v2 live endpoints.

import axios from 'axios';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { CONTENT_AUDIENCE_CONTRACT } from '../../../shared-kernel/domain/types/contentAudience';
import { normalizeApiResponseData } from '../../../shared-kernel/application/api/apiResponse';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { LiveRepository } from '../../domain/repositories/LiveRepository';
import type {
  CreateLivePayload,
  LiveCommentsResult,
  LiveReactionEvent,
  LiveReactionType,
  LiveSession,
  LiveStreamComment,
  LiveStreamItem,
  LiveStreamState,
} from '../../domain/types/live.types';

type RawRecord = Record<string, unknown>;

type LiveListResponse = {
  api_status: number | string;
  data?: RawRecord[];
};

type LiveCreateResponse = {
  api_status: number | string;
  id?: number | string;
  post_id?: number | string;
  postId?: number | string;
  stream_name?: string;
  streamName?: string;
  provider?: string;
  room_name?: string;
  roomName?: string;
  ws_url?: string;
  wsUrl?: string;
  serverUrl?: string;
  token?: string;
  livekit_token?: string;
  livekitToken?: string;
  is_host?: boolean | number | string;
  isHost?: boolean | number | string;
  stream_state?: string;
  live_state?: string;
  data?: RawRecord;
  post_data?: RawRecord;
  status?: number | string;
};

type LiveSessionResponse = LiveCreateResponse | RawRecord[];

type LiveCheckCommentsResponse = {
  api_status: number | string;
  comments?: RawRecord[];
  count?: number | string;
  still_live?: string;
};

type LivePostReactionsResponse = {
  api_status: number | string;
  reactions?: RawRecord[];
  users?: RawRecord[];
};

type LivePostResponse = {
  api_status: number | string;
  post_data?: RawRecord;
};

type CommentCreateResponse = {
  api_status: number | string;
  data?: RawRecord;
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function readString(raw: RawRecord | undefined | null, ...keys: string[]) {
  if (!raw) return '';
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function readNumber(raw: RawRecord | undefined | null, ...keys: string[]) {
  if (!raw) return 0;
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

function readBool(raw: RawRecord | undefined | null, ...keys: string[]) {
  if (!raw) return false;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    if (value === '1' || value === 1 || value === 'true') return true;
    if (value === '0' || value === 0 || value === 'false') return false;
  }
  return false;
}

function toUrlEncodedPayload(data: RawRecord) {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  params.append('server_key', apiConfig.serverKey);
  return params.toString();
}

async function postLiveXHR(s: 'create' | 'join', data: RawRecord) {
  const accessToken = sessionStorage.getAccessToken();
  const sessionUserId = sessionStorage.getSession()?.userId;

  const url = `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/requests.php?f=live&s=${s}`;
  
  const bodyPayload: RawRecord = {
    ...data,
    user_id: sessionUserId,
    access_token: accessToken,
    s: accessToken,
  };

  const response = await axios.post<unknown>(
    url,
    toUrlEncodedPayload(bodyPayload),
    {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        ...(accessToken ? { Cookie: `user_session=${accessToken}` } : {}),
      },
      timeout: apiConfig.requestTimeoutMs,
      validateStatus: () => true,
    },
  );

  const normalized = normalizeApiResponseData(response.data);
  console.log(`[Live XHR] ${s} request result:`, {
    httpStatus: response.status,
    responseType: typeof normalized,
    isRecord: isRecord(normalized),
    rootKeys: Object.keys(getRootRecord(normalized)),
  });

  return normalized as LiveSessionResponse;
}

function readOptionalBool(raw: RawRecord | undefined | null, ...keys: string[]) {
  if (!raw) return undefined;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    if (value === '1' || value === 1 || value === 'true') return true;
    if (value === '0' || value === 0 || value === 'false') return false;
  }
  return undefined;
}

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function firstRecord(value: unknown): RawRecord | null {
  if (isRecord(value)) return value;
  if (Array.isArray(value)) {
    const record = value.find(isRecord);
    return record ?? null;
  }
  return null;
}

function getRootRecord(value: unknown): RawRecord {
  return firstRecord(value) ?? {};
}

function readRecord(raw: RawRecord | undefined | null, key: string) {
  return firstRecord(raw?.[key]);
}

function normalizeMediaUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteRoot}/${value.replace(/^\/+/, '')}`;
}

function cleanText(value: string) {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/@\[\d+\]/g, '')
    .replace(/#\[\d+\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const WIRE_TO_LIVE_REACTION: Record<string, LiveReactionType> = {
  '1': 'like',
  '2': 'love',
  '3': 'haha',
  '4': 'wow',
  '5': 'sad',
  '6': 'angry',
  like: 'like',
  love: 'love',
  haha: 'haha',
  wow: 'wow',
  sad: 'sad',
  angry: 'angry',
};

const LIVE_REACTION_EMOJI: Record<LiveReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

function readLiveReaction(raw: RawRecord): LiveReactionType | null {
  const value = readString(raw, 'reaction', 'reaction_type', 'type').trim();
  if (!value) return null;
  return WIRE_TO_LIVE_REACTION[value] ?? WIRE_TO_LIVE_REACTION[value.toLowerCase()] ?? null;
}

function mapLiveReactionEvent(raw: RawRecord): LiveReactionEvent | null {
  const reaction = readLiveReaction(raw);
  if (!reaction) return null;

  const publisher = mapPublisher(raw);
  const userId = publisher.id || readString(raw, 'id');
  const eventOwner = userId || publisher.username || publisher.name;

  return {
    id: `${eventOwner}:${reaction}`,
    userId,
    name: publisher.name,
    username: publisher.username,
    avatarUrl: publisher.avatarUrl,
    reaction,
    emoji: LIVE_REACTION_EMOJI[reaction],
  };
}

function countPostReactions(response: LivePostReactionsResponse) {
  return (response.reactions ?? []).reduce(
    (sum, item) => sum + readNumber(item, 'count'),
    0,
  );
}

async function fetchLiveReactionSnapshot(postId: number) {
  try {
    const response = await apiBridge.get<LivePostReactionsResponse>(
      apiRoutes.feed.postReactions,
      {
        post_id: postId,
        limit: 100,
        offset: 0,
      },
    );

    return {
      reactionEvents: (response.users ?? [])
        .map(mapLiveReactionEvent)
        .filter((item): item is LiveReactionEvent => Boolean(item)),
      reactionsCount: countPostReactions(response),
    };
  } catch (err) {
    console.log('[Live] reaction snapshot skipped:', err);
    return {
      reactionEvents: [] as LiveReactionEvent[],
      reactionsCount: undefined,
    };
  }
}

function getLiveState(raw: RawRecord): LiveStreamState {
  if (readBool(raw, 'live_ended')) return 'offline';

  const liveTime = readNumber(raw, 'live_time');
  if (liveTime <= 0) return 'stale';

  const age = Math.max(0, Math.floor(Date.now() / 1000) - liveTime);
  if (age <= 10) return 'live';
  if (age <= 45) return 'stale';
  return 'offline';
}

function readStateValue(value: string): LiveStreamState | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['live', 'online', 'running', 'started', '1'].includes(normalized)) {
    return 'live';
  }
  if (['offline', 'ended', 'deleted', '0'].includes(normalized)) {
    return 'offline';
  }
  if (['stale', 'waiting', 'pending'].includes(normalized)) {
    return 'stale';
  }
  return null;
}

function mapPublisher(raw: RawRecord | undefined | null) {
  const safe = raw ?? {};
  const firstName = readString(safe, 'first_name');
  const lastName = readString(safe, 'last_name');
  const username = readString(safe, 'username', 'user_name');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(safe, 'name', 'full_name') ||
    username ||
    'Người dùng';

  return {
    id: readString(safe, 'user_id', 'id'),
    name,
    username,
    avatarUrl: normalizeMediaUrl(readString(safe, 'avatar', 'profile_picture')),
  };
}

function readLiveViewerCount(raw: RawRecord) {
  return readNumber(
    raw,
    'live_sub_users',
    'liveSubUsers',
    'live_sub_user',
    'live_viewers',
    'liveViewers',
    'viewer_count',
    'viewerCount',
    'viewers_count',
    'watching_count',
    'live_count',
    'count',
    'views',
  );
}

function mapLivePost(raw: RawRecord): LiveStreamItem {
  const postId = readNumber(raw, 'id', 'post_id');
  const publisher = mapPublisher(
    (raw.publisher as RawRecord | undefined) ??
      (raw.user_data as RawRecord | undefined),
  );
  const text = cleanText(readString(raw, 'postText'));
  const [titleLine, ...descriptionLines] = text.split('\n').map(line => line.trim());
  const title =
    titleLine ||
    (publisher.name ? `${publisher.name} đang phát trực tiếp` : 'Đang phát trực tiếp');
  const description = descriptionLines.join('\n').trim();
  const thumbnailUrl = normalizeMediaUrl(readString(raw, 'postFileThumb', 'live_bg'));
  const startedAtSeconds = readNumber(raw, 'live_time') || readNumber(raw, 'time');

  return {
    id: String(postId),
    postId,
    streamName: readString(raw, 'stream_name', 'stream'),
    title,
    description,
    thumbnailUrl: thumbnailUrl || null,
    startedAt: startedAtSeconds
      ? new Date(startedAtSeconds * 1000).toISOString()
      : new Date().toISOString(),
    viewerCount: readLiveViewerCount(raw),
    state: getLiveState(raw),
    privacy: readString(raw, 'postPrivacy') || '0',
    publisher,
  };
}

function isUsableLivePost(raw: RawRecord) {
  const postType = readString(raw, 'postType').toLowerCase();
  const hasStream = readString(raw, 'stream_name', 'stream').length > 0;
  return postType === 'live' && hasStream && getLiveState(raw) !== 'offline';
}

function mapComment(raw: RawRecord): LiveStreamComment {
  const publisher = mapPublisher(raw.publisher as RawRecord | undefined);
  const timeValue = readString(raw, 'time_text') || readString(raw, 'time');
  const hostId = readString(raw, 'post_user_id', 'owner_id');

  return {
    id: readString(raw, 'id', 'comment_id') || String(Date.now()),
    author: publisher.name,
    username: publisher.username,
    avatarUrl: publisher.avatarUrl,
    message: cleanText(
      readString(raw, 'Orginaltext', 'original_text', 'text', 'message'),
    ),
    timeText: timeValue || 'Vừa xong',
    isHost: Boolean(hostId && hostId === publisher.id),
  };
}

function createStreamName() {
  const userId = sessionStorage.getSession()?.userId || '0';
  return `rn_live_${userId}_${Date.now()}`;
}

function getCreateLivePrivacy(value: string) {
  return value;
}

function uniqueLiveItems(items: LiveStreamItem[]) {
  const seen = new Set<number>();
  return items.filter(item => {
    if (!item.postId || seen.has(item.postId)) return false;
    seen.add(item.postId);
    return true;
  });
}

function collectLiveSessionCandidates(response: LiveSessionResponse) {
  const root: RawRecord = getRootRecord(response);
  const data: RawRecord = readRecord(root, 'data') ?? {};
  const postData: RawRecord = readRecord(root, 'post_data') ?? {};
  const sessionData: RawRecord =
    readRecord(root, 'session') ||
    readRecord(root, 'live_session') ||
    readRecord(root, 'livekit') ||
    readRecord(root, 'livekit_config') ||
    readRecord(root, 'livekit_session') ||
    readRecord(root, 'stream_session') ||
    readRecord(data, 'session') ||
    readRecord(data, 'live_session') ||
    readRecord(data, 'livekit') ||
    readRecord(data, 'livekit_config') ||
    readRecord(data, 'livekit_session') ||
    readRecord(data, 'stream_session') ||
    readRecord(postData, 'session') ||
    readRecord(postData, 'live_session') ||
    readRecord(postData, 'livekit') ||
    readRecord(postData, 'livekit_config') ||
    {};

  return [sessionData, data, postData, root];
}

function logLiveSessionSummary(source: string, response: LiveSessionResponse, session: LiveSession) {
  const root: RawRecord = getRootRecord(response);
  const data = readRecord(root, 'data');
  const postData = readRecord(root, 'post_data');

  console.log('[Live] session parsed:', {
    source,
    responseArrayLength: Array.isArray(response) ? response.length : undefined,
    postId: session.postId,
    streamName: session.streamName,
    provider: session.provider || '(missing)',
    roomName: session.roomName || '(missing)',
    hasWsUrl: Boolean(session.wsUrl),
    hasToken: Boolean(session.token),
    tokenLength: session.token.length,
    rootKeys: Object.keys(root),
    dataKeys: data ? Object.keys(data) : [],
    postDataKeys: postData ? Object.keys(postData) : [],
  });
}

function logLiveResponseEnvelope(source: string, response: LiveSessionResponse) {
  const root: RawRecord = getRootRecord(response);
  const data = readRecord(root, 'data');
  const postData = readRecord(root, 'post_data');
  const errors = readRecord(root, 'errors');

  console.log('[Live] response envelope:', {
    source,
    responseArrayLength: Array.isArray(response) ? response.length : undefined,
    apiStatus: readString(root, 'api_status', 'status') || '(missing)',
    message: readString(root, 'message') || readString(errors, 'error_text', 'message'),
    rootKeys: Object.keys(root),
    dataKeys: data ? Object.keys(data) : [],
    postDataKeys: postData ? Object.keys(postData) : [],
    errorKeys: errors ? Object.keys(errors) : [],
  });
}

function readLiveSession(
  response: LiveSessionResponse,
  fallback?: Partial<LiveSession>,
): LiveSession {
  const candidates = collectLiveSessionCandidates(response);
  let postId = fallback?.postId ?? 0;
  let streamName = fallback?.streamName ?? '';
  let provider = fallback?.provider ?? '';
  let roomName = fallback?.roomName ?? '';
  let wsUrl = fallback?.wsUrl ?? '';
  let token = fallback?.token ?? '';
  let isHost = fallback?.isHost ?? false;
  let state = fallback?.state ?? 'stale';

  for (const candidate of candidates) {
    postId = postId || readNumber(candidate, 'post_id', 'postId', 'id');
    streamName =
      streamName || readString(candidate, 'stream_name', 'streamName', 'stream');
    provider = provider || readString(candidate, 'provider', 'live_provider');
    roomName =
      roomName ||
      readString(candidate, 'room_name', 'roomName', 'room', 'channel_name');
    wsUrl =
      wsUrl ||
      readString(
        candidate,
        'ws_url',
        'wsUrl',
        'wss_url',
        'wssUrl',
        'server_url',
        'serverUrl',
        'livekit_ws_url',
        'livekitWsUrl',
        'livekit_server_url',
        'livekitServerUrl',
        'livekit_url',
        'url',
      );
    token =
      token ||
      readString(
        candidate,
        'token',
        'livekit_token',
        'livekitToken',
        'agora_token',
        'agoraToken',
        'rtc_token',
        'rtcToken',
        'stream_token',
        'streamToken',
        'live_token',
        'liveToken',
        'participant_token',
        'participantToken',
        'room_token',
        'roomToken',
        'jwt',
        'accessToken',
        'access_token',
      );

    const hostValue = readOptionalBool(candidate, 'is_host', 'isHost', 'host');
    if (hostValue !== undefined) {
      isHost = hostValue;
    }

    const stateValue = readStateValue(
      readString(candidate, 'stream_state', 'live_state', 'still_live'),
    );
    if (stateValue) {
      state = stateValue;
    }
  }

  return {
    postId,
    streamName,
    provider: provider || (wsUrl || token ? 'livekit' : ''),
    roomName: roomName || streamName,
    wsUrl: wsUrl || apiConfig.liveKitWsUrl,
    token,
    isHost,
    state,
  };
}

export function createLiveRepository(): LiveRepository {
  return {
    async getLiveStreams(): Promise<LiveStreamItem[]> {
      const sessionUserId = sessionStorage.getSession()?.userId;
      const requests = [
        apiBridge.post<LiveListResponse>(apiRoutes.feed.posts, {
          type: 'get_news_feed',
          limit: 30,
        }),
      ];

      if (sessionUserId) {
        requests.push(
          apiBridge.post<LiveListResponse>(apiRoutes.feed.posts, {
            type: 'get_user_posts',
            id: sessionUserId,
            limit: 30,
          }),
        );
      }

      const responses = await Promise.all(requests);
      const rawItems = responses.flatMap(response => response.data ?? []);

      return uniqueLiveItems(
        rawItems
          .filter(isUsableLivePost)
          .map(mapLivePost),
      );
    },

    async getLiveFriends(): Promise<LiveStreamItem[]> {
      const response = await apiBridge.get<LiveListResponse>(apiRoutes.live.friends);
      return uniqueLiveItems(
        (response.data ?? [])
          .filter(isUsableLivePost)
          .map(mapLivePost),
      );
    },

    async getLivePost(postId: number): Promise<LiveStreamItem | null> {
      const response = await apiBridge.post<LivePostResponse>(apiRoutes.feed.getPost, {


        post_id: postId,
        fetch: 'post_data',
      });
      const raw = response.post_data;
      if (!raw || !isUsableLivePost(raw)) return null;
      return mapLivePost(raw);
    },

    async getLiveViewerCounts(postIds: number[]): Promise<Record<number, number>> {
      const uniquePostIds = Array.from(
        new Set(postIds.filter(postId => Number.isFinite(postId) && postId > 0)),
      );
      if (uniquePostIds.length === 0) return {};

      const pairs = await Promise.all(
        uniquePostIds.map(async postId => {
          try {
            const response = await apiBridge.post<LivePostResponse>(
              apiRoutes.feed.getPost,
              {
                post_id: postId,
                fetch: 'post_data',
              },
            );
            return [postId, response.post_data ? readLiveViewerCount(response.post_data) : undefined] as const;
          } catch (err) {
            console.log('[Live] viewer count refresh skipped:', { postId, err });
            return [postId, undefined] as const;
          }
        }),
      );

      return pairs.reduce<Record<number, number>>((counts, [postId, count]) => {
        if (count !== undefined) {
          counts[postId] = count;
        }
        return counts;
      }, {});
    },

    async createLive(payload: CreateLivePayload): Promise<LiveSession> {
      const streamName = payload.streamName?.trim() || createStreamName();
      const response = await postLiveXHR('create', {
        stream_name: streamName,
        post_privacy: getCreateLivePrivacy(payload.privacy),
        privacy_contract: CONTENT_AUDIENCE_CONTRACT,
        title: payload.title,
        description: payload.description,
      });

      const root = getRootRecord(response);
      const postId = readNumber(root, 'post_id');
      if (!postId) {
        console.log('[Live] create response without post id:', response);
        throw new Error('Không tạo được live.');
      }

      const session = readLiveSession(response, {
        postId,
        streamName: readString(root, 'stream_name') || streamName,
        isHost: true,
        state: 'live',
      });
      logLiveSessionSummary('create', response, session);

      try {
        await apiBridge.post(apiRoutes.live.main, {
          type: 'check_comments',
          post_id: postId,
          page: 'live',
          limit: 1,
        });
      } catch (err) {
        console.log('[Live] create session check_comments heartbeat failed:', err);
      }

      return session;
    },

    async joinLive(postId: number, streamName?: string): Promise<LiveSession> {
      const response = await postLiveXHR('join', {
        post_id: postId,
        stream_name: streamName,
      });
      const root = getRootRecord(response);
      const session = readLiveSession(response, {
        postId,
        streamName: readString(root, 'stream_name') || streamName || '',
        isHost: false,
      });
      logLiveSessionSummary('join', response, session);
      if (session.wsUrl && session.token) {
        return session;
      }

      try {
        const postResponse = await apiBridge.post<LivePostResponse>(
          apiRoutes.feed.getPost,
          {
            post_id: postId,
            fetch: 'post_data',
          },
        );
        const postSession = readLiveSession(
          postResponse as LiveSessionResponse,
          session,
        );
        logLiveResponseEnvelope(
          'join_post_data_fallback',
          postResponse as LiveSessionResponse,
        );
        logLiveSessionSummary(
          'join_post_data_fallback',
          postResponse as LiveSessionResponse,
          postSession,
        );
        if (postSession.wsUrl && postSession.token) {
          return postSession;
        }
      } catch (err) {
        console.log('[Live] join post data fallback skipped:', err);
      }

      throw new Error('Khong lay duoc phien live.');
    },

    async endLive(postId: number): Promise<void> {
      await apiBridge.post(apiRoutes.live.main, {
        type: 'delete',
        post_id: postId,
      });
    },

    async getComments(
      postId: number,
      options?: { offset?: number; limit?: number; page?: 'live' | 'story' },
    ): Promise<LiveCommentsResult> {
      const [response, reactionSnapshot] = await Promise.all([
        apiBridge.post<LiveCheckCommentsResponse>(
          apiRoutes.live.main,
          {
            type: 'check_comments',
            post_id: postId,
            offset: options?.offset,
            limit: options?.limit ?? 20,
            page: options?.page ?? 'story',
          },
        ),
        options?.page === 'live'
          ? fetchLiveReactionSnapshot(postId)
          : Promise.resolve({
              reactionEvents: [] as LiveReactionEvent[],
              reactionsCount: undefined,
            }),
      ]);

      const state =
        response.still_live === 'live'
          ? 'live'
          : response.still_live === 'offline'
            ? 'offline'
            : 'stale';
      const liveCommentsReactionCount = readNumber(
        response as RawRecord,
        'reactions_count',
      );
      const reactionsCount =
        reactionSnapshot.reactionsCount !== undefined &&
        reactionSnapshot.reactionsCount > 0
          ? reactionSnapshot.reactionsCount
          : liveCommentsReactionCount;

      return {
        comments: (response.comments ?? []).map(mapComment).filter(item => item.message),
        viewerCount: readNumber(response as RawRecord, 'count'),
        state,
        reactionsCount,
        reactionEvents: reactionSnapshot.reactionEvents,
      };
    },

    async addComment(postId: number, text: string): Promise<LiveStreamComment> {
      const response = await apiBridge.post<CommentCreateResponse>(
        apiRoutes.feed.comments,
        {
          type: 'create',
          post_id: postId,
          text,
        },
      );
      if (!response.data) {
        throw new Error('Không gửi được bình luận.');
      }
      return mapComment(response.data);
    },

    async heartbeat(postId: number, page: 'live' | 'story' = 'story'): Promise<void> {
      await apiBridge.post(apiRoutes.live.main, {
        type: 'check_comments',
        post_id: postId,
        page,
        limit: 1,
      });
    },

    async uploadThumbnail(_postId: number, _thumbBase64: string): Promise<void> {
      // The v2 endpoint expects multipart field `thumb`, not base64. Keeping
      // this method as a no-op until the UI supplies a native file object.
    },
  };
}
