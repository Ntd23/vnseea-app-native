// Live API Repository (Infrastructure)
// Connects the mobile app to WoWonder API v2 live endpoints.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { LiveRepository } from '../../domain/repositories/LiveRepository';
import type {
  CreateLivePayload,
  LiveCommentsResult,
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
  data?: RawRecord;
  post_data?: RawRecord;
  status?: number | string;
};

type LiveCheckCommentsResponse = {
  api_status: number | string;
  comments?: RawRecord[];
  count?: number | string;
  still_live?: string;
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

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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

function getLiveState(raw: RawRecord): LiveStreamState {
  if (readBool(raw, 'live_ended')) return 'offline';

  const liveTime = readNumber(raw, 'live_time');
  if (liveTime <= 0) return 'stale';

  const age = Math.max(0, Math.floor(Date.now() / 1000) - liveTime);
  if (age <= 10) return 'live';
  if (age <= 45) return 'stale';
  return 'offline';
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
    viewerCount: readNumber(raw, 'live_count', 'watching_count', 'views'),
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
  // api/v2/endpoints/live.php checks `!empty($_POST['post_privacy'])`.
  // In PHP, empty('0') is true, so public privacy falls back to numeric 0
  // and crashes strict MySQL enum/string columns. Use friends privacy until
  // backend v2 handles public live correctly.
  return value === '0' ? '1' : value;
}

function uniqueLiveItems(items: LiveStreamItem[]) {
  const seen = new Set<number>();
  return items.filter(item => {
    if (!item.postId || seen.has(item.postId)) return false;
    seen.add(item.postId);
    return true;
  });
}

function readCreateResponse(response: LiveCreateResponse) {
  const root: RawRecord = isRecord(response) ? response : {};
  const postData: RawRecord = isRecord(root.post_data) ? root.post_data : {};
  const data: RawRecord = isRecord(root.data) ? root.data : {};
  const candidates = [postData, data, root];

  let postId = 0;
  let streamName = '';
  for (const candidate of candidates) {
    postId = postId || readNumber(candidate, 'id', 'post_id', 'postId');
    streamName = streamName || readString(candidate, 'stream_name', 'streamName');
  }

  return { postId, streamName };
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

    async createLive(payload: CreateLivePayload): Promise<{ postId: number; streamName: string }> {
      const streamName = payload.streamName?.trim() || createStreamName();
      const response = await apiBridge.post<LiveCreateResponse>(apiRoutes.live.main, {
        type: 'create',
        stream_name: streamName,
        post_privacy: getCreateLivePrivacy(payload.privacy),
        title: payload.title,
        description: payload.description,
      });

      const createdLive = readCreateResponse(response);
      const postId = createdLive.postId;
      if (!postId) {
        console.log('[Live] create response without post id:', response);
        throw new Error('Không tạo được live.');
      }

      await apiBridge.post(apiRoutes.live.main, {
        type: 'check_comments',
        post_id: postId,
        page: 'live',
        limit: 1,
      });

      return {
        postId,
        streamName: createdLive.streamName || streamName,
      };
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
      const response = await apiBridge.post<LiveCheckCommentsResponse>(
        apiRoutes.live.main,
        {
          type: 'check_comments',
          post_id: postId,
          offset: options?.offset,
          limit: options?.limit ?? 20,
          page: options?.page ?? 'story',
        },
      );

      const state =
        response.still_live === 'live'
          ? 'live'
          : response.still_live === 'offline'
            ? 'offline'
            : 'stale';

      return {
        comments: (response.comments ?? []).map(mapComment).filter(item => item.message),
        viewerCount: readNumber(response as RawRecord, 'count'),
        state,
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
