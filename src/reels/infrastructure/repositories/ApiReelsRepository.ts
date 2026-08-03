// Description: Implements the reels repository using the shared backend API.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import {
  CONTENT_AUDIENCE_CONTRACT,
  audienceFromWire,
  audienceToWire,
} from '../../../shared-kernel/domain/types/contentAudience';
import {
  REACTION_TO_WIRE,
  WIRE_TO_REACTION,
} from '../../../shared-kernel/domain/reactions/reactionCatalog';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { normalizeConfiguredUrl } from '../../../shared-kernel/infrastructure/config/url';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  FetchReelsOptions,
  ReelsRepository,
} from '../../domain/repositories/ReelsRepository';
import type {
  CommentMention,
  ReactionType,
  ReelCaptionSuggestion,
  ReelCaptionSuggestionKind,
  ReelComment,
  ReelDraft,
  ReelPublisher,
  ReelUploadResult,
  ReelsItem,
  ReelsPage,
} from '../../domain/types/reels.types';
import { hydrateCommentMentionText } from '../../application/utils/commentMentions';
import { reelsReactionsStorage } from '../storage/reelsReactionsStorage';

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

type ReelsPostsResponse = {
  api_status: number | string;
  data?: Array<Record<string, unknown>>;
  has_more?: boolean | number | string;
  next_cursor?: string | number | null;
};

const MAX_REEL_SCAN_PAGES = 8;

// ────────────────────────────────────────────────────────────────────────
// Mapping helpers — turn raw WoWonder JSON into clean domain objects.
// ────────────────────────────────────────────────────────────────────────

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function normalizeMediaUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const absoluteUrl = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith('//')
    ? `${siteRoot.startsWith('http://') ? 'http:' : 'https:'}${trimmed}`
    : normalizeConfiguredUrl(trimmed) ?? trimmed;

  try {
    return encodeURI(absoluteUrl);
  } catch {
    return absoluteUrl;
  }
}

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

function readOptionalBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return undefined;
}

function getRawReelsCursor(rawList: Array<Record<string, unknown>>) {
  const minRawId = rawList
    .map(raw => Number(readString(raw, 'id', 'post_id')))
    .filter(value => Number.isFinite(value) && value > 0)
    .reduce((min, value) => (min === 0 || value < min ? value : min), 0);

  return minRawId > 0 ? String(minRawId) : null;
}

function mapPublisher(
  raw: Record<string, unknown> | undefined | null,
): ReelPublisher {
  const safe = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const userId = readString(safe, 'user_id', 'id');
  const username = readString(safe, 'username', 'user_name');
  const firstName = readString(safe, 'first_name');
  const lastName = readString(safe, 'last_name');
  const fullName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(safe, 'name', 'full_name') ||
    username;

  const isAdmin =
    readBool(safe, 'is_admin') ||
    readString(safe, 'admin') === '1' ||
    readString(safe, 'admin') === 'admin' ||
    username.toLowerCase() === 'admin' ||
    fullName === 'Quản trị viên';

  return {
    userId,
    username,
    name: fullName,
    avatarUrl:
      normalizeMediaUrl(readString(safe, 'avatar', 'profile_picture')) ||
      undefined,
    isVerified: readBool(safe, 'verified'),
    isFollowing: readBool(safe, 'is_following', 'following') || undefined,
    isAdmin,
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
  return (
    raw
      // 1. Strip all HTML tags (<b>, </b>, <br/>, <span class="...">, …)
      .replace(/<[^>]*>/g, '')
      // 2. Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // 3. Strip WoWonder mention/hashtag tokens (@[123], #[123])
      .replace(/@\[\d+\]/g, '')
      .replace(/#\[\d+\]/g, '')
      // 4. Collapse whitespace left by stripped tags
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function cleanCommentMentionSource(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/#\[\d+\]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function hasCommentMentionToken(text: string) {
  return /(^|[^\p{L}\p{M}\p{N}_.%+-])@(?:\[[0-9]+\]|[\p{L}\p{M}\p{N}_])/u.test(
    text,
  );
}

function mapCommentMentions(raw: Record<string, unknown>): CommentMention[] {
  const records = [
    raw.mentions,
    raw.mention_users,
    raw.mentions_users,
    raw.mentioned_users,
  ].flatMap(source => {
    if (Array.isArray(source)) {
      return source.map(value => ({ value, fallbackKey: '' }));
    }
    if (!source || typeof source !== 'object') return [];

    const sourceRecord = source as Record<string, unknown>;
    const isSingleMention = Boolean(
      readString(
        sourceRecord,
        'user_id',
        'userId',
        'id',
        'username',
        'user_name',
        'userName',
      ),
    );
    if (isSingleMention) {
      return [{ value: sourceRecord, fallbackKey: '' }];
    }

    return Object.entries(sourceRecord).map(([fallbackKey, value]) => ({
      value,
      fallbackKey,
    }));
  });
  const seen = new Set<string>();

  return records
    .map(({ value, fallbackKey }) => {
      const primitiveValue =
        typeof value === 'string' || typeof value === 'number'
          ? String(value).trim()
          : '';
      const record =
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)
          : {};
      const numericFallbackKey = /^\d+$/.test(fallbackKey) ? fallbackKey : '';
      const usernameFallback = numericFallbackKey
        ? primitiveValue
        : fallbackKey;
      const userId =
        readString(record, 'user_id', 'userId', 'id', 'uid') ||
        numericFallbackKey;
      const username = (
        readString(record, 'username', 'user_name', 'userName', 'handle') ||
        usernameFallback
      )
        .trim()
        .replace(/^@+/, '');
      const displayName =
        readString(
          record,
          'display_name',
          'displayName',
          'name',
          'full_name',
          'fullName',
        ) ||
        primitiveValue ||
        username;
      if (!username || !displayName) return null;

      const key = `${userId || 'unknown'}:${username.toLowerCase()}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { userId, username, displayName };
    })
    .filter((mention): mention is CommentMention => Boolean(mention));
}

/**
 * Pull the viewer's current reaction (if any) out of a raw post.
 *
 * WoWonder's posts endpoint embeds reaction state inside a `reaction`
 * object that looks like:
 *   { '1': 1, '2': 1, is_reacted: true, type: '2', count: 12 }
 *
 * The `type` field is the wire-format id (string '1'..'6') because
 * Wo_AddReactions stored the id directly into Wo_Reactions.reaction.
 * We translate it to our domain ReactionType through WIRE_TO_REACTION.
 *
 * Any non-canonical value (custom reactions an admin added in the
 * admin panel) is coerced to `null` so the UI doesn't break.
 */
function extractMyReaction(raw: Record<string, unknown>): ReactionType | null {
  const reaction = raw.reaction;
  if (!reaction || typeof reaction !== 'object') return null;
  const reactionObj = reaction as Record<string, unknown>;
  // `is_reacted` may be boolean or "1"/"0" string depending on PHP json mode
  const reacted =
    reactionObj.is_reacted === true ||
    reactionObj.is_reacted === 'true' ||
    reactionObj.is_reacted === 1 ||
    reactionObj.is_reacted === '1';
  if (!reacted) return null;
  const rawType = String(reactionObj.type ?? '').trim();
  return (
    WIRE_TO_REACTION[rawType] ?? WIRE_TO_REACTION[rawType.toLowerCase()] ?? null
  );
}

function mapReel(raw: Record<string, unknown>): ReelsItem {
  const realPublisherRaw =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    undefined;
  const rawContract = readString(raw, 'privacy_contract');
  const privacyContract =
    rawContract === CONTENT_AUDIENCE_CONTRACT
      ? CONTENT_AUDIENCE_CONTRACT
      : 'legacy_reel';
  const decodedPrivacy = audienceFromWire(raw.postPrivacy ?? raw.privacy, {
    contract: privacyContract,
    fallback: 'only_me',
  });
  const isAnonymous =
    decodedPrivacy.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous');
  const permissionSource =
    (raw.permissions as Record<string, unknown> | undefined) ?? raw;
  const sessionUserId = sessionStorage.getSession()?.userId;
  const ownerId =
    readString(raw, 'user_id') ||
    readString(realPublisherRaw ?? {}, 'user_id', 'id');
  const isOwner = Boolean(
    sessionUserId && ownerId && String(sessionUserId) === String(ownerId),
  );
  const backendCanEdit = readOptionalBool(
    permissionSource.can_edit ?? permissionSource.canEdit,
  );
  const canShare =
    readBool(permissionSource, 'can_share', 'canShare') &&
    decodedPrivacy.isValid &&
    decodedPrivacy.audience === 'public' &&
    !isAnonymous;
  const publisherRaw = isAnonymous ? undefined : realPublisherRaw;

  const postId = readString(raw, 'id', 'post_id');

  // Prefer the backend's reaction state when present. On installs where
  // `second_post_button != 'reaction'` the backend omits the field entirely
  // even though the DB row exists — fall back to the local cache so the
  // viewer's previous tap is restored after reload / app restart.
  const apiReaction = extractMyReaction(raw);
  const cachedReaction = reelsReactionsStorage.get(sessionUserId, postId);
  const myReaction = apiReaction ?? cachedReaction;

  // ── likeCount reconciliation ─────────────────────────────────────────
  // WoWonder has TWO separate counter tables and which one shows up in
  // `postLikes` depends on admin config:
  //
  //   second_post_button = 'reaction'  → postLikes = COUNT(*) Wo_Reactions
  //   second_post_button = anything else → postLikes = COUNT(*) Wo_Likes
  //
  // On THIS install the second branch is in effect, so `postLikes` only
  // reflects people who tapped the simple Like button — NOT people who
  // tapped a reaction emoji. The post object also doesn't carry a
  // `reaction.count`, so we have no way to learn the true reaction total
  // without an extra endpoint call.
  //
  // The minimum that keeps the UI consistent: if the viewer's heart is
  // visibly red (they have a reaction), the count should include that one
  // reaction. So we add +1 whenever we know about a viewer reaction that
  // the server's postLikes can't have counted.
  const apiLikeCount = readNumber(raw, 'postLikes', 'likes', 'likeCount');
  const reactionObj = raw.reaction as Record<string, unknown> | undefined;
  const apiReactionCount =
    reactionObj && typeof reactionObj === 'object'
      ? Number((reactionObj as { count?: unknown }).count ?? NaN)
      : NaN;

  let likeCount: number;
  if (Number.isFinite(apiReactionCount) && apiReactionCount > 0) {
    // Install IS configured with reactions — server gave us a real total.
    likeCount = apiReactionCount;
  } else if (myReaction !== null && apiReaction === null) {
    // Viewer has a cached reaction the server didn't count. Bump by 1 so
    // the visible heart + visible number agree.
    likeCount = apiLikeCount + 1;
  } else {
    likeCount = apiLikeCount;
  }

  return {
    id: postId,
    videoUrl: normalizeMediaUrl(readString(raw, 'postFile')),
    thumbnailUrl: normalizeMediaUrl(
      readString(
        raw,
        'postFileThumb',
        'postFileThumbnail',
        'video_thumb',
        'videoThumb',
        'thumbnail',
        'thumb',
      ),
    ),
    caption: cleanCaption(readString(raw, 'postText')) || undefined,
    privacy: decodedPrivacy.audience,
    privacyContract,
    isAnonymous,
    canShare,
    canEdit: backendCanEdit === true || isOwner,
    postedAt: readNumber(raw, 'time') || undefined,
    publisher: mapPublisher(publisherRaw),
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    viewCount: readNumber(raw, 'videoViews'),
    // Treat "user has any reaction" as liked, falling back to the
    // legacy boolean for installs that only have simple likes.
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    isSaved: readBool(raw, 'isSaved', 'is_saved', 'is_post_saved', 'postSaved'),
    myReaction,
    raw,
  };
}

function mapComment(raw: Record<string, unknown>): ReelComment {
  const publisherRaw =
    (raw.publisher as Record<string, unknown> | undefined) ?? undefined;
  // `c_file` is the image-attachment column. comments.php already pipes it
  // through `Wo_GetMedia`, so by the time it lands here it's a full URL
  // (or empty string if no image). Treat empty as no attachment.
  const imageUrl = normalizeMediaUrl(readString(raw, 'c_file'));
  const audioUrl = normalizeMediaUrl(readString(raw, 'record'));
  const commentId = readString(raw, 'id', 'comment_id');
  const mentions = mapCommentMentions(raw);
  const storedMentionText = cleanCommentMentionSource(
    readString(raw, 'mention_text') || readString(raw, 'mentionText'),
  );
  const legacyOriginalText = cleanCommentMentionSource(
    readString(raw, 'Orginaltext', 'original_text', 'originalText'),
  );
  const rawCommentText = readString(raw, 'text', 'comment_text');
  const mentionAwareText =
    storedMentionText ||
    (hasCommentMentionToken(legacyOriginalText) ? legacyOriginalText : '');
  const displayText = mentionAwareText
    ? hydrateCommentMentionText(mentionAwareText, mentions)
    : mentions.length > 0
    ? hydrateCommentMentionText(
        cleanCommentMentionSource(rawCommentText),
        mentions,
      )
    : cleanCaption(rawCommentText);

  // Reaction state. Same logic as for posts: prefer the backend's
  // `reaction.type` when it's there, fall back to the local MMKV cache so
  // a previous tap survives reload on installs where the backend doesn't
  // include the reaction field.
  const sessionUserId = sessionStorage.getSession()?.userId;
  const apiReaction = extractMyReaction(raw);
  const cachedReaction = reelsReactionsStorage.getComment(
    sessionUserId,
    commentId,
  );
  const myReaction = apiReaction ?? cachedReaction;

  // Reconcile like count the same way we do for posts: if the user has a
  // cached reaction the server's `comment_likes` (which only counts the
  // legacy comment_likes table) won't reflect, bump by 1 so the UI is
  // consistent.
  const apiLikeCount = readNumber(raw, 'comment_likes', 'likes', 'likeCount');
  const reactionObj = raw.reaction as Record<string, unknown> | undefined;
  const apiReactionCount =
    reactionObj && typeof reactionObj === 'object'
      ? Number((reactionObj as { count?: unknown }).count ?? NaN)
      : NaN;
  let likeCount: number;
  if (Number.isFinite(apiReactionCount) && apiReactionCount > 0) {
    likeCount = apiReactionCount;
  } else if (myReaction !== null && apiReaction === null) {
    likeCount = apiLikeCount + 1;
  } else {
    likeCount = apiLikeCount;
  }

  return {
    id: commentId,
    text: displayText,
    postedAt: readNumber(raw, 'time') || undefined,
    publisher: mapPublisher(publisherRaw),
    likeCount,
    replyCount: readNumber(raw, 'replies', 'replies_count', 'replyCount'),
    isLiked:
      myReaction !== null || readBool(raw, 'is_comment_liked', 'isLiked'),
    myReaction,
    owner: readBool(raw, 'onwer', 'owner'),
    postOwner: readBool(raw, 'post_onwer', 'postOwner'),
    imageUrl: imageUrl || undefined,
    audioUrl: audioUrl || undefined,
    mentions: mentions.length > 0 ? mentions : undefined,
  };
}

function toStringValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function mapMention(
  raw: Record<string, unknown>,
): ReelCaptionSuggestion | null {
  const username = toStringValue(raw.username);
  if (!username) {
    return null;
  }

  const label =
    toStringValue(raw.name) || toStringValue(raw.full_name) || username;

  return {
    id: toStringValue(raw.user_id) || toStringValue(raw.id) || username,
    kind: 'mention',
    label,
    value: `@${label}`,
    backendValue: `@${username}`,
    avatarUrl: toStringValue(raw.avatar) || toStringValue(raw.profile_picture),
  };
}

function mapHashtag(
  raw: Record<string, unknown>,
): ReelCaptionSuggestion | null {
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
    subtitle:
      Number.isFinite(useCount) && useCount > 0
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

  return response.data?.length
    ? [buildExactHashtagSuggestion(normalizedQuery)]
    : [];
}

async function fetchReelsPage(
  options: FetchReelsOptions = {},
): Promise<ReelsPage> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 50));
  const initialCursor = options.cursor ?? null;

  // ── Endpoint selection ────────────────────────────────────────────────
  //
  // PREVIOUSLY this method called `get_user_posts` with the session
  // user_id, which meant the Reels tab only ever showed the viewer's
  // OWN videos — no one else's. The user shipped that and immediately
  // hit the "không có video người khác" bug.
  //
  // The correct endpoint for a TikTok-style cross-user video feed is
  // WoWonder's `get_random_videos`:
  //
  //   SELECT id FROM T_POSTS
  //    WHERE postPrivacy = '0'                      ← PUBLIC ONLY
  //      AND (postYoutube <> '' OR postVine <> ''
  //           OR postFacebook <> '' OR postDailymotion <> ''
  //           OR postVimeo <> '' OR postPlaytube <> ''
  //           OR postFile LIKE '%_video%')          ← any video
  //    ORDER BY id DESC LIMIT $limit
  //
  // No follow-graph filter, no `is_reel=0` filter (the type handler
  // bypasses Wo_GetPosts entirely and goes straight to a rawQuery).
  // Pagination is via `after_post_id` (rows with `id < cursor`).
  //
  // If `options.publisherId` is explicitly passed (e.g. "show only this
  // user's videos" from a profile screen), we honour it via the
  // `get_user_posts` branch instead.
  const basePayload: Record<string, unknown> = {
    post_type: 'video',
    limit,
  };

  if (options.publisherId) {
    // Profile-scoped fetch — caller wants ONE user's videos.
    basePayload.type = 'get_user_posts';
    basePayload.id = options.publisherId;
  } else {
    // Default: site-wide public videos. This is what the Reels tab
    // wants — discovery of everyone's content, just like TikTok.
    basePayload.type = 'get_random_videos';
  }

  // Backend constraint reminder: `Wo_GetPosts` (used by `get_user_posts`)
  // appends `AND is_reel = 0` unless `is_reel` is in the data array, but
  // `get_random_videos` bypasses Wo_GetPosts and runs its own rawQuery
  // — so reels uploaded via the dedicated web Reels feature DO show up
  // through this path now.
  //
  // Older servers can still return external embeds or fewer usable rows
  // than requested. Keep walking the cursor until this app page is full,
  // the server explicitly says there is no more data, or a safety cap is
  // reached. This prevents one sparse backend page from ending the feed.
  const items: ReelsItem[] = [];
  const seenIds = new Set<string>();
  let requestCursor = initialCursor;
  let nextCursor: string | null = null;
  let totalRawCount = 0;

  for (let scan = 0; scan < MAX_REEL_SCAN_PAGES; scan += 1) {
    const payload = { ...basePayload };
    if (requestCursor) payload.after_post_id = requestCursor;

    let response: ReelsPostsResponse;
    try {
      response = await backendApi.post<ReelsPostsResponse>(
        apiRoutes.feed.posts,
        payload,
      );
    } catch (error) {
      if (items.length > 0) break;
      throw error;
    }
    const rawList = response.data ?? [];
    totalRawCount += rawList.length;

    const serverCursor = toStringValue(response.next_cursor) || null;
    const serverHasMore = readOptionalBool(response.has_more);

    if (rawList.length === 0) {
      const cursorAdvanced = Boolean(
        serverCursor && String(serverCursor) !== String(requestCursor ?? ''),
      );
      if (serverHasMore === true && cursorAdvanced && serverCursor) {
        nextCursor = serverCursor;
        requestCursor = serverCursor;
        continue;
      }
      nextCursor = null;
      break;
    }

    let processedCount = 0;
    let lastProcessedCursor: string | null = null;

    for (const raw of rawList) {
      processedCount += 1;
      const rawId = readString(raw, 'id', 'post_id');
      if (rawId) lastProcessedCursor = rawId;

      if (readString(raw, 'postFile')) {
        const mapped = mapReel(raw);
        if (mapped.videoUrl && !seenIds.has(mapped.id)) {
          seenIds.add(mapped.id);
          items.push(mapped);
        }
      }

      if (items.length >= limit) break;
    }

    const processedWholePage = processedCount >= rawList.length;
    const pageCursor = serverCursor || getRawReelsCursor(rawList);

    if (!processedWholePage) {
      nextCursor = lastProcessedCursor || pageCursor;
      break;
    }

    const cursorAdvanced = Boolean(
      pageCursor && String(pageCursor) !== String(requestCursor ?? ''),
    );
    const canContinue = serverHasMore === false ? false : cursorAdvanced;
    nextCursor = canContinue ? pageCursor : null;

    if (items.length >= limit || !canContinue || !pageCursor) break;
    requestCursor = pageCursor;
  }

  console.log(
    '[reels] page →',
    'type:',
    basePayload.type,
    'raw:',
    totalRawCount,
    'playable:',
    items.length,
    'nextCursor:',
    nextCursor,
  );

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
        postPrivacy: audienceToWire(draft.privacy ?? 'public'),
        privacy_contract: CONTENT_AUDIENCE_CONTRACT,
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
      if (response.api_status === 200 && response.post_data) {
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
        typeof rawCount === 'number' ? rawCount : Number(rawCount ?? 0) || 0;

      return { isLiked, likeCount };
    },

    async setReaction(postId: string, reaction: ReactionType | null) {
      // ── WoWonder reaction contract ────────────────────────────────────
      //
      //   POST /api/post-actions
      //     action  = 'reaction'
      //     post_id = '<numeric post id>'
      //     reaction = '<NUMERIC ID 1..6>'   ← critical: NOT 'love' / 'haha'
      //
      // Why numeric? Because the server checks
      //   in_array($_POST['reaction'], array_keys($wo['reactions_types']))
      // and `$wo['reactions_types']` is keyed by the `id` column of
      // Wo_Reactions_Types, which is 1..6. Sending the human-readable name
      // silently fails (api returns "reaction missing") — confirmed by
      // looking at WoWonder's own web client (script.js:4489).
      //
      // Server semantics:
      //   POST with `reaction=2`           → if user has no reaction: add 2.
      //                                      if user has any other: swap to 2.
      //                                      if user already has 2: deletes
      //                                        then re-adds (no-op effectively).
      //   POST without `reaction` param    → deletes current reaction (if any).
      //                                      400 "reaction missing" if none.
      //
      // To CLEAR we must omit the param — passing the same type wouldn't
      // clear, it would re-add. That's why our signature is
      // `ReactionType | null` (null = omit).
      const payload: Record<string, unknown> = {
        action: 'reaction',
        post_id: postId,
      };
      if (reaction !== null) {
        payload.reaction = REACTION_TO_WIRE[reaction];
      }

      const response = await backendApi.post<{
        api_status: number | string;
        action?: string;
        code?: number;
      }>(apiRoutes.feed.postActions, payload);

      // The response interceptor in client.ts already throws on non-200,
      // but we double-check here so the cache-write below only happens on
      // a confirmed success.
      const ok = String(response.api_status) === '200';
      if (!ok) {
        throw new Error('Không gửi được biểu cảm. Vui lòng thử lại.');
      }

      // Persist the reaction to the per-user MMKV cache so a reload still
      // shows it. This is the workaround for WoWonder NOT including the
      // viewer's reaction in `Wo_GetPosts` responses unless the admin has
      // set `second_post_button = 'reaction'` (see reelsReactionsStorage.ts).
      const sessionUserId = sessionStorage.getSession()?.userId;
      reelsReactionsStorage.set(sessionUserId, postId, reaction);

      return { reaction };
    },

    async toggleSave(postId: string) {
      const response = await backendApi.post<{
        api_status: number | string;
        action?: string;
        message?: string;
        code?: number;
      }>(apiRoutes.feed.postActions, { post_id: postId, action: 'save' });

      const ok =
        String(response.api_status) === '200' ||
        response.code === 0 ||
        response.code === 1;
      if (!ok) {
        throw new Error(response.message ?? 'Khong luu duoc video.');
      }

      // Backend returns code=1 + "saved post" or code=0 + "unsaved post".
      const action = (response.action ?? '').toLowerCase();
      const isSaved =
        response.code === 1 ||
        (response.code !== 0 &&
          action.includes('saved') &&
          !action.includes('unsaved'));
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

    async addComment(postId, text, image, audio) {
      // ── Image branch ──────────────────────────────────────────────────
      // When the user attached an image, switch from JSON POST to
      // multipart/form-data so the backend sees the file under
      // `$_FILES['image']` (see phtml/api/v2/endpoints/comments.php
      // lines 54-65 — `Wo_ShareFile` reads the uploaded blob there).
      // Text becomes optional in this path because PHP accepts comments
      // that are image-only.
      if (image || audio) {
        const response = await backendApi.multipart<{
          api_status: number | string;
          data?: Record<string, unknown>;
        }>(apiRoutes.feed.comments, {
          type: 'create',
          post_id: postId,
          // Send text only when non-empty so the PHP `!empty($_POST['text'])`
          // check doesn't false-positive on an empty string.
          ...(text ? { text } : {}),
          ...(image
            ? {
                image: {
                  uri: image.uri,
                  name: image.name,
                  type: image.type,
                },
              }
            : {}),
          ...(audio
            ? {
                audio: {
                  uri: audio.uri,
                  name: audio.name,
                  type: audio.type,
                },
              }
            : {}),
        });
        const raw = response.data ?? {};
        return mapComment(raw);
      }

      // ── Text-only branch ──────────────────────────────────────────────
      // Keeps the cheaper JSON POST when there's nothing to upload.
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

    async toggleCommentLike(commentId) {
      // ── WoWonder comment-like contract ────────────────────────────────
      //   POST { type: 'comment_like', comment_id }
      //     → liked   → response = { api_status: 200, code: 1 }
      //     → unliked → response = { api_status: 200, code: 0 }
      //
      // The endpoint does NOT return the updated like count, so the
      // caller is expected to adjust ±1 client-side and re-fetch on next
      // pagination if it needs the authoritative value.
      const response = await backendApi.post<{
        api_status: number | string;
        code?: number;
      }>(apiRoutes.feed.comments, {
        type: 'comment_like',
        comment_id: commentId,
      });
      const isLiked = Number(response.code) === 1;
      return { isLiked };
    },

    async setCommentReaction(commentId, reaction) {
      // ── WoWonder reaction_comment contract ────────────────────────────
      //
      //   POST { type: 'reaction_comment', comment_id, reaction: '<1-6>' }
      //     → adds (or swaps to) the reaction
      //   POST { type: 'reaction_comment', comment_id }  // no reaction
      //     → if viewer had one: deletes it
      //     → if viewer had none: 400 "reaction missing"
      //
      // Same numeric wire format as post reactions (see REACTION_TO_WIRE
      // above). Sending 'love' instead of '2' silently fails because the
      // server checks `in_array($_POST['reaction'], array_keys($wo['reactions_types']))`
      // and the keys are integer ids.
      const payload: Record<string, unknown> = {
        type: 'reaction_comment',
        comment_id: commentId,
      };
      if (reaction !== null) {
        payload.reaction = REACTION_TO_WIRE[reaction];
      }

      const response = await backendApi.post<{
        api_status: number | string;
      }>(apiRoutes.feed.comments, payload);
      const ok = String(response.api_status) === '200';
      if (!ok) {
        throw new Error('Không gửi được biểu cảm. Vui lòng thử lại.');
      }

      // Mirror to the per-user MMKV cache so a reload keeps the choice
      // visible — backend doesn't return reaction state on installs where
      // `second_post_button != 'reaction'` is configured.
      const sessionUserId = sessionStorage.getSession()?.userId;
      reelsReactionsStorage.setComment(sessionUserId, commentId, reaction);

      return { reaction };
    },

    async deleteComment(commentId) {
      // Server is permissive: it deletes whatever id you give it as long
      // as you have access. We don't verify ownership client-side beyond
      // hiding the button — the server will reject silently if you don't.
      await backendApi.post(apiRoutes.feed.comments, {
        type: 'delete',
        comment_id: commentId,
      });
    },

    async editComment(commentId, text) {
      // Returns `{ api_status: 200, message: "comment successfully edited." }`
      // — no fresh comment object, so the caller must update the local
      // copy by hand with the text it just sent.
      await backendApi.post(apiRoutes.feed.comments, {
        type: 'edit',
        comment_id: commentId,
        text,
      });
    },

    async fetchReplies(commentId, { limit = 20, offset = 0 } = {}) {
      // Same cursor-style pagination as comments: `offset` is the highest
      // reply id from the previous page (`AND id > offset ORDER BY id ASC`).
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.comments, {
        type: 'fetch_comments_reply',
        comment_id: commentId,
        limit,
        offset,
      });
      return (response.data ?? []).map(mapComment);
    },

    async addReply(commentId, text, image) {
      // Same dual-branch pattern as `addComment` above — multipart when
      // there's an image to upload, JSON post otherwise.
      if (image) {
        const response = await backendApi.multipart<{
          api_status: number | string;
          data?: Record<string, unknown>;
        }>(apiRoutes.feed.comments, {
          type: 'create_reply',
          comment_id: commentId,
          ...(text ? { text } : {}),
          image: {
            uri: image.uri,
            name: image.name,
            type: image.type,
          },
        });
        const raw = response.data ?? {};
        return mapComment(raw);
      }

      const response = await backendApi.post<{
        api_status: number | string;
        data?: Record<string, unknown>;
      }>(apiRoutes.feed.comments, {
        type: 'create_reply',
        comment_id: commentId,
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
