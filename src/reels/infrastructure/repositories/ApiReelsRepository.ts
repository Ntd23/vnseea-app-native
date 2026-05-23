// Description: Implements the reels repository using the shared backend API.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  FetchReelsOptions,
  ReelsRepository,
} from '../../domain/repositories/ReelsRepository';
import type {
  ReelCaptionSuggestion,
  ReelCaptionSuggestionKind,
  ReelComment,
  ReelDraft,
  ReelPublisher,
  ReelUploadResult,
  ReelsItem,
  ReelsPage,
} from '../../domain/types/reels.types';

type NewPostResponse = {
  api_status: number | string;
  post_data?: {
    id?: string | number;
    postFile?: string;
    [key: string]: unknown;
  };
  message?: string;
  code?: string;
  // ffmpeg async path returns { status: number, message: string }
  status?: number;
};

type SearchResponse = {
  api_status: number | string;
  users?: Array<Record<string, unknown>>;
};

type UserSuggestionsResponse = {
  api_status: number | string;
  suggestions?: Array<Record<string, unknown>>;
};

type HashtagSuggestionsResponse = {
  api_status: number | string;
  hashtags?: Array<Record<string, unknown>>;
};

type HashtagPostsResponse = {
  api_status: number | string;
  data?: Array<Record<string, unknown>>;
};

// ────────────────────────────────────────────────────────────────────────
// Mapping helpers — turn raw WoWonder JSON into clean domain objects.
// ────────────────────────────────────────────────────────────────────────

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

function mapPublisher(raw: Record<string, unknown> | undefined | null): ReelPublisher {
  const safe = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const userId = readString(safe, 'user_id', 'id');
  const username = readString(safe, 'username', 'user_name');
  const firstName = readString(safe, 'first_name');
  const lastName = readString(safe, 'last_name');
  const fullName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(safe, 'name', 'full_name') ||
    username;

  return {
    userId,
    username,
    name: fullName,
    avatarUrl: readString(safe, 'avatar', 'profile_picture') || undefined,
    isVerified: readBool(safe, 'verified'),
    isFollowing: readBool(safe, 'is_following', 'following') || undefined,
  };
}

/**
 * Strip HTML tags, common HTML entities, and WoWonder mention/hashtag
 * markup from a raw `postText` value.
 *
 * WoWonder's rich-text editor wraps post bodies in HTML (<b>, <span>,
 * <br>, etc.) and the API returns that markup verbatim.  We need to
 * scrub it before displaying in a native Text element.
 *
 * Additionally, WoWonder encodes @mentions as `@[userId]` and hashtags
 * as `#[hashtagId]`.  Neither the readable name nor the tag text is
 * preserved in the markup, so we drop the whole token.
 */
function cleanCaption(raw: string): string {
  if (!raw) return '';
  return raw
    // 1. Strip all HTML tags (<b>, </b>, <br/>, <span class="...">, …)
    .replace(/<[^>]*>/g, '')
    // 2. Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code)),
    )
    // 3. Strip WoWonder mention/hashtag tokens (@[123], #[123])
    .replace(/@\[\d+\]/g, '')
    .replace(/#\[\d+\]/g, '')
    // 4. Collapse whitespace left by stripped tags
    .replace(/\s+/g, ' ')
    .trim();
}

function mapReel(raw: Record<string, unknown>): ReelsItem {
  const publisherRaw =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    undefined;

  return {
    id: readString(raw, 'id', 'post_id'),
    videoUrl: readString(raw, 'postFile') || undefined,
    thumbnailUrl: readString(raw, 'postFileThumb') || undefined,
    caption: cleanCaption(readString(raw, 'postText')) || undefined,
    privacy: readNumber(raw, 'postPrivacy'),
    postedAt: readNumber(raw, 'time') || undefined,
    publisher: mapPublisher(publisherRaw),
    likeCount: readNumber(raw, 'postLikes', 'likes', 'likeCount'),
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    viewCount: readNumber(raw, 'videoViews'),
    isLiked: readBool(raw, 'isLiked', 'postReacted'),
    isSaved: readBool(raw, 'isSaved'),
  };
}

function mapComment(raw: Record<string, unknown>): ReelComment {
  const publisherRaw =
    (raw.publisher as Record<string, unknown> | undefined) ?? undefined;
  return {
    id: readString(raw, 'id', 'comment_id'),
    text: cleanCaption(readString(raw, 'text', 'comment_text')),
    postedAt: readNumber(raw, 'time') || undefined,
    publisher: mapPublisher(publisherRaw),
    likeCount: readNumber(raw, 'comment_likes', 'likes', 'likeCount'),
    replyCount: readNumber(raw, 'replies', 'replies_count', 'replyCount'),
    isLiked: readBool(raw, 'is_comment_liked', 'isLiked'),
    owner: readBool(raw, 'onwer', 'owner'),
    postOwner: readBool(raw, 'post_onwer', 'postOwner'),
  };
}

function toStringValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function mapMention(raw: Record<string, unknown>): ReelCaptionSuggestion | null {
  const username = toStringValue(raw.username);
  if (!username) {
    return null;
  }

  const label =
    toStringValue(raw.name) ||
    toStringValue(raw.full_name) ||
    username;

  return {
    id: toStringValue(raw.user_id) || toStringValue(raw.id) || username,
    kind: 'mention',
    label,
    value: `@${label}`,
    backendValue: `@${username}`,
    avatarUrl: toStringValue(raw.avatar) || toStringValue(raw.profile_picture),
  };
}

function mapHashtag(raw: Record<string, unknown>): ReelCaptionSuggestion | null {
  const tag = toStringValue(raw.tag) || toStringValue(raw.label);
  if (!tag) {
    return null;
  }

  const normalizedTag = tag.replace(/^#/, '');
  const useCount = Number(raw.trend_use_num ?? raw.use_count);

  return {
    id: toStringValue(raw.id) || normalizedTag,
    kind: 'hashtag',
    label: `#${normalizedTag}`,
    value: `#${normalizedTag}`,
    subtitle: Number.isFinite(useCount) && useCount > 0
      ? `${useCount} bài viết`
      : undefined,
    useCount: Number.isFinite(useCount) ? useCount : undefined,
  };
}

function buildExactHashtagSuggestion(tag: string): ReelCaptionSuggestion {
  const normalizedTag = tag.trim().replace(/^#/, '');

  return {
    id: normalizedTag,
    kind: 'hashtag',
    label: `#${normalizedTag}`,
    value: `#${normalizedTag}`,
  };
}

async function findExactHashtagFallback(
  normalizedQuery: string,
): Promise<ReelCaptionSuggestion[]> {
  if (!normalizedQuery) {
    return [];
  }

  const response = await backendApi.post<HashtagPostsResponse>(
    apiRoutes.feed.posts,
    {
      type: 'hashtag',
      hash: normalizedQuery,
      limit: 1,
    },
  );

  return response.data?.length ? [buildExactHashtagSuggestion(normalizedQuery)] : [];
}

async function fetchReelsPage(options: FetchReelsOptions = {}): Promise<ReelsPage> {
  const limit = options.limit ?? 10;
  const cursor = options.cursor ?? null;

  // ── Endpoint selection ────────────────────────────────────────────────
  // The v2 /api/posts endpoint has TWO problems we have to design around
  // without touching PHP:
  //
  //   1. `get_news_feed` applies a "follower filter" — only posts from
  //      accounts the user follows (plus the user's own) make it back.
  //      Whether the filter fires depends on the site's
  //      $wo['config']['order_posts_by'] setting, so behaviour is
  //      unpredictable across environments.
  //
  //   2. `Wo_GetPosts` always appends `AND is_reel = 0` to the SQL unless
  //      the `is_reel` key is in the data array — and posts.php doesn't
  //      forward that param. So reels uploaded via the dedicated web
  //      Reels feature (is_reel=1) are SQL-filtered out and we have no
  //      way to retrieve them.
  //
  // To guarantee SOMETHING shows up, we default to `get_user_posts` with
  // the current logged-in user id. This branch has no follower filter and
  // returns the user's own uploads (which use is_reel=0 with
  // postType='reel' — passing the SQL filter). If an explicit publisherId
  // was passed in we honor it, otherwise we look the id up in MMKV.
  const sessionUserId = sessionStorage.getSession()?.userId;
  const targetUserId = options.publisherId ?? sessionUserId;

  const payload: Record<string, unknown> = {
    post_type: 'video',
    limit,
  };

  if (targetUserId) {
    payload.type = 'get_user_posts';
    payload.id = targetUserId;
  } else {
    // No session id available — fall back to news feed (mostly useful for
    // anonymous / logged-out browsing).
    payload.type = 'get_news_feed';
  }

  if (cursor) payload.after_post_id = cursor;

  const response = await backendApi.post<{
    api_status: number | string;
    data?: Array<Record<string, unknown>>;
  }>(apiRoutes.feed.posts, payload);

  const rawList = response.data ?? [];

  // Backend constraint we work around: Wo_GetPosts defaults to filtering
  // out reels (`is_reel=0`) and posts.php doesn't expose an opt-in for the
  // `is_reel` param. Without touching PHP, what comes back here is the set
  // of *non-reel* video posts. That's still good enough for a "Reels"
  // feed because:
  //   • Any uploaded video file becomes a vertical playable card
  //   • The user's own uploads (from CreateReelScreen) come through since
  //     v2 new_post.php doesn't flip `is_reel=1` either
  //   • YouTube/Vimeo embeds get dropped below because they have no postFile
  //
  // So we keep the filter simple: anything with a playable `postFile` URL
  // is shown. The `postType==='reel'` check is intentionally NOT enforced
  // here — that would empty the feed on installations where reels aren't
  // tagged via postType.
  const items = rawList
    .filter(raw => Boolean(readString(raw, 'postFile')))
    .map(mapReel)
    .filter(item => Boolean(item.videoUrl));

  let nextCursor: string | null = null;
  if (rawList.length >= limit) {
    const minRawId = rawList
      .map(raw => Number(readString(raw, 'id', 'post_id')))
      .filter(n => Number.isFinite(n) && n > 0)
      .reduce((min, n) => (min === 0 || n < min ? n : min), 0);
    nextCursor = minRawId > 0 ? String(minRawId) : null;
  }

  return { items, nextCursor };
}

export function createReelsRepository(): ReelsRepository {
  return {
    async createReel(draft: ReelDraft): Promise<ReelUploadResult> {
      // backendApi.multipart accepts a plain object and builds FormData internally.
      // Files are passed as { uri, name, type } matching BackendFile shape.
      const payload: Record<string, unknown> = {
        postVideo: {
          uri: draft.videoUri,
          type: draft.videoType,
          name: draft.videoName,
        },
        postPrivacy: String(draft.privacy ?? 0),
        postType: 'reel',
      };

      if (draft.thumbnailUri) {
        payload.video_thumb = {
          uri: draft.thumbnailUri,
          type: 'image/jpeg',
          name: draft.thumbnailUri.split('/').pop() ?? 'thumb.jpg',
        };
      }

      if (draft.caption) {
        payload.postText = draft.caption;
      }

      const response = await backendApi.multipart<NewPostResponse>(
        apiRoutes.reels.create,
        payload,
      );

      // ffmpeg async path: { status: 200, message: "Your video is in process" }
      if (
        response.status === 200 &&
        typeof response.message === 'string' &&
        !response.api_status
      ) {
        return { status: 'processing', message: response.message };
      }

      // Admin review pending
      if (
        response.api_status === 200 &&
        response.code === 'review' &&
        typeof response.message === 'string'
      ) {
        return { status: 'review', message: response.message };
      }

      // Normal success
      if (
        response.api_status === 200 &&
        response.post_data
      ) {
        return {
          status: 'created',
          postId: String(response.post_data.id ?? ''),
          postFileUrl: String(response.post_data.postFile ?? ''),
        };
      }

      throw new Error('Đăng video thất bại. Vui lòng thử lại.');
    },

    fetchReels: fetchReelsPage,

    async getReels(): Promise<ReelsItem[]> {
      const page = await fetchReelsPage({ limit: 10 });
      return page.items;
    },

    async toggleLike(postId: string) {
      const response = await backendApi.post<{
        api_status: number | string;
        action?: string;
        like_data?: { count?: number | string };
      }>(apiRoutes.feed.postActions, { post_id: postId, action: 'like' });

      const isLiked = response.action === 'liked';
      const rawCount = response.like_data?.count;
      const likeCount =
        typeof rawCount === 'number'
          ? rawCount
          : Number(rawCount ?? 0) || 0;

      return { isLiked, likeCount };
    },

    async toggleSave(postId: string) {
      const response = await backendApi.post<{
        api_status: number | string;
        action?: string;
        code?: number;
      }>(apiRoutes.feed.postActions, { post_id: postId, action: 'save' });
      // action is 'saved post' or 'unsaved post'
      const isSaved = (response.action ?? '').includes('unsaved') === false &&
        (response.action ?? '').includes('save');
      return { isSaved };
    },

    async deleteReel(postId: string) {
      await backendApi.post(apiRoutes.feed.postActions, {
        post_id: postId,
        action: 'delete',
      });
    },

    async getComments(postId, { limit = 20, offset = 0 } = {}) {
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.comments, {
        type: 'fetch_comments',
        post_id: postId,
        limit,
        offset,
      });
      return (response.data ?? []).map(mapComment);
    },

    async addComment(postId, text) {
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Record<string, unknown>;
      }>(apiRoutes.feed.comments, {
        type: 'create',
        post_id: postId,
        text,
      });
      const raw = response.data ?? {};
      return mapComment(raw);
    },

    async searchCaptionSuggestions(
      kind: ReelCaptionSuggestionKind,
      query: string,
    ): Promise<ReelCaptionSuggestion[]> {
      const normalizedQuery = query.trim().replace(/^[@#]/, '');

      if (kind === 'mention') {
        if (!normalizedQuery) {
          const response = await backendApi.post<UserSuggestionsResponse>(
            apiRoutes.user.suggestions,
            { limit: 8 },
          );

          return (response.suggestions ?? [])
            .map(mapMention)
            .filter((item): item is ReelCaptionSuggestion => Boolean(item))
            .slice(0, 8);
        }

        const response = await backendApi.post<SearchResponse>(
          apiRoutes.search.all,
          { search_key: normalizedQuery, limit: 8 },
        );

        return (response.users ?? [])
          .map(mapMention)
          .filter((item): item is ReelCaptionSuggestion => Boolean(item))
          .slice(0, 8);
      }

      // ── Hashtag path ─────────────────────────────────────────────────
      // The backend only finds hashtags that have been indexed into the
      // Wo_Hashtags table. Brand-new tags (or tags from posts created via
      // API that bypassed indexing) won't show up. To keep parity with
      // Instagram/TikTok behaviour we ALWAYS surface the user's typed
      // hashtag as a tappable suggestion when the API has nothing.
      const apiSuggestions: ReelCaptionSuggestion[] = [];

      try {
        const response = await backendApi.post<HashtagSuggestionsResponse>(
          apiRoutes.reels.hashtagSuggestions,
          { query: normalizedQuery, limit: 8 },
        );

        apiSuggestions.push(
          ...(response.hashtags ?? [])
            .map(mapHashtag)
            .filter((item): item is ReelCaptionSuggestion => Boolean(item)),
        );
      } catch {
        // Endpoint missing or errored — fall through to fallbacks.
      }

      // Fallback 1: probe the posts API for any post containing this hashtag.
      if (apiSuggestions.length === 0 && normalizedQuery) {
        try {
          const fallback = await findExactHashtagFallback(normalizedQuery);
          apiSuggestions.push(...fallback);
        } catch {
          // ignore — final fallback below still applies
        }
      }

      // Fallback 2: always offer the exact hashtag the user typed if no
      // suggestion matches it. Lets them commit cleanly with a single tap.
      if (normalizedQuery) {
        const queryLower = normalizedQuery.toLowerCase();
        const alreadyIncluded = apiSuggestions.some(
          item => item.value.replace(/^#/, '').toLowerCase() === queryLower,
        );
        if (!alreadyIncluded) {
          apiSuggestions.push(buildExactHashtagSuggestion(normalizedQuery));
        }
      }

      return apiSuggestions.slice(0, 8);
    },
  };
}
