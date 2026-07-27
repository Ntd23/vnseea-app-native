// Description: Implements feed repository calls against WoWonder APIs for all-post and following streams.
//
// Pulls video posts for the home feed via WoWonder's `/api/posts`. Key
// gotchas this file handles:
//
//   • `get_news_feed` only returns posts from accounts the viewer follows.
//     On a fresh demo account that hasn't followed anyone, it returns an
//     empty array — which is why "the feed shows nothing" is so common.
//     We fall back to `get_user_posts` with the session userId so at
//     least the viewer always sees something.
//
//   • The video-URL regex used to be too strict (`\.(mp4|mov|webm|m3u8)$`)
//     and silently dropped `.mkv`, `.avi`, or URLs whose extension was
//     buried before a `?token=` query string. We now accept any of the
//     common video extensions anywhere in the URL AND any post whose
//     `postType === 'video'` (WoWonder's own server-side flag).
//
//   • Default limit was 6 — too small. Bumped to 20 so the chance of all
//     six being non-video and the user seeing an empty feed is dramatically
//     lower.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { getShareableUrl } from '../../../shared-kernel/application/view-models/useShareViewModel';
import {
  REACTION_TO_WIRE,
  WIRE_TO_REACTION,
  type ReactionType,
} from '../../../shared-kernel/domain/reactions/reactionCatalog';
import type {
  ReelCaptionSuggestion,
} from '../../../reels/domain/types/reels.types';
import { reelsReactionsStorage } from '../../../reels/infrastructure/storage/reelsReactionsStorage';
import type {
  FeedSource,
  FeedPostsPage,
  FeedRepository,
  FeedRecommendationEventInput,
  GetPostByIdResult,
  PostComment,
  PostReactionsPage,
  SharePostInput,
} from '../../domain/repositories/FeedRepository';
import type {
  PostReactionCount,
  PostReactionUser,
} from '../../domain/types/reactions.types';
import type {
  CreatePostDraft,
  CreatePostResult,
  FeedPost,
  FeedAdPost,
  FeedTextPost,
  FeedVideoPost,
  FeedPollPost,
  PostFeeling,
  PostPrivacy,
  PostLinkPreview,
  SharedPostPreviewModel,
} from '../../domain/types/feed.types';
import { buildSharedPostPreviewModel } from '../../application/sharing/sharedPostPreview';
import { mapProfileMediaActivity } from '../../application/mappers/profileMediaActivity';
import {
  CONTENT_AUDIENCE_CONTRACT,
  audienceFromWire,
  audienceToWire,
  type ContentAudienceWireContract,
} from '../../../shared-kernel/domain/types/contentAudience';

// Privacy mapping
// WoWonder's `postPrivacy` is numeric and enforced by Wo_GetPostData:
// 0=everyone, 1=mutual friends, 2=people following the author,
// 3=only me, 4=anonymous.
const PRIVACY_TO_WIRE = audienceToWire;

function extractMyReaction(raw: Record<string, unknown>): ReactionType | null {
  const reaction = raw.reaction;
  if (!reaction || typeof reaction !== 'object') return null;
  const reactionObj = reaction as Record<string, unknown>;
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

/**
 * Extract the top reaction types (max 3) from a WoWonder post's `reaction`
 * object. WoWonder stores per-type counts under keys `like`, `love`, `haha`,
 * `wow`, `sad`, `angry` (or their numeric wire ids `1`..`6`) inside the
 * reaction object. We read all of them, sort by count desc, and return the
 * top 3 as `ReactionType[]`.
 *
 * If the backend doesn't provide per-type breakdown (rare), we fall back
 * to a heuristic: always include 'like', and if the viewer has a non-like
 * reaction, include that too.
 */
function extractTopReactions(
  raw: Record<string, unknown>,
  myReaction: ReactionType | null,
): ReactionType[] {
  const reactionObj = raw.reaction;
  if (!reactionObj || typeof reactionObj !== 'object') {
    // No reaction object → heuristic fallback
    return buildFallbackTopReactions(myReaction);
  }

  const obj = reactionObj as Record<string, unknown>;
  const counts: Array<{ type: ReactionType; count: number }> = [];

  // Check both human-readable keys AND numeric wire keys
  const keysToCheck: Array<[string, ReactionType]> = [
    ['like', 'like'],
    ['love', 'love'],
    ['haha', 'haha'],
    ['wow', 'wow'],
    ['sad', 'sad'],
    ['angry', 'angry'],
    ['1', 'like'],
    ['2', 'love'],
    ['3', 'haha'],
    ['4', 'wow'],
    ['5', 'sad'],
    ['6', 'angry'],
  ];

  const seen = new Set<ReactionType>();
  for (const [key, type] of keysToCheck) {
    if (seen.has(type)) continue;
    const val = obj[key];
    const count =
      typeof val === 'number' ? val : typeof val === 'string' ? Number(val) : 0;
    if (Number.isFinite(count) && count > 0) {
      counts.push({ type, count });
      seen.add(type);
    }
  }

  if (counts.length === 0) {
    return buildFallbackTopReactions(myReaction);
  }

  // Sort by count desc, take top 3
  counts.sort((a, b) => b.count - a.count);
  return counts.slice(0, 3).map(c => c.type);
}

function buildFallbackTopReactions(
  myReaction: ReactionType | null,
): ReactionType[] {
  if (!myReaction) return ['like'];
  if (myReaction === 'like') return ['like'];
  // Viewer has a non-like reaction → show both like + theirs
  return [myReaction];
}

function readBool(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1' || v === 1) return true;
    if (v === 'false' || v === '0' || v === 0) return false;
  }
  return false;
}

function readOptionalBool(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (!(key in raw)) continue;
    return readBool(raw, key);
  }
  return undefined;
}

function readPostPrivacy(raw: Record<string, unknown>) {
  const privacyContract = readString(raw, 'privacy_contract');
  const contract: ContentAudienceWireContract =
    privacyContract === CONTENT_AUDIENCE_CONTRACT
      ? CONTENT_AUDIENCE_CONTRACT
      : 'legacy_feed';
  const decoded = audienceFromWire(readString(raw, 'postPrivacy', 'privacy'), {
    contract,
    fallback: 'only_me',
  });

  return {
    ...decoded,
    contract,
    isAnonymous:
      decoded.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous'),
  };
}

function readPostPermissions(
  raw: Record<string, unknown>,
  privacy = readPostPrivacy(raw),
) {
  const permissions =
    (raw.permissions as Record<string, unknown> | undefined) ?? raw;
  const backendCanShare = readOptionalBool(
    permissions,
    'can_share',
    'canShare',
  );
  return {
    canDelete: readBool(permissions, 'can_delete', 'canDelete'),
    canShare:
      backendCanShare === true &&
      privacy.isValid &&
      privacy.audience === 'public' &&
      !privacy.isAnonymous,
  };
}

function readPostPresentation(raw: Record<string, unknown>) {
  const privacy = readPostPrivacy(raw);
  const permissions = readPostPermissions(raw, privacy);
  const realPublisher =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    {};
  const viewerId = sessionStorage.getSession()?.userId;
  const ownerId =
    readString(raw, 'user_id') || readString(realPublisher, 'user_id', 'id');
  const isOwner =
    readBool(raw, 'is_owner', 'isOwner') ||
    Boolean(viewerId && ownerId && String(viewerId) === ownerId);

  return {
    privacy,
    permissions,
    publisher:
      privacy.isAnonymous && !isOwner
        ? ({} as Record<string, unknown>)
        : realPublisher,
    isIdentityRedacted: privacy.isAnonymous && !isOwner,
  };
}

// Match any common video extension anywhere in the URL (allows query
// strings, signed-CDN tokens, weird paths). The `.` is bare so we also
// catch `video.mp4.encrypted` paths some installs ship with.
const VIDEO_URL_PATTERN = /\.(mp4|mov|webm|m3u8|mkv|avi)(?:[?#/]|$)/i;
const AUDIO_URL_PATTERN = /\.(mp3|wav)(?:[?#/]|$)/i;

function looksLikeAd(raw: Record<string, unknown>): boolean {
  return (
    readString(raw, 'postType').toLowerCase() === 'ad' ||
    Boolean(readString(raw, 'ad_media'))
  );
}

// ── Poll post detection and mapping ───────────────────────────────────────
function looksLikePoll(raw: Record<string, unknown>): boolean {
  // Poll posts have poll_id = 1 and options array
  const pollId = readNumber(raw, 'poll_id');
  const hasOptions =
    Array.isArray(raw.options) && (raw.options as unknown[]).length > 0;

  return pollId === 1 || hasOptions;
}

interface RawPollOption {
  id: string | number;
  text: string;
  option_votes?: number;
  optionVotes?: number;
  percentage: string;
  percentage_num?: number;
  percentageNum?: number;
  all: number;
}

function mapPollOption(raw: RawPollOption) {
  return {
    id: String(raw.id ?? ''),
    text: String(raw.text ?? ''),
    optionVotes: Number(raw.option_votes ?? raw.optionVotes ?? 0),
    percentage: String(raw.percentage ?? '0%'),
    percentageNum: Number(raw.percentage_num ?? raw.percentageNum ?? 0),
    all: Number(raw.all ?? 0),
  };
}

function getPollTotalVotes(
  options: Array<{ optionVotes: number; all: number }>,
) {
  const apiTotal = Math.max(0, ...options.map(option => option.all));
  if (apiTotal > 0) return apiTotal;
  return options.reduce((sum, option) => sum + option.optionVotes, 0);
}

function mapPollPost(raw: Record<string, unknown>): FeedPollPost {
  const presentation = readPostPresentation(raw);
  const publisher = presentation.publisher;
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  const name = presentation.isIdentityRedacted
    ? ''
    : [firstName, lastName].filter(Boolean).join(' ').trim() ||
      readString(publisher, 'name', 'full_name') ||
      username ||
      'Người dùng';

  const postId = readString(raw, 'id', 'post_id');

  // Same reaction reconciliation as text posts
  const sessionUserId = sessionStorage.getSession()?.userId;
  const apiReaction = extractMyReaction(raw);
  const cachedReaction = reelsReactionsStorage.get(sessionUserId, postId);
  const myReaction = apiReaction ?? cachedReaction;

  const apiLikeCount = readNumber(raw, 'postLikes', 'likes', 'likeCount');
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

  // Parse poll options
  const rawOptions = raw.options as RawPollOption[] | undefined;
  const options = (rawOptions ?? []).map(mapPollOption);

  // Calculate total votes
  const totalVotes = getPollTotalVotes(options);

  // Get voted option id (null if not voted)
  const votedId = (raw.voted_id as number) > 0 ? String(raw.voted_id) : null;
  const privacyResult = presentation.privacy;
  const privacy: PostPrivacy = privacyResult.audience;

  return {
    kind: 'poll',
    id: postId,
    permissions: presentation.permissions,
    caption: readPostCaption(raw) || undefined,
    mentionNames: readPostMentionNames(raw),
    pollQuestion: readPostCaption(raw) || undefined,
    options,
    votedId,
    totalVotes,
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    topReactions: extractTopReactions(raw, myReaction),
    privacy,
    privacyContract: privacyResult.contract,
    isAnonymous: privacyResult.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous'),
    publisher: presentation.isIdentityRedacted
      ? { id: '', name: '', username: '' }
      : {
          id: readString(publisher, 'user_id', 'id'),
          name,
          username,
          avatarUrl:
            readString(publisher, 'avatar', 'profile_picture') || undefined,
          isFollowing:
            publisher['is_following'] === 1 ||
            publisher['is_following'] === 'yes' ||
            publisher['is_following'] === '1' ||
            publisher['is_following'] === true ||
            raw['is_following'] === 1 ||
            raw['is_following'] === 'yes' ||
            raw['is_following'] === '1' ||
            raw['is_following'] === true,
        },
  };
}

function readString(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

// ── URL normalizer (for photo album items only) ──────────────────────────
//
// In `phtml/api/v2/endpoints/posts.php`, WoWonder runs `Wo_GetMedia()` on
// `postFile`, `postFileThumb`, and the user `avatar` — so those come back
// as FULL URLs already. We must NOT touch them; doubling-up the host
// breaks `<Video>` and `<Image>`.
//
// BUT `photo_album[i].image_org` and `photo_multi[i].image_org` are NOT
// normalized server-side — the API returns the raw relative DB value
// (e.g. `upload/photos/2024/05/abc.jpg`). We mirror `Wo_GetMedia()` here
// for those fields only.
//
// CRITICAL: use `webBaseUrl` (= `https://demo.vnseea.vn`), NOT
// `apiBaseUrl` (= `https://demo.vnseea.vn/api`). Static media lives at
// the site root, not under `/api`. Prepending `apiBaseUrl` was the bug
// that produced gray photo cells.
const _siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function normalizeMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Relative path — prepend site root.
  return `${_siteRoot}/${trimmed.replace(/^\/+/, '')}`;
}

function mapFollowingMention(
  raw: Record<string, unknown>,
): ReelCaptionSuggestion | null {
  const username = readString(raw, 'username', 'user_name');
  if (!username) return null;

  const firstName = readString(raw, 'first_name');
  const lastName = readString(raw, 'last_name');
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const label =
    firstName || fullName || readString(raw, 'name', 'full_name') || username;
  const displayHandle = (firstName || username).replace(/\s+/g, '_');

  return {
    id: readString(raw, 'user_id', 'id') || username,
    kind: 'mention',
    label,
    value: `@${displayHandle}`,
    backendValue: `@${username}`,
    subtitle: `@${username}`,
    avatarUrl:
      normalizeMediaUrl(readString(raw, 'avatar', 'profile_picture')) ||
      undefined,
  };
}

function matchesMentionQuery(suggestion: ReelCaptionSuggestion, query: string) {
  const normalized = query.trim().replace(/^@/, '').toLowerCase();
  if (!normalized) return true;
  return (
    suggestion.label.toLowerCase().includes(normalized) ||
    suggestion.value.toLowerCase().includes(normalized) ||
    (suggestion.backendValue ?? '').toLowerCase().includes(normalized) ||
    (suggestion.subtitle ?? '').toLowerCase().includes(normalized)
  );
}

function normalizePlayableMediaUrl(
  url: string | undefined,
): string | undefined {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return undefined;
  try {
    return encodeURI(normalized);
  } catch {
    return normalized;
  }
}

function getComparableMediaUrl(url: string | undefined) {
  return (url ?? '').trim().split('?')[0].replace(/\/+$/, '').toLowerCase();
}

function isSameMediaUrl(left: string | undefined, right: string | undefined) {
  const normalizedLeft = getComparableMediaUrl(left);
  const normalizedRight = getComparableMediaUrl(right);
  return Boolean(
    normalizedLeft && normalizedRight && normalizedLeft === normalizedRight,
  );
}

function readNumber(raw: Record<string, unknown>, ...keys: string[]) {
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

function cleanCaption(raw: string) {
  if (!raw) return '';
  return raw
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
    .replace(/\s+/g, ' ')
    .trim();
}

function readPostCaption(raw: Record<string, unknown>) {
  return cleanCaption(
    readString(raw, 'Orginaltext', 'postText_API', 'postText'),
  );
}

function readPostMentionNames(raw: Record<string, unknown>) {
  const mentions = raw.mentions_users;
  if (!mentions || typeof mentions !== 'object' || Array.isArray(mentions)) {
    return undefined;
  }

  const names = Array.from(
    new Set(
      Object.values(mentions)
        .map(value => cleanCaption(typeof value === 'string' ? value : ''))
        .filter(Boolean),
    ),
  ).sort((left, right) => right.length - left.length);

  return names.length > 0 ? names : undefined;
}

function mapVideoPost(raw: Record<string, unknown>): FeedVideoPost {
  const presentation = readPostPresentation(raw);
  const publisher = presentation.publisher;
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  const name = presentation.isIdentityRedacted
    ? ''
    : [firstName, lastName].filter(Boolean).join(' ').trim() ||
      readString(publisher, 'name', 'full_name') ||
      username ||
      'Người dùng';

  const postId = readString(raw, 'id', 'post_id');

  // Resolve viewer's reaction. Prefer the backend's `reaction.type` (only
  // present when admin enabled `second_post_button = 'reaction'`), fall
  // back to the per-user MMKV cache so a previous tap survives reload.
  const sessionUserId = sessionStorage.getSession()?.userId;
  const apiReaction = extractMyReaction(raw);
  const cachedReaction = reelsReactionsStorage.get(sessionUserId, postId);
  const myReaction = apiReaction ?? cachedReaction;

  // Reconcile likeCount the same way Reels does. On installs where
  // postLikes only counts T_LIKES (and reactions go into T_REACTIONS),
  // we add +1 when the viewer has a cached reaction the server didn't
  // count — so the visible heart + visible number stay consistent.
  const apiLikeCount = readNumber(raw, 'postLikes', 'likes', 'likeCount');
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

  const privacyResult = presentation.privacy;
  const privacy: PostPrivacy = privacyResult.audience;

  const videoUrl = normalizePlayableMediaUrl(readString(raw, 'postFile')) ?? '';
  const publisherAvatarUrl =
    readString(publisher, 'avatar', 'profile_picture') || undefined;
  const normalizedPublisherAvatarUrl =
    normalizePlayableMediaUrl(publisherAvatarUrl);
  const rawThumbnailUrl =
    normalizePlayableMediaUrl(
      readString(
        raw,
        'postFileThumb',
        'postFileThumbnail',
        'video_thumb',
        'videoThumb',
        'thumbnail',
        'thumb',
      ),
    ) ?? undefined;
  const thumbnailUrl = isSameMediaUrl(
    rawThumbnailUrl,
    normalizedPublisherAvatarUrl,
  )
    ? undefined
    : rawThumbnailUrl;

  return {
    kind: 'video',
    id: postId,
    permissions: presentation.permissions,
    caption: readPostCaption(raw) || undefined,
    mentionNames: readPostMentionNames(raw),
    // Some endpoints return full Wo_GetMedia URLs, others still return
    // relative media paths. normalizePlayableMediaUrl handles both.
    videoUrl,
    thumbnailUrl,
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    topReactions: extractTopReactions(raw, myReaction),
    privacy,
    privacyContract: privacyResult.contract,
    isAnonymous: privacyResult.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous'),
    linkPreview: extractLinkPreview(raw),
    publisher: presentation.isIdentityRedacted
      ? { id: '', name: '', username: '' }
      : {
          id: readString(publisher, 'user_id', 'id'),
          name,
          username,
          avatarUrl: publisherAvatarUrl,
          isFollowing:
            publisher['is_following'] === 1 ||
            publisher['is_following'] === 'yes' ||
            publisher['is_following'] === '1' ||
            publisher['is_following'] === true ||
            raw['is_following'] === 1 ||
            raw['is_following'] === 'yes' ||
            raw['is_following'] === '1' ||
            raw['is_following'] === true,
        },
  };
}

function mapAdPost(raw: Record<string, unknown>): FeedAdPost {
  const publisher =
    (raw.anonymous_publisher as Record<string, unknown> | undefined) ??
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    {};
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(publisher, 'name', 'full_name') ||
    username ||
    'Nhà quảng cáo';

  const adId = readString(raw, 'id', 'ad_id');
  const mediaUrl = normalizeMediaUrl(readString(raw, 'ad_media')) || undefined;
  const title =
    cleanCaption(readString(raw, 'headline')) ||
    cleanCaption(readString(raw, 'name')) ||
    'Quảng cáo';
  const description = cleanCaption(readString(raw, 'description')) || undefined;

  return {
    kind: 'ad',
    id: `ad:${adId || title}`,
    adId,
    title,
    description,
    mediaUrl,
    isVideo: VIDEO_URL_PATTERN.test(mediaUrl ?? ''),
    targetUrl: readString(raw, 'url', 'website') || undefined,
    appears: readString(raw, 'appears') || undefined,
    postedAt: readNumber(raw, 'posted', 'time') || undefined,
    permissions: readPostPermissions(raw),
    publisher: {
      id: readString(publisher, 'user_id', 'id') || readString(raw, 'user_id'),
      name,
      username,
      avatarUrl:
        readString(publisher, 'avatar', 'profile_picture') || undefined,
    },
  };
}

/**
 * Decide whether a raw post is a "video" we want to surface.
 *
 *   1. Server-side flag `postType === 'video'` is the authoritative marker
 *      — WoWonder sets it on any post uploaded via the dedicated video
 *      flow (including Reels created by our own `CreateReelScreen`).
 *   2. URL pattern is the fallback — catches posts uploaded the legacy
 *      way (file picker that didn't tag `postType`). We tolerate query
 *      strings + slashes after the extension so signed-CDN URLs work.
 */
function looksLikeVideo(raw: Record<string, unknown>): boolean {
  if (looksLikeAd(raw)) return false;
  const postType = readString(raw, 'postType').toLowerCase();
  const file = normalizePlayableMediaUrl(readString(raw, 'postFile'));
  if (!file) return false;
  if (postType === 'video' || postType === 'reel') return true;
  return VIDEO_URL_PATTERN.test(file);
}

function looksLikeLive(raw: Record<string, unknown>): boolean {
  return readString(raw, 'postType', 'post_type').toLowerCase() === 'live';
}

// ── Photo URL extraction for text/photo posts ────────────────────────────
//
// WoWonder represents photo posts in MULTIPLE different ways depending
// on the upload path. We have to be defensive because not all installs
// surface the same fields:
//
//   1. Single photo  → `postFile` is the image URL, `postFileThumb` may
//                      contain a thumb. `postType` may be 'photo'.
//   2. Album upload  → `photo_album` is an array of objects with
//                      `image` (original) and sometimes `image_org` (small
//                      crop, despite the misleading name). This is what
//                      WoWonder writes when our `createPost` sends
//                      `postPhotos[]` + `album_name`. Confirmed by
//                      `Wo_GetAlbumPhotos()`, which stores `image_org`
//                      as `*_small.*` while `image` keeps the uploaded file.
//   3. Multi-image   → `photo_multi` same shape as `photo_album` (items
//                      with `image_org`). Used for the `multi_image=1`
//                      flag flow — also surfaced via `timeline.php:257`.
//   4. Imported URL  → `postPhoto` contains a single URL grabbed from
//                      a link in `postText`.
//
// IMPORTANT: WoWonder's item keys are inconsistent across endpoints. Some
// return `image_org` as the original image, but album helpers in this backend
// put a generated `*_small.*` 400x400 crop there and keep the original in
// `image`. Fullscreen viewers must use the original URL, while thumbnails can
// still crop visually in the card UI via `resizeMode="cover"`.
const IMAGE_URL_PATTERN = /\.(png|jpg|jpeg|gif|webp|heic)(?:[?#/]|$)/i;
const GENERATED_SMALL_IMAGE_PATTERN =
  /_small\.(png|jpg|jpeg|gif|webp|heic)(?:[?#/]|$)/i;

function looksLikeGeneratedSmallImage(url: string): boolean {
  return GENERATED_SMALL_IMAGE_PATTERN.test(url);
}

function extractPhotoUrls(raw: Record<string, unknown>): string[] {
  const urls: string[] = [];

  const tryPush = (url: string | undefined) => {
    if (!url) return;
    const fullUrl = normalizeMediaUrl(url);
    if (!fullUrl) return;
    if (!IMAGE_URL_PATTERN.test(fullUrl)) return;
    if (urls.includes(fullUrl)) return;
    urls.push(fullUrl);
  };

  // Path 1: single-photo post
  tryPush(readString(raw, 'postFile'));

  // Path 4: link-preview / imported image
  tryPush(readString(raw, 'postPhoto'));

  // Paths 2 + 3: album / multi-image — try every shape WoWonder is
  // known to use. Order matters: `photo_album` and `photo_multi` are
  // the canonical fields for the album upload + multi_image flows we
  // create via `/api/new_post`, so check them first.
  const albumCandidates = [
    raw.photo_album,
    raw.photo_multi,
    raw.album,
    raw.postPhotos,
    raw.photos,
  ];

  for (const candidate of albumCandidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      if (typeof item === 'string') {
        tryPush(item);
        continue;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const imageOrg = readString(obj, 'image_org');
        const image = readString(obj, 'image');
        const preferredImage =
          imageOrg &&
          image &&
          looksLikeGeneratedSmallImage(imageOrg) &&
          !looksLikeGeneratedSmallImage(image)
            ? image
            : imageOrg || image;

        // Prefer the original upload when the backend exposes both the
        // generated square crop and the original file. Keep the legacy keys
        // after that so installs that surface photos under another name still
        // work.
        if (preferredImage) {
          tryPush(preferredImage);
        } else {
          tryPush(readString(obj, 'url', 'source', 'src', 'photo'));
        }
      }
    }
  }

  return urls;
}

// ── Feeling extraction ───────────────────────────────────────────────────
//
// WoWonder stores feelings as 5 separate columns on the post row:
//   postFeeling, postTraveling, postWatching, postPlaying, postListening
// Only ONE is populated per post. We pick whichever is non-empty and
// surface it as a single `PostFeeling`. The `emoji` + `label` fields
// stay undefined here — they're presentational hints the UI fills in
// from a local lookup table (`wo['feelingIcons']` equivalent).
function extractFeeling(raw: Record<string, unknown>): PostFeeling | undefined {
  const buckets: Array<[PostFeeling['type'], string]> = [
    ['feelings', readString(raw, 'postFeeling')],
    ['traveling', readString(raw, 'postTraveling')],
    ['watching', readString(raw, 'postWatching')],
    ['playing', readString(raw, 'postPlaying')],
    ['listening', readString(raw, 'postListening')],
  ];
  for (const [type, value] of buckets) {
    if (value) return { type, value };
  }
  return undefined;
}

function extractLinkPreview(
  raw: Record<string, unknown>,
): PostLinkPreview | undefined {
  const url = readString(raw, 'postLink');
  if (!url) return undefined;

  return {
    url,
    title: cleanCaption(readString(raw, 'postLinkTitle')) || undefined,
    description: cleanCaption(readString(raw, 'postLinkContent')) || undefined,
    image: normalizeMediaUrl(readString(raw, 'postLinkImage')) || undefined,
  };
}

/**
 * A "text or photo" post is anything that is NOT a video. We surface
 * pure-text posts AND photo-album posts in the same lane because the
 * UI card handles both — text-only, single photo, and multi-photo grid
 * are just different render branches inside `TextPostCard`.
 *
 * We DO require either `postText` OR at least one photo though —
 * empty stub posts (which sometimes appear from cron jobs / system
 * messages) get filtered out so the feed doesn't show blank cards.
 */
function looksLikeTextOrPhoto(raw: Record<string, unknown>): boolean {
  if (looksLikeAd(raw)) return false;
  if (looksLikeLive(raw)) return false;
  if (looksLikeVideo(raw)) return false;
  const text = readString(raw, 'postText').trim();
  const hasPhoto = extractPhotoUrls(raw).length > 0;
  const hasAudio = AUDIO_URL_PATTERN.test(readString(raw, 'postFile'));
  const hasLinkPreview = Boolean(readString(raw, 'postLink'));
  const shared = readSharedInfo(raw);
  const hasSharedContent = shared
    ? looksLikeVideo(shared) ||
      looksLikePoll(shared) ||
      looksLikeTextOrPhoto(shared)
    : false;
  return (
    Boolean(text) || hasPhoto || hasAudio || hasLinkPreview || hasSharedContent
  );
}

function readSharedInfo(
  raw: Record<string, unknown>,
): Record<string, unknown> | null {
  const shared = raw.shared_info;
  return shared && typeof shared === 'object'
    ? (shared as Record<string, unknown>)
    : null;
}

function mapSharedFrom(raw: Record<string, unknown>) {
  const shared = readSharedInfo(raw);
  if (!shared) return undefined;

  const presentation = readPostPresentation(shared);
  const publisher = presentation.publisher;
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  const publisherName = presentation.isIdentityRedacted
    ? ''
    : [firstName, lastName].filter(Boolean).join(' ').trim() ||
      readString(publisher, 'name', 'full_name') ||
      username ||
      'Người dùng';

  return {
    id: readString(shared, 'id', 'post_id'),
    caption: readPostCaption(shared) || undefined,
    mentionNames: readPostMentionNames(shared),
    isAnonymous: presentation.isIdentityRedacted,
    publisherName,
    publisherAvatar:
      readString(publisher, 'avatar', 'profile_picture') || undefined,
    postedAt: readNumber(shared, 'time') || undefined,
    photos: extractPhotoUrls(shared),
  };
}

function readPostOwnerId(raw: Record<string, unknown>): string {
  const publisher =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    {};

  return readString(raw, 'user_id') || readString(publisher, 'user_id', 'id');
}

function rawPostKey(raw: Record<string, unknown>): string {
  if (looksLikeAd(raw)) {
    return `ad:${
      readString(raw, 'id', 'ad_id') || JSON.stringify(raw).slice(0, 80)
    }`;
  }
  return readString(raw, 'id', 'post_id') || JSON.stringify(raw).slice(0, 80);
}

function mapProfilePost(
  raw: Record<string, unknown>,
): FeedTextPost | FeedVideoPost | FeedPollPost {
  if (readSharedInfo(raw)) {
    return mapSharedOuterPost(raw);
  }
  if (looksLikeVideo(raw)) {
    return mapVideoPost(raw);
  }

  if (looksLikePoll(raw)) {
    return mapPollPost(raw);
  }

  if (looksLikeTextOrPhoto(raw)) {
    return mapTextPostBase(raw);
  }
  const base = mapTextPostBase(raw);
  return { ...base, caption: base.caption ?? 'Đã tạo một bài viết' };
}

function mapTextPostBase(raw: Record<string, unknown>): FeedTextPost {
  const presentation = readPostPresentation(raw);
  const publisher = presentation.publisher;
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  const name = presentation.isIdentityRedacted
    ? ''
    : [firstName, lastName].filter(Boolean).join(' ').trim() ||
      readString(publisher, 'name', 'full_name') ||
      username ||
      'Người dùng';

  const postId = readString(raw, 'id', 'post_id');

  // Same reaction reconciliation as video posts — see mapVideoPost for
  // the rationale (postLikes vs T_REACTIONS split, MMKV cache fallback).
  const sessionUserId = sessionStorage.getSession()?.userId;
  const apiReaction = extractMyReaction(raw);
  const cachedReaction = reelsReactionsStorage.get(sessionUserId, postId);
  const myReaction = apiReaction ?? cachedReaction;

  const apiLikeCount = readNumber(raw, 'postLikes', 'likes', 'likeCount');
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

  const privacyResult = presentation.privacy;
  const privacy: PostPrivacy = privacyResult.audience;
  const photos = extractPhotoUrls(raw);
  const caption = readPostCaption(raw) || undefined;

  return {
    kind: 'text',
    id: postId,
    permissions: presentation.permissions,
    activity: mapProfileMediaActivity(readString(raw, 'postType', 'post_type')),
    caption,
    mentionNames: readPostMentionNames(raw),
    photos,
    audioUrl: AUDIO_URL_PATTERN.test(readString(raw, 'postFile'))
      ? readString(raw, 'postFile')
      : undefined,
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    topReactions: extractTopReactions(raw, myReaction),
    feeling: extractFeeling(raw),
    privacy,
    privacyContract: privacyResult.contract,
    isAnonymous: privacyResult.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous'),
    linkPreview: extractLinkPreview(raw),
    publisher: presentation.isIdentityRedacted
      ? { id: '', name: '', username: '' }
      : {
          id: readString(publisher, 'user_id', 'id'),
          name,
          username,
          // Avatar is pre-normalized by Wo_GetMedia in posts.php — full URL
          // already. Don't double-prepend the host here.
          avatarUrl:
            readString(publisher, 'avatar', 'profile_picture') || undefined,
        },
    sharedFrom: mapSharedFrom(raw),
  };
}

function mapSharedPostPreview(
  raw: Record<string, unknown>,
): SharedPostPreviewModel {
  if (looksLikeVideo(raw)) {
    return buildSharedPostPreviewModel(mapVideoPost(raw));
  }
  if (looksLikePoll(raw)) {
    return buildSharedPostPreviewModel(mapPollPost(raw));
  }
  if (looksLikeAd(raw)) {
    return buildSharedPostPreviewModel(mapAdPost(raw));
  }

  const attachmentPreview = mapSharedAttachmentPreview(raw);
  if (attachmentPreview) return attachmentPreview;

  return buildSharedPostPreviewModel(mapTextPostBase(raw));
}

function readNestedRecord(
  raw: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = raw[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function readNestedImage(entity: Record<string, unknown>) {
  const images = entity.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') return normalizeMediaUrl(first) || undefined;
    if (first && typeof first === 'object') {
      const image = readString(
        first as Record<string, unknown>,
        'image',
        'image_org',
        'url',
        'src',
      );
      if (image) return normalizeMediaUrl(image) || undefined;
    }
  }
  const image = readString(entity, 'image', 'cover', 'thumbnail', 'avatar');
  return image ? normalizeMediaUrl(image) || undefined : undefined;
}

function mapSharedAttachmentPreview(
  raw: Record<string, unknown>,
): SharedPostPreviewModel | null {
  const base = buildSharedPostPreviewModel(mapTextPostBase(raw));
  const product = readNestedRecord(raw, 'product', 'product_data');
  if (product) {
    return {
      ...base,
      content: {
        kind: 'attachment',
        attachmentKind: 'product',
        title: readString(product, 'name', 'title') || 'Sản phẩm',
        subtitle:
          readString(product, 'price_format', 'price_text', 'price') ||
          undefined,
        imageUrl: readNestedImage(product),
      },
    };
  }

  const event = readNestedRecord(raw, 'event', 'event_data', 'post_event');
  if (event) {
    return {
      ...base,
      content: {
        kind: 'attachment',
        attachmentKind: 'event',
        title: readString(event, 'name', 'event_name', 'title') || 'Sự kiện',
        subtitle:
          readString(event, 'location', 'event_location', 'address') ||
          undefined,
        imageUrl: readNestedImage(event),
      },
    };
  }

  const job = readNestedRecord(raw, 'job', 'job_data');
  if (job) {
    return {
      ...base,
      content: {
        kind: 'attachment',
        attachmentKind: 'job',
        title: readString(job, 'title', 'name') || 'Việc làm',
        subtitle: readString(job, 'location', 'address') || undefined,
        imageUrl: readNestedImage(job),
      },
    };
  }

  return null;
}

function mapSharedOuterPost(
  raw: Record<string, unknown>,
): FeedTextPost | FeedVideoPost {
  const source = readSharedInfo(raw);
  const outer = mapTextPostBase(raw);
  if (!source) return outer;

  const sharedPost = mapSharedPostPreview(source);
  const sharedFields = {
    sharedPostId: sharedPost.postId,
    sharedPost,
  };

  if (sharedPost.content.kind !== 'video') {
    return { ...outer, ...sharedFields };
  }

  return {
    ...outer,
    ...sharedFields,
    kind: 'video',
    videoUrl: sharedPost.content.videoUrl,
    thumbnailUrl: sharedPost.content.thumbnailUrl,
  };
}

function mapTextPost(
  raw: Record<string, unknown>,
): FeedTextPost | FeedVideoPost {
  return readSharedInfo(raw) ? mapSharedOuterPost(raw) : mapTextPostBase(raw);
}

// ── Shared fetch helper ──────────────────────────────────────────────────
//
// Facebook-style home feed: we merge THREE streams to guarantee the
// viewer always sees a healthy mix of content regardless of how
// developed their follow graph is.
//
//   1. `get_news_feed`   — posts from accounts the viewer follows.
//                          WoWonder's `Wo_GetPosts({publisher_id:0})`
//                          applies a follow-graph filter ONLY when the
//                          admin's `config.order_posts_by != 0`. On
//                          installs where the filter is ON and the
//                          viewer follows nobody, this returns just
//                          the viewer's own posts (or nothing).
//
//   2. `get_user_posts`  — the viewer's OWN posts. Always reliable —
//                          fresh accounts see their own posts even
//                          before they discover others.
//
//   3. Suggested users   — posts from `/api/get-user-suggestions` +
//                          `/api/get-friends` (following) +
//                          `/api/nearby`. We pick the top 8 authors
//                          and pull their recent posts in parallel.
//                          This is the "discovery" lane and is what
//                          keeps the feed full on sparse accounts.
//
// All three run in parallel. We dedupe by post id and let the downstream
// `getAllPosts` sort by `postedAt` desc — the result is a chronological
// merged feed that mixes own + follows + discovery content, just like
// the FB / Twitter home tab.

// Module-level cache for suggested user ids.
// Keyed by the current viewer's userId so a logout/login cycle naturally
// rehydrates with the new account's suggestions. Reset whenever the
// cache TTL expires.
const SUGGESTED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const suggestedUsersCache = new Map<
  string,
  { ids: string[]; expiresAt: number }
>();

function getCachedSuggestedIds(viewerId: string): string[] | null {
  const entry = suggestedUsersCache.get(viewerId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    suggestedUsersCache.delete(viewerId);
    return null;
  }
  return entry.ids;
}

function setCachedSuggestedIds(viewerId: string, ids: string[]): void {
  suggestedUsersCache.set(viewerId, {
    ids,
    expiresAt: Date.now() + SUGGESTED_CACHE_TTL_MS,
  });
}

const FEED_REPOSITORY_DEBUG = typeof __DEV__ !== 'undefined' && __DEV__;

type RawFeedPostsPage = {
  posts: Array<Record<string, unknown>>;
  nextCursor?: string;
  primaryCount: number;
  reachedEnd?: boolean;
  sourceKind?: 'recommended' | 'legacy';
};

function debugFeedRepository(label: string, payload: Record<string, unknown>) {
  if (!FEED_REPOSITORY_DEBUG) return;
  // React Native dev console collapses nested objects to "Object"
  // for any payload > ~2 levels deep or with arrays. We flatten the
  // most useful diagnostic fields into a single line of key=value
  // pairs so they survive the console renderer and we can read them
  // from the log without expanding anything.
  const parts: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      // For arrays, print count + first 3 entries (each as compact JSON).
      const sample = value
        .slice(0, 3)
        .map(v => {
          try {
            return JSON.stringify(v);
          } catch {
            return String(v);
          }
        })
        .join(', ');
      parts.push(
        `${key}=[count=${value.length}, sample=[${sample}${
          value.length > 3 ? ', ...' : ''
        }]]`,
      );
    } else if (value && typeof value === 'object') {
      // For nested objects, just stringify them so they don't
      // collapse to "Object".
      try {
        parts.push(`${key}=${JSON.stringify(value)}`);
      } catch {
        parts.push(`${key}=${String(value)}`);
      }
    } else {
      parts.push(`${key}=${String(value)}`);
    }
  }
  console.log(`[feed.repository] ${label} | ${parts.join(' | ')}`);
}

function getOldestRawPostId(
  posts: Array<Record<string, unknown>>,
): string | undefined {
  const ids = posts
    .map(item => Number(readString(item, 'id', 'post_id')))
    .filter(id => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return undefined;
  return String(Math.min(...ids));
}

function getOldestFeedPostId(posts: FeedPost[]): string | undefined {
  const ids = posts
    .map(post => Number(post.id))
    .filter(id => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return undefined;
  return String(Math.min(...ids));
}

async function fetchRecommendedRawFeedPosts(
  limit: number,
  afterPostId?: string,
  source: FeedSource = 'all',
): Promise<RawFeedPostsPage> {
  const payload: Record<string, unknown> = {
    limit,
    candidate_limit: limit,
    strict_pagination: 1,
    source,
  };

  if (afterPostId) {
    payload.after_post_id = afterPostId;
  }

  const response = await backendApi.post<{
    api_status: number | string;
    data?: Array<Record<string, unknown>>;
    next_cursor?: string | number | null;
    reached_end?: boolean;
  }>(apiRoutes.feed.recommended, payload);

  const rows = response.data ?? [];
  const nextCursor =
    response.next_cursor !== null && response.next_cursor !== undefined
      ? String(response.next_cursor)
      : getOldestRawPostId(rows);

  debugFeedRepository('recommended-feed result', {
    limit,
    source,
    afterPostId: afterPostId ?? 'first',
    rows: rows.length,
    nextCursor: nextCursor ?? '(none)',
    reachedEnd: response.reached_end === true,
  });

  return {
    posts: rows,
    nextCursor,
    primaryCount: rows.length,
    reachedEnd: response.reached_end === true,
    sourceKind: 'recommended',
  };
}

async function fetchRecommendedRawFeedPostsWithFallback(
  limit: number,
  afterPostId?: string,
  source: FeedSource = 'all',
): Promise<RawFeedPostsPage> {
  try {
    const page = await fetchRecommendedRawFeedPosts(limit, afterPostId, source);
    if (page.posts.length >= limit && !page.reachedEnd) {
      return page;
    }

    const legacyPage = await fetchRawFeedPosts(limit, afterPostId, source);
    if (legacyPage.posts.length > 0) {
      const merged = new Map<string, Record<string, unknown>>();
      for (const post of [...page.posts, ...legacyPage.posts]) {
        merged.set(rawPostKey(post), post);
      }
      const posts = Array.from(merged.values());
      const nextCursor = getOldestRawPostId(posts);
      debugFeedRepository('recommended-feed merged fallback', {
        afterPostId: afterPostId ?? 'first',
        recommended: page.posts.length,
        legacy: legacyPage.posts.length,
        merged: posts.length,
        nextCursor: nextCursor ?? '(none)',
      });

      return {
        posts,
        nextCursor,
        primaryCount: Math.max(page.primaryCount, legacyPage.primaryCount),
        reachedEnd:
          page.reachedEnd === true &&
          legacyPage.posts.length === 0 &&
          legacyPage.reachedEnd === true,
        sourceKind: 'legacy',
      };
    }

    if (page.posts.length > 0 || page.reachedEnd) {
      return page;
    }
  } catch (err) {
    debugFeedRepository('recommended-feed fallback', {
      afterPostId: afterPostId ?? 'first',
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return fetchRawFeedPosts(limit, afterPostId, source);
}

async function fetchRawFeedPosts(
  limit: number,
  afterPostId?: string,
  source: FeedSource = 'all',
): Promise<RawFeedPostsPage> {
  const tryFetch = async (
    payload: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> => {
    const streamTag = String(payload.type ?? 'unknown');
    try {
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.posts, payload);

      const rows = response.data ?? [];
      debugFeedRepository('tryFetch result', {
        stream: streamTag,
        id: payload.id,
        limit: payload.limit,
        afterPostId: payload.after_post_id ?? 'first',
        rawRows: rows.length,
      });
      return rows;
    } catch (err) {
      debugFeedRepository('tryFetch error', {
        stream: streamTag,
        id: payload.id,
        error: err instanceof Error ? err.message : String(err),
      });
      // One stream failing should never blank the whole feed — return
      // empty and let the other streams populate the UI.
      return [];
    }
  };

  /**
   * Fetch posts from many users at once via a discovery chain.
   * Pulls suggested users + viewer following + nearby, then asks each
   * for their latest posts in parallel.
   */
  const fetchDiscoveryPosts = async (
    afterPostId?: string,
  ): Promise<Array<Record<string, unknown>>> => {
    const collectUserIds = (
      list: Array<Record<string, unknown>> | undefined,
    ): string[] => {
      if (!list) return [];
      return list
        .map(user =>
          String(
            (user as { user_id?: unknown; id?: unknown }).user_id ??
              (user as { user_id?: unknown; id?: unknown }).id ??
              '',
          ),
        )
        .filter(Boolean);
    };

    const sessionUserIdLocal = sessionStorage.getSession()?.userId ?? '';
    const cacheKey = sessionUserIdLocal || 'guest';
    const cachedIds = getCachedSuggestedIds(cacheKey);

    // Fresh load page 1, or cache was cleared / not yet populated
    if (!afterPostId || !cachedIds) {
      type SuggestionsResponse = {
        api_status: number | string;
        suggestions?: Array<Record<string, unknown>>;
      };
      type FriendsResponse = {
        api_status: number | string;
        data?: {
          following?: Array<Record<string, unknown>>;
          followers?: Array<Record<string, unknown>>;
        };
      };
      type NearbyResponse = {
        api_status: number | string;
        nearby_users?: Array<Record<string, unknown>>;
      };

      const [sugRes, friendsRes, nearbyRes] = await Promise.all([
        // Pull a generous author pool so discovery has enough breadth
        // to cover the install even when the user follows nobody.
        backendApi
          .post<SuggestionsResponse>(apiRoutes.user.suggestions, { limit: 60 }) // Increased to 60
          .catch(() => ({} as SuggestionsResponse)),
        sessionUserIdLocal
          ? backendApi
              .post<FriendsResponse>(apiRoutes.social.friends, {
                user_id: sessionUserIdLocal,
                type: 'following,followers',
                limit: 500, // Fetch up to 500 friends/followers
              })
              .catch(() => ({} as FriendsResponse))
          : Promise.resolve({} as FriendsResponse),
        backendApi
          .post<NearbyResponse>(apiRoutes.user.nearby, { limit: 40 }) // Increased to 40
          .catch(() => ({} as NearbyResponse)),
      ]);

      const userIds = new Set<string>();
      collectUserIds(sugRes.suggestions).forEach(id => userIds.add(id));
      collectUserIds(friendsRes.data?.following).forEach(id => userIds.add(id));
      collectUserIds(friendsRes.data?.followers).forEach(id => userIds.add(id));
      collectUserIds(nearbyRes.nearby_users).forEach(id => userIds.add(id));
      if (sessionUserIdLocal) userIds.delete(sessionUserIdLocal);

      setCachedSuggestedIds(cacheKey, Array.from(userIds));
    }

    const ids = getCachedSuggestedIds(cacheKey);
    if (!ids || ids.length === 0) {
      return [];
    }

    // Shuffle the list of IDs and select up to 20 random authors on each page fetch
    // to ensure variety and cover all followers/followings over time.
    const shuffledIds = [...ids].sort(() => Math.random() - 0.5);
    const pickedIds = shuffledIds.slice(0, 20);
    const perUserLimit = 10;

    const perUser = await Promise.all(
      pickedIds.map(id =>
        tryFetch({
          type: 'get_user_posts',
          id,
          limit: perUserLimit,
          // First page: no cursor → freshest posts. On paging: only
          // fetch older-than-cursor so we don't re-emit the same
          // posts the followed feed already gave us.
          after_post_id: afterPostId,
        }),
      ),
    );

    return perUser.flat();
  };

  /**
   * Probe the server for total-available-post counts BEFORE we start
   * the paginated fan-out. We do this on the first page only (no
   * afterPostId) so we know exactly how much content exists across
   * each source. The probe itself is cheap — it's just one
   * max-limit call per source that we'd otherwise make anyway.
   *
   * This is purely diagnostic (debugFeedRepository only logs in
   * __DEV__). The actual data still flows through the normal
   * tryFetch path, so this is safe to leave in.
   */
  const probeTotal = async (
    payload: Record<string, unknown>,
  ): Promise<number> => {
    const rows = await tryFetch({ ...payload, limit: 50 });
    return rows.length;
  };

  const sessionUserId = sessionStorage.getSession()?.userId;

  if (source === 'following') {
    const followedRaw = await tryFetch({
      type: 'get_news_feed',
      limit: Math.max(limit, 45),
      after_post_id: afterPostId,
    });

    debugFeedRepository('following stream', {
      afterPostId: afterPostId ?? 'first',
      requestedLimit: limit,
      followed: followedRaw.length,
    });

    return {
      posts: followedRaw,
      nextCursor: getOldestRawPostId(followedRaw),
      primaryCount: followedRaw.length,
    };
  }

  // The merge logic now caps own posts ONLY from the `ownRaw`
  // stream (not from followed/discovery), so the cap's whole job is
  // to keep the viewer's own posts from drowning the page. With
  // that isolation we can safely fetch a larger window from the
  // server and let the cap trim it down. `ownRawLimit=20` is the
  // maximum number of the viewer's own posts we'll *consider* on a
  // single page — the cap will reduce that to `ownPostsLimit` after
  // dedupe so the page stays balanced.
  const ownPostsLimit = sessionUserId
    ? afterPostId
      ? Math.max(2, Math.min(4, Math.ceil(limit / 8)))
      : Math.max(3, Math.min(6, Math.ceil(limit / 5)))
    : 0;
  const ownRawLimit = Math.max(ownPostsLimit, 20);

  // ── Diagnostic: log total raw posts available per source ──
  //
  // On the first page (no cursor) we fire three cheap "max-limit"
  // probes in parallel to know the total pool of content the user
  // could in principle see. This answers the "is the feed short
  // because the install is empty, or because the dedupe / classifier
  // is eating things?" question with hard numbers instead of guessing.
  if (!afterPostId) {
    const probedAuthorIds = (() => {
      const ids = getCachedSuggestedIds(sessionUserId ?? 'guest') ?? [];
      return ids.slice(0, 16);
    })();

    const probeTasks: Array<Promise<{ source: string; total: number }>> = [
      probeTotal({ type: 'get_news_feed' }).then(total => ({
        source: 'get_news_feed',
        total,
      })),
    ];
    if (sessionUserId) {
      probeTasks.push(
        probeTotal({
          type: 'get_user_posts',
          id: sessionUserId,
        }).then(total => ({
          source: `get_user_posts[viewer=${sessionUserId}]`,
          total,
        })),
      );
    }
    for (const id of probedAuthorIds) {
      probeTasks.push(
        probeTotal({ type: 'get_user_posts', id }).then(total => ({
          source: `get_user_posts[author=${id}]`,
          total,
        })),
      );
    }

    Promise.all(probeTasks)
      .then(results => {
        const total = results.reduce((sum, r) => sum + r.total, 0);
        const activeAuthors = results
          .filter(r => r.total > 0)
          .map(r => `${r.source}=${r.total}`)
          .join(', ');
        const emptyAuthors = results.filter(r => r.total === 0).length;
        // Print as flat key=value so console.log doesn't collapse to
        // "Object". We deliberately avoid putting the per-source
        // breakdown in an array since RN dev tools truncate arrays
        // past their first few entries.
        debugFeedRepository('probe totals (unfiltered max-limit page)', {
          grandTotal: total,
          sourceCount: results.length,
          activeAuthors:
            activeAuthors || '(none — every probed author is empty)',
          emptyAuthorCount: emptyAuthors,
        });
      })
      .catch(err => {
        debugFeedRepository('probe totals error', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  // 1. Fetch the follow-graph feed and the viewer's own posts in parallel.
  //    `get_news_feed` may be follow-filtered on the WoWonder install, so we
  //    pair it with discovery (suggestions + friends + nearby) below to keep
  //    Home populated even when the viewer follows nobody yet.
  //
  //    The followed limit is bumped to `max(limit, 45)` so a viewer who
  //    follows an active author (e.g. the admin) gets the full 20-30
  //    posts from that author instead of just the first 30.
  const followedLimit = Math.max(limit, 45);
  const [followedRaw, ownRaw, publicRaw] = await Promise.all([
    tryFetch({
      type: 'get_news_feed',
      limit: followedLimit,
      after_post_id: afterPostId,
    }),
    sessionUserId
      ? tryFetch({
          type: 'get_user_posts',
          id: sessionUserId,
          // Fetch up to ownRawLimit so we have a generous raw window
          // for the cap to trim down. (The merge logic then keeps
          // only the first ownPostsLimit posts of the viewer's own
          // and dedupes any duplicates already present in followed.)
          limit: ownRawLimit,
          after_post_id: afterPostId,
        })
      : Promise.resolve<Array<Record<string, unknown>>>([]),
    // Fetch popular public posts on page 1 only
    !afterPostId
      ? backendApi
          .get<{
            api_status?: number | string;
            data?: Array<Record<string, unknown>>;
          }>(apiRoutes.popular.mostLiked)
          .then(res => res.data ?? [])
          .catch(() => [] as Array<Record<string, unknown>>)
      : Promise.resolve<Array<Record<string, unknown>>>([]),
  ]);

  // 2. Pull discovery ALWAYS on the first page, and whenever the
  //    followed feed looks thin on subsequent pages.
  //
  //    The previous logic only fetched discovery when followedRatio
  //    < 0.9, which meant self-following accounts (where the user
  //    follows themselves and `get_news_feed` returns their own
  //    posts) never saw discovery content. Result: a self-following
  //    viewer saw their own posts twice (once from followed, once
  //    from own) with no outside authors mixed in.
  //
  //    First page is therefore ALWAYS a parallel discovery fan-out;
  //    on subsequent pages we only skip discovery when followed is
  //    already healthy so the user doesn't pay for unnecessary
  //    network calls.
  let discoveryRaw: Array<Record<string, unknown>> = [];
  const followedRatio = followedRaw.length / Math.max(1, followedLimit);
  const shouldFetchDiscovery = afterPostId ? followedRatio < 0.35 : true;
  if (shouldFetchDiscovery) {
    discoveryRaw = await fetchDiscoveryPosts(afterPostId);
  }

  // Merge + dedupe by post id using a Map (O(1) lookup, no Set→Array churn).
  //
  // The old loop iterated all three streams together and applied the
  // `ownCapped` cap whenever a post's owner was the viewer. That
  // worked fine for normal users (where the viewer's own posts only
  // appeared in `ownRaw`) but **silently dropped 30 admin posts** on
  // self-following accounts, because the viewer's own posts also
  // appear in `followedRaw` (via the follow-graph) and the cap
  // counted them all together. With `ownPostsLimit=6` we only kept
  // the first 6 admin posts and dropped the other 30 — even though
  // those 30 were just as legitimate as the followed-graph feed.
  //
  // Fix: cap the `ownRaw` stream ONLY (it's the dedicated slot for
  // the viewer's own posts), and let posts in `followedRaw` /
  // `discoveryRaw` pass through unfiltered. Dedupe still runs across
  // all three streams so the viewer never sees the same post twice.
  const mergedMap = new Map<string, Record<string, unknown>>();
  let pageAdIncluded = false;
  let ownPostsIncluded = 0;
  const dropCounters = {
    adSkipped: 0,
    ownCapped: 0,
    noId: 0,
    duplicate: 0,
  };

  const pushPost = (
    post: Record<string, unknown>,
    isFromOwnStream: boolean,
  ) => {
    const isAd = looksLikeAd(post);
    if (isAd && pageAdIncluded) {
      dropCounters.adSkipped += 1;
      return;
    }
    const ownerId = readPostOwnerId(post);
    // Only enforce the cap for posts that came from the dedicated
    // `ownRaw` stream. Followed + discovery always pass through.
    if (
      isFromOwnStream &&
      sessionUserId &&
      ownerId === String(sessionUserId) &&
      ownPostsIncluded >= ownPostsLimit
    ) {
      dropCounters.ownCapped += 1;
      return;
    }
    const id = String(
      isAd
        ? rawPostKey(post)
        : (post as { id?: unknown; post_id?: unknown }).id ??
            (post as { id?: unknown; post_id?: unknown }).post_id ??
            '',
    );
    if (!id) {
      dropCounters.noId += 1;
      return;
    }
    if (mergedMap.has(id)) {
      dropCounters.duplicate += 1;
      return;
    }
    mergedMap.set(id, post);
    if (isAd) pageAdIncluded = true;
    if (sessionUserId && ownerId === String(sessionUserId)) {
      ownPostsIncluded += 1;
    }
  };

  // Phase 1: ownRaw — apply the cap so the viewer's own posts
  // don't drown the page.
  for (const post of ownRaw) {
    pushPost(post, true);
  }

  // Phase 2: followed + discovery + public — no cap. The viewer's own posts
  // that already landed in `ownRaw` will be deduped here, but
  // additional ones are allowed through.
  for (const post of followedRaw) {
    pushPost(post, false);
  }
  for (const post of discoveryRaw) {
    pushPost(post, false);
  }
  for (const post of publicRaw) {
    pushPost(post, false);
  }

  const merged = Array.from(mergedMap.values());

  debugFeedRepository('raw streams merged', {
    afterPostId: afterPostId ?? 'first',
    requestedLimit: limit,
    followed: followedRaw.length,
    own: ownRaw.length,
    ownLimit: ownPostsLimit,
    discovery: discoveryRaw.length,
    public: publicRaw.length,
    rawTotal:
      followedRaw.length +
      discoveryRaw.length +
      ownRaw.length +
      publicRaw.length,
    merged: merged.length,
    dropped: dropCounters,
  });

  // The cursor only matters when the FOLLOWED feed still has older posts
  // (i.e. it was healthy). When discovery carried the page, force a
  // follow-up call by sending a zeroed cursor — the worst case is one
  // extra network round-trip; the upside is no false "end of feed".
  const followedCursor = getOldestRawPostId(followedRaw);
  const discoveryCursor = getOldestRawPostId(discoveryRaw);
  const ownCursor = getOldestRawPostId(ownRaw);
  const nextCursor = followedCursor ?? discoveryCursor ?? ownCursor;
  const primaryCount = followedRaw.length;

  return {
    posts: merged,
    nextCursor,
    primaryCount,
  };
}

function mixAdsIntoPosts(posts: FeedPost[]): FeedPost[] {
  const ads = posts.filter((post): post is FeedAdPost => post.kind === 'ad');
  if (ads.length === 0) {
    return posts.sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  }

  const content = posts
    .filter((post): post is Exclude<FeedPost, FeedAdPost> => post.kind !== 'ad')
    .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));

  if (content.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    return ads.map((ad, index) => ({ ...ad, postedAt: now - index }));
  }

  const mixed: FeedPost[] = [...content];
  ads.slice(0, 1).forEach((ad, index) => {
    const insertAt = Math.min(content.length, 4 + index * 8);
    const previous = mixed[Math.max(0, insertAt - 1)];
    const next = mixed[insertAt];
    const previousTime = previous?.postedAt ?? Math.floor(Date.now() / 1000);
    const nextTime = next?.postedAt ?? previousTime - 2;
    const adTime =
      previousTime > nextTime
        ? (previousTime + nextTime) / 2
        : previousTime - 1;
    mixed.splice(insertAt, 0, { ...ad, postedAt: adTime });
  });

  return mixed.sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
}

type CreatePostContext = 'personal' | 'page' | 'group' | 'event';

function resolveCreatePostContext(draft: CreatePostDraft): CreatePostContext {
  const targets = [draft.pageId, draft.groupId, draft.eventId].filter(Boolean);
  if (targets.length > 1) {
    throw new Error('Invalid create-post context: multiple targets.');
  }

  if (draft.pageId) {
    if (draft.isAnonymous) {
      throw new Error('Anonymous posts are not allowed in a page context.');
    }
    if (draft.privacy !== 'public' && draft.privacy !== 'followers') {
      throw new Error('Invalid page audience.');
    }
    return 'page';
  }

  if (draft.groupId || draft.eventId) {
    if (draft.isAnonymous) {
      throw new Error('Anonymous posts are not allowed in this context.');
    }
    return draft.groupId ? 'group' : 'event';
  }

  if (draft.isAnonymous && draft.privacy !== 'public') {
    throw new Error('Anonymous personal posts must use the public audience.');
  }
  return 'personal';
}

function isGroupRawPost(raw: Record<string, unknown>): boolean {
  return readNumber(raw, 'group_id', 'groupId') > 0;
}

function mapLightRawFeedPosts(raw: Array<Record<string, unknown>>): FeedPost[] {
  const posts: FeedPost[] = [];
  // Per-classifier counters. Tells us which branch a row went down
  // (ad / poll / text+photo / video / dropped-as-stub) so we can
  // see exactly where raw posts get filtered out.
  const buckets = {
    ad: 0,
    live: 0,
    poll: 0,
    text: 0,
    video: 0,
    dropped: 0,
  };
  for (const item of raw) {
    if (isGroupRawPost(item)) {
      buckets.dropped += 1;
      continue;
    }

    if (looksLikeLive(item)) {
      buckets.live += 1;
      continue;
    }

    if (looksLikeAd(item)) {
      posts.push(mapAdPost(item));
      buckets.ad += 1;
    } else if (looksLikePoll(item)) {
      posts.push(mapPollPost(item));
      buckets.poll += 1;
    } else if (looksLikeTextOrPhoto(item)) {
      posts.push(mapTextPost(item));
      buckets.text += 1;
    } else if (looksLikeVideo(item)) {
      // Light feed ViewModel further filters videos via
      // `isLightFeedPost`, so this branch is where they exit the
      // light pipeline.
      buckets.video += 1;
    } else {
      // Stub posts (system messages, fully-empty shell posts, etc.)
      // that pass no classifier — these are the silent drops we
      // want to surface in logs.
      buckets.dropped += 1;
    }
  }
  debugFeedRepository('mapLightRawFeedPosts classifier', {
    raw: raw.length,
    ...buckets,
    mapped: posts.length,
  });
  return posts;
}

export function createFeedRepository(): FeedRepository {
  return {
    /**
     * Unified feed fetch — videos + text/photo in ONE network round-trip.
     *
     * We classify each raw post by `looksLikeVideo` first (because
     * WoWonder uses the same shape for everything; the postType flag is
     * what disambiguates). Posts that match neither classifier (rare —
     * e.g. shared posts with no media and no text after stripping)
     * are dropped to keep the feed clean.
     *
     * `/api/posts` already returns rows ordered by time descending, but
     * we sort defensively after merging in case the server-side order
     * ever changes (and so optimistic prepend stays consistent).
     */
    async getAllPosts(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
    ): Promise<FeedPost[]> {
      const page = await fetchRecommendedRawFeedPostsWithFallback(
        limit,
        afterPostId,
        source,
      );
      const posts: FeedPost[] = [];
      for (const item of page.posts) {
        if (isGroupRawPost(item) || looksLikeLive(item)) {
          continue;
        }

        if (looksLikeAd(item)) {
          posts.push(mapAdPost(item));
        } else if (looksLikeVideo(item)) {
          posts.push(mapVideoPost(item));
        } else if (looksLikePoll(item)) {
          // IMPORTANT: Check poll BEFORE text, because poll posts have text content
          // and would be caught by looksLikeTextOrPhoto first
          posts.push(mapPollPost(item));
        } else if (looksLikeTextOrPhoto(item)) {
          posts.push(mapTextPost(item));
        }
        // else: shared/empty/system stub — skip silently.
      }
      return mixAdsIntoPosts(posts);
    },

    async getLightPosts(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
    ): Promise<FeedPost[]> {
      const page = await fetchRecommendedRawFeedPostsWithFallback(
        Math.max(limit, Math.ceil(limit * 1.5)),
        afterPostId,
        source,
      );
      const posts: FeedPost[] = [];
      for (const item of page.posts) {
        if (isGroupRawPost(item) || looksLikeLive(item)) {
          continue;
        }

        if (looksLikeAd(item)) {
          posts.push(mapAdPost(item));
        } else if (looksLikePoll(item)) {
          posts.push(mapPollPost(item));
        } else if (looksLikeTextOrPhoto(item)) {
          posts.push(mapTextPost(item));
        }
      }
      return mixAdsIntoPosts(posts).slice(0, limit);
    },

    async getLightPostsPage(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
      requestedMaxScanPages = 4,
    ): Promise<FeedPostsPage> {
      const rawLimit = Math.max(limit * 3, 30);
      const maxScanPages = Math.min(
        4,
        Math.max(1, Math.floor(requestedMaxScanPages)),
      );
      const mappedById = new Map<string, FeedPost>();
      let cursor = afterPostId;
      let lastRawCursor: string | undefined;
      let reachedEnd = false;
      let primaryCount = 0;
      let scannedRawRows = 0;

      for (
        let scan = 0;
        scan < maxScanPages && mappedById.size < limit;
        scan += 1
      ) {
        const page = await fetchRecommendedRawFeedPostsWithFallback(
          rawLimit,
          cursor,
          source,
        );
        scannedRawRows += page.posts.length;
        primaryCount += page.primaryCount;

        for (const post of mapLightRawFeedPosts(page.posts)) {
          if (!mappedById.has(post.id)) {
            mappedById.set(post.id, post);
          }
        }

        const nextRawCursor = page.nextCursor ?? getOldestRawPostId(page.posts);
        const advancedCursor = Boolean(
          nextRawCursor && nextRawCursor !== cursor,
        );
        lastRawCursor = nextRawCursor;
        reachedEnd =
          page.reachedEnd === true ||
          page.posts.length === 0 ||
          !advancedCursor;

        if (reachedEnd || !advancedCursor) {
          break;
        }

        cursor = nextRawCursor;
      }

      const mappedPosts = mixAdsIntoPosts(Array.from(mappedById.values()));
      const posts = mappedPosts.slice(0, limit);
      const renderedCursor = getOldestFeedPostId(posts);
      const nextCursor =
        mappedPosts.length > limit
          ? renderedCursor
          : lastRawCursor ?? renderedCursor;

      debugFeedRepository('light posts page', {
        requestedLimit: limit,
        rawLimit,
        afterPostId: afterPostId ?? 'first',
        scannedRawRows,
        primaryCount,
        mapped: mappedPosts.length,
        returned: posts.length,
        renderedCursor: renderedCursor ?? '(none)',
        nextCursor: nextCursor ?? '(none)',
        reachedEnd,
      });

      return {
        posts,
        nextCursor,
        reachedEnd: reachedEnd && mappedPosts.length <= limit,
      };
    },

    async getVideoPosts(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
    ) {
      const page = await fetchRecommendedRawFeedPostsWithFallback(
        Math.max(limit, Math.ceil(limit * 1.5)),
        afterPostId,
        source,
      );
      return page.posts
        .filter(item => !isGroupRawPost(item))
        .filter(looksLikeVideo)
        .map(mapVideoPost)
        .slice(0, limit);
    },

    async getTextPosts(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
    ) {
      const page = await fetchRawFeedPosts(limit, afterPostId, source);
      return page.posts
        .filter(item => !isGroupRawPost(item))
        .filter(looksLikeTextOrPhoto)
        .map(mapTextPostBase);
    },

    async getHashtagPosts(tag: string, limit = 20, afterPostId?: string) {
      const normalizedTag = tag.replace(/^#+/, '').trim();
      if (!normalizedTag) return [];

      const payload: Record<string, unknown> = {
        type: 'hashtag',
        hash: normalizedTag,
        limit,
      };

      if (afterPostId) {
        payload.after_post_id = afterPostId;
      }

      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.posts, payload);

      return (response.data ?? [])
        .filter(looksLikeTextOrPhoto)
        .map(mapTextPostBase);
    },

    async recordRecommendationEvent(
      input: FeedRecommendationEventInput,
    ): Promise<void> {
      const payload: Record<string, unknown> = {
        event: input.event,
      };

      if (input.postId) {
        payload.post_id = input.postId;
      }
      if (input.value) {
        payload.value = input.value;
      }
      if (typeof input.durationMs === 'number') {
        payload.duration_ms = Math.max(0, Math.floor(input.durationMs));
      }

      try {
        await backendApi.post(apiRoutes.feed.recommendationEvents, payload);
      } catch (err) {
        debugFeedRepository('recommendation event ignored', {
          event: input.event,
          postId: input.postId ?? '(none)',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    async createPost(draft: CreatePostDraft): Promise<CreatePostResult> {
      // Build the multipart payload. Keys MUST match WoWonder's expected
      // POST fields (see phtml/api/phone/new_post.php). Empty optional
      // fields are omitted entirely so the backend defaults kick in.
      const context = resolveCreatePostContext(draft);
      const payload: Record<string, unknown> = {};

      if (context === 'personal' || context === 'page') {
        payload.postPrivacy = PRIVACY_TO_WIRE(draft.privacy);
        payload.privacy_contract = CONTENT_AUDIENCE_CONTRACT;
      }
      if (context === 'personal') {
        payload.is_anonymous = draft.isAnonymous ? '1' : '0';
      }

      if (draft.pageId) {
        payload.page_id = draft.pageId;
      }

      if (draft.groupId) {
        payload.group_id = draft.groupId;
      }

      if (draft.eventId) {
        payload.event_id = draft.eventId;
      }

      // Text — only send if non-empty after trim. WoWonder treats
      // whitespace-only `postText` as "no text" so we mirror that.
      const trimmedText = draft.text.trim();
      if (trimmedText) {
        payload.postText = trimmedText;
      }

      // Photos — single OR multi. The multipart helper appends each
      // file under `postPhotos[]` so PHP receives them as
      // `$_FILES['postPhotos']['name'][i]` regardless of count.
      if (draft.photos.length > 0) {
        payload.postPhotos = draft.photos.map(photo => ({
          uri: photo.uri,
          name: photo.name,
          type: photo.type,
        }));
        // When uploading >1 photo, WoWonder requires an `album_name` so
        // it can group the files. The album_name is shown as the post
        // title on the website but our mobile UI ignores it — we pass a
        // timestamped placeholder to satisfy the server check.
        if (draft.photos.length > 1) {
          payload.album_name = `Post ${new Date().toISOString()}`;
        }
      }

      if (draft.audio) {
        payload.postMusic = {
          uri: draft.audio.uri,
          name: draft.audio.name,
          type: draft.audio.type,
        };
      }

      // Video — single only. WoWonder's `new_post` accepts at most
      // one primary media type per post (photos / video / audio) —
      // the view-model guarantees the draft only contains one of
      // those buckets at a time, so we just add `postVideo` here.
      //
      // The multipart helper appends it under `postVideo` (not
      // `postVideo[]`) since WoWonder expects a single file under
      // that key.
      if (draft.video) {
        payload.postVideo = {
          uri: draft.video.uri,
          name: draft.video.name,
          type: draft.video.type,
        };
        if (draft.video.thumbnailUri) {
          payload.video_thumb = {
            uri: draft.video.thumbnailUri,
            name: draft.video.thumbnailName || `video-thumb-${Date.now()}.jpg`,
            type: draft.video.thumbnailType || 'image/jpeg',
          };
        }
        // Mark this as a video post so the feed mapper and the
        // homepage's `looksLikeVideo` classifier both pick it up.
        payload.postType = 'video';
      }

      if (draft.linkPreview) {
        payload.url_link = draft.linkPreview.url;
        payload.url_title = draft.linkPreview.title || draft.linkPreview.url;
        payload.url_content = draft.linkPreview.description || '';
        if (draft.linkPreview.image) {
          payload.url_image = draft.linkPreview.image;
        }
        // WoWonder's `Wo_RegisterPost` does not count `postLink*` fields
        // as post content, so a pure link-preview post is rejected as empty.
        // `postMap` is accepted as content by the backend but is not rendered
        // as a visible caption in our feed cards, which keeps shared map
        // locations as a clean preview card instead of a long URL blob.
        if (!trimmedText) {
          payload.postMap =
            draft.linkPreview.title?.trim() ||
            draft.linkPreview.description?.trim() ||
            'Shared location';
        }
      }

      // Feeling — two-field combo. `feeling_type` selects the bucket,
      // `feeling` is the value within that bucket.
      if (draft.feeling) {
        payload.feeling_type = draft.feeling.type;
        payload.feeling = draft.feeling.value;
      }

      const response = await backendApi.multipart<{
        api_status: number | string;
        post_data?: Record<string, unknown>;
        message?: string;
      }>(apiRoutes.feed.newPost, payload);

      const ok = String(response.api_status) === '200';
      if (!ok || !response.post_data) {
        throw new Error(
          response.message ?? 'Không đăng được bài. Vui lòng thử lại.',
        );
      }

      // Server returns the freshly-created post in the same shape as
      // `/api/posts` returns. Route it through `mapPost` so video uploads
      // are prepended as video cards instead of being coerced to text.
      const mappedPost = mapFeedPost(response.post_data);
      const post: FeedPost =
        mappedPost.kind === 'video' &&
        draft.video?.thumbnailUri &&
        !mappedPost.thumbnailUrl
          ? {
              ...mappedPost,
              thumbnailUrl: draft.video.thumbnailUri,
            }
          : mappedPost;

      return { postId: post.id, post };
    },

    async searchMentionSuggestions(
      query: string,
    ): Promise<ReelCaptionSuggestion[]> {
      const sessionUserId = sessionStorage.getSession()?.userId;
      if (!sessionUserId) return [];

      const response = await backendApi.post<{
        api_status: number | string;
        data?: {
          following?: Array<Record<string, unknown>>;
        };
      }>(apiRoutes.social.friends, {
        user_id: sessionUserId,
        type: 'following',
        limit: 50,
      });

      return (response.data?.following ?? [])
        .map(mapFollowingMention)
        .filter((item): item is ReelCaptionSuggestion => Boolean(item))
        .filter(item => matchesMentionQuery(item, query))
        .slice(0, 8);
    },

    async setReaction(postId, reaction) {
      // Same contract as Reels' `setReaction`:
      //   POST /api/post-actions { action: 'reaction', post_id, reaction: '1..6' }
      // The server checks `in_array($_POST['reaction'], array_keys($wo['reactions_types']))`
      // and the keys are integer ids, so we MUST send numeric strings.
      // Omitting the `reaction` field clears the viewer's existing one.
      const payload: Record<string, unknown> = {
        action: 'reaction',
        post_id: postId,
      };
      if (reaction !== null) {
        payload.reaction = REACTION_TO_WIRE[reaction];
      }

      const response = await backendApi.post<{
        api_status: number | string;
      }>(apiRoutes.feed.postActions, payload);
      const ok = String(response.api_status) === '200';
      if (!ok) {
        throw new Error('Không gửi được biểu cảm. Vui lòng thử lại.');
      }

      // Mirror to MMKV cache (shared with Reels' post-reactions storage)
      // so the next reload still shows the right emoji.
      const sessionUserId = sessionStorage.getSession()?.userId;
      reelsReactionsStorage.set(sessionUserId, postId, reaction);

      return { reaction };
    },

    async getUserPosts(userId, limit = 20, afterPostId) {
      try {
        const response = await backendApi.post<{
          api_status: number | string;
          data?: Array<Record<string, unknown>>;
        }>(apiRoutes.feed.posts, {
          type: 'get_user_posts',
          id: userId,
          limit,
          ...(afterPostId ? { after_post_id: afterPostId } : {}),
        });

        const ownRaw = response.data ?? [];
        const oldestOwnPostId = Math.min(
          ...ownRaw
            .map(item => Number(readString(item, 'id', 'post_id')))
            .filter(id => Number.isFinite(id) && id > 0),
        );

        const publicVideoRaw = afterPostId
          ? []
          : (
              await backendApi
                .post<{
                  api_status: number | string;
                  data?: Array<Record<string, unknown>>;
                }>(apiRoutes.feed.posts, {
                  type: 'get_random_videos',
                  limit: 50,
                })
                .catch(() => ({ data: [] as Array<Record<string, unknown>> }))
            ).data?.filter(item => {
              const postId = Number(readString(item, 'id', 'post_id'));
              return (
                String(readPostOwnerId(item)) === String(userId) &&
                (!Number.isFinite(oldestOwnPostId) || postId >= oldestOwnPostId)
              );
            }) ?? [];

        const rawMap = new Map<string, Record<string, unknown>>();
        for (const item of [...ownRaw, ...publicVideoRaw]) {
          if (looksLikeAd(item) || looksLikeLive(item)) continue;
          rawMap.set(rawPostKey(item), item);
        }

        const posts = Array.from(rawMap.values()).map(mapProfilePost);

        return posts.sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
      } catch (err) {
        console.error('[ApiFeedRepository] getUserPosts error:', err);
        throw err;
      }
    },

    async getPagePosts(pageId, limit = 20, afterPostId) {
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.posts, {
        type: 'get_page_posts',
        id: pageId,
        limit,
        ...(afterPostId ? { after_post_id: afterPostId } : {}),
      });

      const rawItems = response.data ?? [];
      const posts = rawItems
        .filter(item => !looksLikeAd(item))
        .map(item => {
          try {
            return mapProfilePost(item);
          } catch (err) {
            console.warn('[ApiFeedRepository] skip page post', {
              pageId,
              postId: readString(item, 'id', 'post_id'),
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          }
        })
        .filter(
          (post): post is FeedTextPost | FeedVideoPost | FeedPollPost =>
            post !== null,
        )
        .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));

      return {
        posts,
        nextCursor: getOldestFeedPostId(posts),
        reachedEnd: rawItems.length < limit,
      };
    },

    async getGroupPosts(groupId, limit = 20, afterPostId) {
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.posts, {
        type: 'get_group_posts',
        id: groupId,
        limit,
        ...(afterPostId ? { after_post_id: afterPostId } : {}),
      });

      const rawItems = response.data ?? [];
      const posts = rawItems
        .filter(item => !looksLikeAd(item))
        .map(item => {
          try {
            return mapProfilePost(item);
          } catch (err) {
            console.warn('[ApiFeedRepository] skip group post', {
              groupId,
              postId: readString(item, 'id', 'post_id'),
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          }
        })
        .filter(
          (post): post is FeedTextPost | FeedVideoPost | FeedPollPost =>
            post !== null,
        )
        .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));

      return {
        posts,
        nextCursor: getOldestFeedPostId(posts),
        reachedEnd: rawItems.length < limit,
      };
    },

    async getEventPosts(eventId, limit = 20, afterPostId) {
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.posts, {
        type: 'get_event_posts',
        id: eventId,
        limit,
        ...(afterPostId ? { after_post_id: afterPostId } : {}),
      });

      const rawItems = response.data ?? [];
      const posts = rawItems
        .filter(item => !looksLikeAd(item))
        .map(item => {
          try {
            return mapProfilePost(item);
          } catch (err) {
            console.warn('[ApiFeedRepository] skip event post', {
              eventId,
              postId: readString(item, 'id', 'post_id'),
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          }
        })
        .filter(
          (post): post is FeedTextPost | FeedVideoPost | FeedPollPost =>
            post !== null,
        )
        .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));

      return {
        posts,
        nextCursor: getOldestFeedPostId(posts),
        reachedEnd: rawItems.length < limit,
      };
    },

    async savePost(postId: string): Promise<{ saved: boolean }> {
      const response = await backendApi.post<{
        api_status: number | string;
        code?: number;
        action?: string;
        message?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'save',
        post_id: postId,
      });

      const ok = String(response.api_status) === '200' || response.code === 1;
      if (!ok) {
        throw new Error(response.message ?? 'Không lưu được bài viết.');
      }

      return { saved: ok };
    },

    async reportPost(postId, input): Promise<{ reported: boolean }> {
      const reportText = `${input.categoryLabel}: ${input.reasonLabel}`;
      const response = await backendApi.post<{
        api_status: number | string;
        code?: number;
        action?: string;
        message?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'report',
        post_id: postId,
        ensure_reported: 1,
        reason_code: input.reasonCode,
        reason: input.reasonLabel,
        reason_category_code: input.categoryCode,
        reason_category: input.categoryLabel,
        text: reportText,
      });

      const ok = String(response.api_status) === '200' || response.code === 1;
      if (!ok) {
        throw new Error(response.message ?? 'Không gửi được báo cáo.');
      }

      return { reported: ok };
    },

    async deletePost(postId: string): Promise<{ deleted: boolean }> {
      const response = await backendApi.post<{
        api_status: number | string;
        action?: string;
        message?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'delete',
        post_id: postId,
      });

      const deleted =
        String(response.api_status) === '200' &&
        (response.action ?? '').includes('deleted');
      if (!deleted) {
        throw new Error(response.message ?? 'Không xóa được bài viết.');
      }

      return { deleted };
    },

    async editPost(
      postId: string,
      input: { text: string; privacy?: PostPrivacy },
    ): Promise<{ edited: boolean }> {
      const response = await backendApi.post<{
        api_status: number | string;
        action?: string;
        message?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'edit',
        post_id: postId,
        text: input.text,
        privacy_type: PRIVACY_TO_WIRE(input.privacy ?? 'public'),
        privacy_contract: CONTENT_AUDIENCE_CONTRACT,
      });

      const edited =
        String(response.api_status) === '200' &&
        (response.action ?? '').includes('edited');
      if (!edited) {
        throw new Error(response.message ?? 'Không chỉnh sửa được bài viết.');
      }

      return { edited };
    },

    async togglePostComments(postId: string): Promise<{ enabled: boolean }> {
      const response = await backendApi.post<{
        api_status: number | string;
        code?: number;
        action?: string;
        message?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'disable_comments',
        post_id: postId,
      });

      const ok = String(response.api_status) === '200';
      if (!ok) {
        throw new Error(response.message ?? 'Không cập nhật được bình luận.');
      }

      return { enabled: Number(response.code ?? 0) === 1 };
    },

    async pinPost(
      postId: string,
      input: { type: 'profile' | 'page' | 'group' | 'event'; ownerId: string },
    ): Promise<{ pinned: boolean }> {
      const response = await backendApi.post<{
        api_status: number | string;
        code?: number;
        action?: string;
        message?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'pin_post',
        post_id: postId,
        pin_type: input.type,
        pin_owner_id: input.ownerId,
      });

      const ok = String(response.api_status) === '200';
      if (!ok) {
        throw new Error(response.message ?? 'Không ghim được bài viết.');
      }

      return { pinned: Number(response.code ?? 0) === 1 };
    },

    async sharePost(input: SharePostInput): Promise<FeedPost> {
      // `message` destination doesn't go through the `/api/posts` wire
      // format — WoWonder has no dedicated endpoint for "share post
      // to chat". Instead, we send a text-only message containing
      // the post's shareable URL. The recipient sees a normal text
      // message with a link back to the post — same behaviour the
      // web client's UI surfaces. We synthesise a stable URL via
      // `getShareableUrl` so the link is real and openable.
      if (input.destination === 'message') {
        const hasUserRecipient = Boolean(input.recipientUserId);
        const hasGroupRecipient = Boolean(input.recipientGroupId);
        if (hasUserRecipient === hasGroupRecipient) {
          throw new Error('Thiếu hoặc trùng đích nhận chia sẻ qua tin nhắn.');
        }

        const shareUrl = await getShareableUrl(input.postId, 'post');
        const note = input.text?.trim();
        const messageBody = note ? `${note}\n\n${shareUrl}` : shareUrl;

        // The text-only path is fine for the no-attachment case.
        // For richer sharing we'd need a wire-level `post_id`
        // parameter on `send-message`, which WoWonder does not
        // support today.
        type MessageShareResponse = {
          api_status: number | string;
          message_data?: Record<string, unknown>;
          data?: unknown;
          errors?: { error_text?: string };
          message?: string;
        };
        const sendResponse = input.recipientGroupId
          ? await backendApi.post<MessageShareResponse>(
              apiRoutes.messages.groupChat,
              {
                type: 'send',
                id: input.recipientGroupId,
                text: messageBody,
              },
            )
          : await backendApi.post<MessageShareResponse>(
              apiRoutes.messages.send,
              {
                user_id: input.recipientUserId,
                text: messageBody,
                message_hash_id: `${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 10)}`,
              },
            );

        const ok = String(sendResponse.api_status) === '200';
        if (!ok) {
          throw new Error(
            sendResponse.errors?.error_text ||
              sendResponse.message ||
              'Không gửi được tin nhắn chia sẻ. Vui lòng thử lại.',
          );
        }

        // We don't have a fresh FeedPost to return for this path
        // (the wire response is a message envelope, not a post).
        // Caller handles the success path via `onShared?.()`; the
        // returned object is a minimal stand-in so the type
        // contract holds.
        return {
          kind: 'text',
          id: input.postId,
          likeCount: 0,
          commentCount: 0,
          isLiked: false,
          myReaction: null,
          topReactions: [],
          photos: [],
          privacy: 'public',
          publisher: { id: '', name: '', username: '' },
          caption: note,
        } as FeedTextPost;
      }

      const payload: Record<string, unknown> = {
        id: input.postId,
      };

      if (input.text?.trim()) {
        payload.text = input.text.trim();
      }

      if (input.destination === 'timeline') {
        payload.type = 'share_post_on_timeline';
        payload.user_id = input.userId;
      } else if (input.destination === 'page') {
        payload.type = 'share_post_on_page';
        payload.page_id = input.pageId;
      } else if (input.destination === 'group') {
        payload.type = 'share_post_on_group';
        payload.group_id = input.groupId;
      }

      const response = await backendApi.post<{
        api_status: number | string;
        data?: Record<string, unknown>;
        errors?: { error_text?: string };
        message?: string;
      }>(apiRoutes.feed.posts, payload);

      if (String(response.api_status) !== '200' || !response.data) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể chia sẻ bài viết. Vui lòng thử lại.',
        );
      }

      return mapFeedPost(response.data);
    },

    async getPostById(postId, options = {}): Promise<GetPostByIdResult> {
      // The public `get-post-data` endpoint takes a comma-separated
      // `fetch` list to opt into each bucket. We default to post + comments
      // since the detail screen always shows both. `add_view=1` bumps the
      // post view counter server-side (no-ops if the post has no view
      // column, e.g. a text post).
      const fetchList =
        options.fetchComments === false
          ? 'post_data'
          : 'post_data,post_comments';

      const response = await backendApi.post<{
        api_status: number | string;
        post_data?: Record<string, unknown>;
        post_comments?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.getPost, {
        post_id: postId,
        fetch: fetchList,
        ...(options.addView ? { add_view: 1 } : {}),
      });

      if (String(response.api_status) !== '200' || !response.post_data) {
        throw new Error('Không tìm thấy bài viết hoặc bài viết đã bị gỡ.');
      }

      // The wire format is the same shape `Wo_PostData` returns — the
      // same `mapTextPost` used by the feed list handles it. The
      // branch is only on post type (text vs video), which `mapPost`
      // already disambiguates via `looksLikeVideo`.
      const post = mapFeedPost(response.post_data);
      const comments = (response.post_comments ?? []).map(mapPostComment);

      return { post, comments };
    },

    async getPostReactions(
      postId,
      reaction,
      limit = 20,
      offset = 0,
    ): Promise<PostReactionsPage> {
      // We always pull BOTH `reactions` (per-type counts) and `users`
      // (the requested slice) in a single round-trip — the backend
      // returns both regardless of the `reaction` filter, so there's
      // no second call to fetch tab badges. Pass `reaction` only when
      // the caller asked for one specific type so the backend can
      // skip the others on the users query.
      //
      // CRITICAL: this endpoint reads `$_GET['post_id']` on the PHP
      // side (`phtml/api/v2/endpoints/post-reactions.php:4`), NOT
      // `$_POST`. Sending the payload as the request body returns
      // `404 post_id can not be empty`. We pass it through axios
      // `config.params` so it gets serialized into the query string.
      const response = await backendApi.post<{
        api_status: number | string;
        post_id?: number | string;
        reactions?: Array<Record<string, unknown>>;
        users?: Array<Record<string, unknown>>;
        errors?: { error_text?: string };
        message?: string;
      }>(
        apiRoutes.feed.postReactions,
        {},
        {
          params: {
            post_id: postId,
            ...(reaction ? { reaction } : {}),
            limit,
            offset,
          },
        },
      );

      if (String(response.api_status) !== '200') {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không tải được danh sách cảm xúc.',
        );
      }

      const reactions = (response.reactions ?? [])
        .map(mapPostReactionCount)
        .filter((c): c is PostReactionCount => c !== null);

      const users = (response.users ?? [])
        .map(mapPostReactionUser)
        .filter((u): u is PostReactionUser => u !== null);

      // Offset-based pagination: if the server returned a full page,
      // there might be more. We treat `users.length < limit` as the
      // explicit end-of-list signal so we don't request a second page
      // that would return zero rows.
      const reachedEnd = users.length < limit;
      const nextOffset = reachedEnd ? undefined : String(offset + users.length);

      return {
        users,
        reactions,
        nextOffset,
        reachedEnd,
      };
    },
  };
}

// ── Helper: route a raw WoWonder post blob through the right mapper ────
//
// `Wo_PostData` returns a single post of any kind (text/photo/video/
// product/event/...), but in practice the feed list mostly uses text
// + video. We mirror the same dispatch the feed list does so the
// detail screen's renderer (which is union-aware) sees the right
// `kind` discriminator.
export function mapFeedPost(
  raw: Record<string, unknown>,
): FeedTextPost | FeedVideoPost | FeedPollPost {
  if (readSharedInfo(raw)) {
    return mapSharedOuterPost(raw);
  }
  if (looksLikePoll(raw)) {
    return mapPollPost(raw);
  }
  if (looksLikeVideo(raw)) {
    return mapVideoPost(raw);
  }
  return mapTextPost(raw);
}

function mapPostComment(raw: Record<string, unknown>): PostComment {
  const publisher =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    {};
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(publisher, 'name', 'full_name') ||
    username ||
    'Người dùng';

  // Mirror the same HTML-strip + WoWonder-token cleanup as posts so
  // comment text renders cleanly.
  const text = cleanCaption(readString(raw, 'text', 'comment_text'));

  const sessionUserId = sessionStorage.getSession()?.userId;
  const apiReaction = extractMyReaction(raw);
  const cachedReaction = reelsReactionsStorage.getComment(
    sessionUserId,
    readString(raw, 'id', 'comment_id'),
  );
  const myReaction = apiReaction ?? cachedReaction;

  return {
    id: readString(raw, 'id', 'comment_id'),
    text,
    postedAt: readNumber(raw, 'time') || undefined,
    publisher: {
      id: readString(publisher, 'user_id', 'id'),
      name,
      username,
      avatarUrl:
        readString(publisher, 'avatar', 'profile_picture') || undefined,
    },
    likeCount: readNumber(raw, 'comment_likes', 'likes'),
    isLiked:
      myReaction !== null || readBool(raw, 'is_comment_liked', 'isLiked'),
  };
}

// ── Post reactions mapping ───────────────────────────────────────────────
//
// `post-reactions.php` returns a single combined response shape regardless
// of whether the caller asked for one reaction type or all:
//
//   {
//     api_status: 200,
//     post_id: number,
//     reactions: [{ reaction: 'like'|'love'|'haha'|...|'angry', count: 5 }, ...],
//     users:     [{ user_id, name, username, avatar, reaction, is_following, ... }, ...]
//   }
//
// `reactions` lists ONLY the reaction types that have ≥1 user (i.e. a
// missing entry == zero count). We surface those counts to the UI as
// tab badges. `users` is the already-filtered slice for the requested
// tab (or all types interleaved when no filter is set), tagged with the
// specific reaction each user left.
function parseReactionType(raw: Record<string, unknown>): string {
  const rawReaction = raw.reaction;
  if (typeof rawReaction === 'string') {
    return rawReaction;
  }
  if (typeof rawReaction === 'number') {
    return String(rawReaction);
  }
  if (rawReaction && typeof rawReaction === 'object') {
    const rObj = rawReaction as Record<string, unknown>;
    const typeVal = rObj.type;
    if (typeof typeVal === 'string' && typeVal.length > 0) return typeVal;
    if (typeof typeVal === 'number') return String(typeVal);
  }

  const rawType = raw.type;
  if (typeof rawType === 'string' && rawType.length > 0) return rawType;
  if (typeof rawType === 'number') return String(rawType);

  const rawReactionType = raw.reaction_type;
  if (typeof rawReactionType === 'string' && rawReactionType.length > 0)
    return rawReactionType;
  if (typeof rawReactionType === 'number') return String(rawReactionType);

  return '';
}

function mapPostReactionCount(
  raw: Record<string, unknown>,
): PostReactionCount | null {
  const rawType = parseReactionType(raw);
  const reaction =
    WIRE_TO_REACTION[rawType] ?? WIRE_TO_REACTION[rawType.toLowerCase()];
  if (!reaction) return null;
  const count = readNumber(raw, 'count');
  return { reaction, count };
}

function mapPostReactionUser(
  raw: Record<string, unknown>,
): PostReactionUser | null {
  const rawType = parseReactionType(raw);
  const reaction =
    WIRE_TO_REACTION[rawType] ?? WIRE_TO_REACTION[rawType.toLowerCase()];
  if (!reaction) return null;

  // Backend strips a few private fields server-side via `$non_allowed`
  // but defensive reads keep us safe on older installs.
  const id = readString(raw, 'user_id', 'id');
  if (!id) return null;

  const firstName = readString(raw, 'first_name');
  const lastName = readString(raw, 'last_name');
  const username = readString(raw, 'username', 'user_name');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(raw, 'name', 'full_name') ||
    username ||
    'Người dùng';

  // Avatars arrive as either a full URL (when served through `Wo_GetMedia`)
  // or a bare `/upload/...` path on older installs — same dual format the
  // feed mapper already handles via `normalizeMediaUrl`.
  const avatarUrl =
    normalizeMediaUrl(readString(raw, 'avatar', 'profile_picture')) ||
    undefined;

  return {
    id,
    name,
    username,
    avatarUrl,
    reaction,
    isFollowing: readBool(raw, 'is_following'),
  };
}
