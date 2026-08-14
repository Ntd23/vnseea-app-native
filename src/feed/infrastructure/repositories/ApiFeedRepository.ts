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
import { ApiBridgeError } from '../../../shared-kernel/application/api/apiResponse';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { getShareableUrl } from '../../../shared-kernel/application/view-models/useShareViewModel';
import {
  REACTION_TO_WIRE,
  WIRE_TO_REACTION,
  type ReactionType,
} from '../../../shared-kernel/domain/reactions/reactionCatalog';
import type { ReelCaptionSuggestion } from '../../../reels/domain/types/reels.types';
import { reelsReactionsStorage } from '../../../reels/infrastructure/storage/reelsReactionsStorage';
import type {
  FeedSource,
  FeedPostsPage,
  FeedRepository,
  FeedRecommendationEventInput,
  GetTaggableUsersInput,
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
  FeedGroupContext,
  FeedLiveContext,
  FeedMediaGeometry,
  FeedPost,
  FeedPublisher,
  FeedAdPost,
  FeedTextPost,
  FeedVideoPost,
  FeedPollPost,
  FeedProductPost,
  FeedJobPost,
  PostFeeling,
  PostPrivacy,
  PostLinkPreview,
  PostLocation,
  PostTaggedUser,
  SharedPostPreviewModel,
} from '../../domain/types/feed.types';
import type { ProductItem } from '../../../product/domain/types/product.types';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import { mapJobQuestions } from '../../../jobs/application/mappers/jobQuestions';
import { buildSharedPostPreviewModel } from '../../application/sharing/sharedPostPreview';
import { mapProfileMediaActivity } from '../../application/mappers/profileMediaActivity';
import {
  CONTENT_AUDIENCE_CONTRACT,
  audienceFromWire,
  audienceToWire,
  type ContentAudienceWireContract,
} from '../../../shared-kernel/domain/types/contentAudience';
import { normalizeHostedMediaUrl } from '../../../community/application/groupDetailState';
import { mapFeedRequestsWithConcurrency } from './feedRequestPool';

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
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
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
  const nestedCanShare = readOptionalBool(permissions, 'can_share', 'canShare');
  const rootCanShare =
    permissions === raw
      ? undefined
      : readOptionalBool(raw, 'can_share', 'canShare');
  const backendCanShare = nestedCanShare ?? rootCanShare;
  const backendCanEdit = readOptionalBool(permissions, 'can_edit', 'canEdit');
  return {
    canDelete: readBool(permissions, 'can_delete', 'canDelete'),
    canEdit: backendCanEdit === true,
    canShare:
      backendCanShare === true &&
      privacy.isValid &&
      privacy.audience === 'public' &&
      !privacy.isAnonymous,
    canShareKnown: backendCanShare !== undefined,
  };
}

function readPositiveEntityId(raw: Record<string, unknown>, ...keys: string[]) {
  const value = readString(raw, ...keys).trim();
  if (!value) return '';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? value : '';
}

function readPagePublisherRecord(
  raw: Record<string, unknown>,
  fallbackPublisher: Record<string, unknown>,
) {
  const pageId = readPositiveEntityId(raw, 'page_id', 'pageId');
  if (!pageId) return null;

  for (const key of ['page_info', 'page_data']) {
    const candidate = raw[key];
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate)
    ) {
      continue;
    }
    const pageRecord = candidate as Record<string, unknown>;
    if (
      readPositiveEntityId(pageRecord, 'page_id', 'pageId') ||
      readString(pageRecord, 'page_name', 'page_title')
    ) {
      return pageRecord;
    }
  }

  const publisherPageId = readPositiveEntityId(
    fallbackPublisher,
    'page_id',
    'pageId',
  );
  const publisherLooksLikePage = Boolean(
    publisherPageId || readString(fallbackPublisher, 'page_name', 'page_title'),
  );
  return publisherLooksLikePage ? fallbackPublisher : null;
}

function readPostPresentation(raw: Record<string, unknown>) {
  const privacy = readPostPrivacy(raw);
  const permissions = readPostPermissions(raw, privacy);
  const accountPublisher =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    {};
  const pageId = readPositiveEntityId(raw, 'page_id', 'pageId');
  const pagePublisher = readPagePublisherRecord(raw, accountPublisher);
  const realPublisher = pagePublisher ?? accountPublisher;
  const viewerId = sessionStorage.getSession()?.userId;
  const rawOwnerId = readString(raw, 'user_id');
  const ownerId = pageId
    ? readString(pagePublisher ?? {}, 'user_id') ||
      (rawOwnerId !== '0' ? rawOwnerId : '') ||
      readString(accountPublisher, 'user_id')
    : rawOwnerId || readString(accountPublisher, 'user_id', 'id');
  const isOwner =
    readBool(raw, 'is_owner', 'isOwner') ||
    Boolean(viewerId && ownerId && String(viewerId) === ownerId);

  return {
    privacy,
    permissions: {
      ...permissions,
      // Older WoWonder responses do not expose `can_edit`. Ownership is the
      // reliable fallback and avoids granting edit rights to group admins who
      // may be allowed to delete somebody else's post.
      canEdit: permissions.canEdit === true || isOwner,
    },
    publisher:
      privacy.isAnonymous && !isOwner
        ? ({} as Record<string, unknown>)
        : realPublisher,
    publisherEntityType: pageId ? ('page' as const) : ('user' as const),
    pageId: pageId || undefined,
    ownerId: ownerId || undefined,
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
  const publisher = mapPostPublisher(raw, presentation, 'Người dùng', true);

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
    groupContext: mapPostGroupContext(raw),
    caption: readPostCaption(raw) || undefined,
    mentionNames: readPostMentionNames(raw),
    feeling: extractFeeling(raw),
    taggedUsers: extractTaggedUsers(raw),
    location: extractPostLocation(raw),
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
    isAnonymous:
      privacyResult.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous'),
    publisher,
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

function mapPostPublisher(
  raw: Record<string, unknown>,
  presentation: ReturnType<typeof readPostPresentation>,
  fallbackName: string,
  includeFollowing = false,
): FeedPublisher {
  const publisher = presentation.publisher;
  const isPage = presentation.publisherEntityType === 'page';
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = isPage
    ? readString(publisher, 'page_name', 'username', 'user_name')
    : readString(publisher, 'username', 'user_name');
  const name = presentation.isIdentityRedacted
    ? ''
    : isPage
    ? readString(publisher, 'page_title', 'name', 'full_name') ||
      username ||
      fallbackName
    : [firstName, lastName].filter(Boolean).join(' ').trim() ||
      readString(publisher, 'name', 'full_name') ||
      username ||
      fallbackName;

  if (presentation.isIdentityRedacted) {
    const redacted: FeedPublisher = {
      id: '',
      name: '',
      username: '',
    };
    if (isPage && presentation.pageId) {
      redacted.entityType = 'page';
      redacted.pageId = presentation.pageId;
      redacted.ownerId = presentation.ownerId;
    }
    return redacted;
  }

  const mapped: FeedPublisher = {
    id: isPage
      ? presentation.pageId || readString(publisher, 'page_id', 'id')
      : readString(publisher, 'user_id', 'id'),
    name,
    username,
    avatarUrl: readString(publisher, 'avatar', 'profile_picture') || undefined,
  };

  if (isPage && presentation.pageId) {
    mapped.entityType = 'page';
    mapped.pageId = presentation.pageId;
    mapped.ownerId = presentation.ownerId;
  }

  if (includeFollowing) {
    mapped.isFollowing =
      publisher['is_following'] === 1 ||
      publisher['is_following'] === 'yes' ||
      publisher['is_following'] === '1' ||
      publisher['is_following'] === true ||
      raw['is_following'] === 1 ||
      raw['is_following'] === 'yes' ||
      raw['is_following'] === '1' ||
      raw['is_following'] === true;
  }

  return mapped;
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
  return (
    normalizeHostedMediaUrl(url, _siteRoot, apiConfig.mediaBaseUrl) || undefined
  );
}

function mapPostGroupContext(
  raw: Record<string, unknown>,
): FeedGroupContext | undefined {
  const groupId = readString(raw, 'group_id', 'groupId');
  if (!groupId || groupId === '0') return undefined;

  const group =
    readNestedRecord(
      raw,
      'group_recipient',
      'group_info',
      'group_data',
      'group',
    ) ?? {};
  const username =
    readString(group, 'group_name', 'username') ||
    readString(raw, 'group_name');
  const title =
    cleanCaption(readString(group, 'group_title', 'name', 'title')) ||
    cleanCaption(readString(raw, 'group_title')) ||
    username ||
    'Nhóm';

  return {
    id: readString(group, 'group_id', 'id') || groupId,
    title,
    username,
    avatarUrl: normalizeMediaUrl(
      readString(group, 'avatar', 'group_avatar', 'profile_picture'),
    ),
    coverUrl: normalizeMediaUrl(readString(group, 'cover', 'group_cover')),
    url: readString(group, 'url') || undefined,
    privacy: readString(group, 'privacy') === '2' ? 'private' : 'public',
  };
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
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|blockquote|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (entity, code) => {
      const value = Number.parseInt(code, 16);
      return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
        ? String.fromCodePoint(value)
        : entity;
    })
    .replace(/&#(\d+);/g, (entity, code) => {
      const value = Number(code);
      return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
        ? String.fromCodePoint(value)
        : entity;
    })
    .replace(/@\[\d+\]/g, '')
    .replace(/#\[\d+\]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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

function mapPostTaggedUser(
  raw: Record<string, unknown>,
): PostTaggedUser | null {
  const id = readString(raw, 'user_id', 'id');
  const username = readString(raw, 'username', 'user_name');
  if (!id || !username) return null;

  const firstName = readString(raw, 'first_name');
  const lastName = readString(raw, 'last_name');
  const name =
    readString(raw, 'name', 'full_name') ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    username;

  return {
    id,
    name,
    username,
    avatarUrl:
      normalizeMediaUrl(readString(raw, 'avatar', 'profile_picture')) ||
      undefined,
  };
}

function extractTaggedUsers(
  raw: Record<string, unknown>,
): PostTaggedUser[] | undefined {
  const source = raw.tagged_users;
  if (!Array.isArray(source)) return undefined;
  const users = source
    .map(item =>
      item && typeof item === 'object'
        ? mapPostTaggedUser(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is PostTaggedUser => Boolean(item));
  return users.length > 0 ? users : undefined;
}

function extractPostLocation(
  raw: Record<string, unknown>,
): PostLocation | undefined {
  const label = cleanCaption(readString(raw, 'postMap', 'post_map')).trim();
  if (!label || label === 'Shared location') return undefined;
  return { label };
}

function mapVideoPost(raw: Record<string, unknown>): FeedVideoPost {
  const presentation = readPostPresentation(raw);
  const publisher = mapPostPublisher(raw, presentation, 'Người dùng', true);

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
  const publisherAvatarUrl = publisher.avatarUrl || undefined;
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
    groupContext: mapPostGroupContext(raw),
    caption: readPostCaption(raw) || undefined,
    mentionNames: readPostMentionNames(raw),
    feeling: extractFeeling(raw),
    taggedUsers: extractTaggedUsers(raw),
    location: extractPostLocation(raw),
    // Some endpoints return full Wo_GetMedia URLs, others still return
    // relative media paths. normalizePlayableMediaUrl handles both.
    videoUrl,
    thumbnailUrl,
    mediaGeometry: extractMediaGeometry(raw),
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    topReactions: extractTopReactions(raw, myReaction),
    privacy,
    privacyContract: privacyResult.contract,
    isAnonymous:
      privacyResult.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous'),
    linkPreview: extractLinkPreview(raw),
    publisher,
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
  if (looksLikeAd(raw) || looksLikeLive(raw)) return false;
  const postType = readString(raw, 'postType').toLowerCase();
  const file = normalizePlayableMediaUrl(readString(raw, 'postFile'));
  if (!file) return false;
  if (postType === 'video' || postType === 'reel') return true;
  return VIDEO_URL_PATTERN.test(file);
}

function looksLikeLive(raw: Record<string, unknown>): boolean {
  return readString(raw, 'postType', 'post_type').toLowerCase() === 'live';
}

function mapFeedLiveContext(
  raw: Record<string, unknown>,
): FeedLiveContext | undefined {
  if (!looksLikeLive(raw)) return undefined;

  const explicitState = readString(
    raw,
    'stream_state',
    'live_state',
    'still_live',
  )
    .trim()
    .toLowerCase();
  const stillLive = readOptionalBool(raw, 'still_live');
  const isOffline =
    readBool(raw, 'live_ended') ||
    stillLive === false ||
    ['offline', 'ended', 'deleted', '0'].includes(explicitState);
  const state: FeedLiveContext['state'] = isOffline
    ? 'offline'
    : ['stale', 'waiting', 'pending'].includes(explicitState)
    ? 'stale'
    : 'live';
  const caption = readPostCaption(raw);
  const [titleLine, ...descriptionLines] = caption
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const thumbnailUrl = normalizeMediaUrl(
    readString(raw, 'postFileThumb', 'live_bg', 'postPhoto'),
  );

  return {
    state,
    streamName: readString(raw, 'stream_name', 'stream') || undefined,
    title: titleLine || undefined,
    description: descriptionLines.join('\n').trim() || undefined,
    thumbnailUrl: thumbnailUrl || undefined,
    viewerCount: readNumber(
      raw,
      'live_sub_users',
      'live_viewers',
      'viewer_count',
      'viewerCount',
      'watching_count',
    ),
    startedAt: readNumber(raw, 'live_time', 'time') || undefined,
  };
}

function markLiveShareUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('live', '1');
    return url.toString();
  } catch {
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}live=1`;
  }
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

function extractMediaGeometry(
  raw: Record<string, unknown>,
): FeedMediaGeometry | undefined {
  const nested =
    raw.media_geometry &&
    typeof raw.media_geometry === 'object' &&
    !Array.isArray(raw.media_geometry)
      ? (raw.media_geometry as Record<string, unknown>)
      : raw;
  const width = readNumber(nested, 'width', 'media_width');
  const height = readNumber(nested, 'height', 'media_height');
  if (width <= 0 || height <= 0) return undefined;

  return { width, height, aspectRatio: width / height };
}

function extractPhotoUrls(raw: Record<string, unknown>): string[] {
  const urls: string[] = [];

  const tryPush = (
    url: string | undefined,
    allowExtensionlessHostedImage = false,
  ) => {
    if (!url) return;
    const fullUrl = normalizeMediaUrl(url);
    if (!fullUrl) return;
    if (
      !IMAGE_URL_PATTERN.test(fullUrl) &&
      !(
        allowExtensionlessHostedImage &&
        /^https?:\/\//i.test(fullUrl) &&
        !VIDEO_URL_PATTERN.test(fullUrl) &&
        !AUDIO_URL_PATTERN.test(fullUrl)
      )
    ) {
      return;
    }
    if (urls.includes(fullUrl)) return;
    urls.push(fullUrl);
  };

  // Path 1: single-photo post
  tryPush(readString(raw, 'postFile'));

  // Path 4: link-preview / imported image
  tryPush(readString(raw, 'postPhoto'), true);

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
        tryPush(item, true);
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
          tryPush(preferredImage, true);
        } else {
          tryPush(readString(obj, 'url', 'source', 'src', 'photo'), true);
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
  if (looksLikeProductPost(raw)) return false;
  if (looksLikeJobPost(raw)) return false;
  if (looksLikeVideo(raw)) return false;
  const text = readString(raw, 'postText').trim();
  const hasPhoto = extractPhotoUrls(raw).length > 0;
  const hasAudio = AUDIO_URL_PATTERN.test(readString(raw, 'postFile'));
  const hasLinkPreview = Boolean(readString(raw, 'postLink'));
  const shared = readSharedInfo(raw);
  const hasSharedContent = shared
    ? looksLikeLive(shared) ||
      looksLikeVideo(shared) ||
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
  const publisher = mapPostPublisher(shared, presentation, 'Người dùng');

  return {
    id: readString(shared, 'id', 'post_id'),
    caption: readPostCaption(shared) || undefined,
    mentionNames: readPostMentionNames(shared),
    isAnonymous: presentation.isIdentityRedacted,
    publisherName: publisher.name,
    publisherAvatar: publisher.avatarUrl,
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

function mapStandardContextPost(
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

function mapProfilePost(
  raw: Record<string, unknown>,
): FeedTextPost | FeedVideoPost | FeedPollPost | FeedJobPost {
  return looksLikeJobPost(raw) ? mapJobPost(raw) : mapStandardContextPost(raw);
}

function mapTextPostBase(raw: Record<string, unknown>): FeedTextPost {
  const presentation = readPostPresentation(raw);
  const publisher = mapPostPublisher(raw, presentation, 'Người dùng');

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
    liveContext: mapFeedLiveContext(raw),
    groupContext: mapPostGroupContext(raw),
    activity: mapProfileMediaActivity(readString(raw, 'postType', 'post_type')),
    caption,
    mentionNames: readPostMentionNames(raw),
    feeling: extractFeeling(raw),
    taggedUsers: extractTaggedUsers(raw),
    location: extractPostLocation(raw),
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
    privacy,
    privacyContract: privacyResult.contract,
    isAnonymous:
      privacyResult.isAnonymous || readBool(raw, 'is_anonymous', 'isAnonymous'),
    linkPreview: extractLinkPreview(raw),
    publisher,
    sharedFrom: mapSharedFrom(raw),
  };
}

function mapSharedPostPreview(
  raw: Record<string, unknown>,
): SharedPostPreviewModel {
  if (looksLikeLive(raw)) {
    return buildSharedPostPreviewModel(mapTextPostBase(raw));
  }
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

function readNestedImages(
  entity: Record<string, unknown>,
): ProductItem['images'] {
  const images = Array.isArray(entity.images) ? entity.images : [];
  return images
    .map((item, index) => {
      const record =
        item && typeof item === 'object' && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : null;
      const image = normalizeMediaUrl(
        typeof item === 'string'
          ? item
          : record
          ? readString(record, 'image', 'image_org', 'url', 'src')
          : '',
      );
      if (!image) return null;
      return {
        id: record ? readNumber(record, 'id') || index + 1 : index + 1,
        image,
        product_id: record ? readNumber(record, 'product_id', 'productId') : 0,
      };
    })
    .filter((item): item is ProductItem['images'][number] => Boolean(item));
}

function looksLikeProductPost(raw: Record<string, unknown>) {
  const postType = readString(raw, 'postType', 'post_type').toLowerCase();
  return Boolean(
    readNestedRecord(raw, 'product', 'product_data') ||
      postType === 'product' ||
      readNumber(raw, 'product_id') > 0,
  );
}

function mapProductPost(raw: Record<string, unknown>): FeedProductPost {
  const base = mapTextPostBase(raw);
  const product = readNestedRecord(raw, 'product', 'product_data') ?? {};
  const seller =
    readNestedRecord(product, 'seller', 'user_data', 'publisher') ?? {};
  const productId =
    readNumber(product, 'id', 'product_id') || readNumber(raw, 'product_id');
  const images = readNestedImages(product);
  const fallbackImage =
    readNestedImage(product) ||
    base.photos[0] ||
    normalizeMediaUrl(readString(raw, 'postFile'));
  if (images.length === 0 && fallbackImage) {
    images.push({ id: 1, image: fallbackImage, product_id: productId });
  }

  const sellerId =
    readNumber(seller, 'user_id', 'id') ||
    Number(base.publisher.id || readString(raw, 'user_id')) ||
    0;
  const postId = readNumber(product, 'post_id') || Number(base.id) || 0;

  return {
    ...base,
    kind: 'product',
    product: {
      id: productId,
      user_id: readNumber(product, 'user_id') || sellerId,
      name:
        cleanCaption(readString(product, 'name', 'title', 'product_title')) ||
        'Sản phẩm',
      category: readNumber(product, 'category', 'category_id'),
      category_name: cleanCaption(
        readString(product, 'category_name', 'category_label'),
      ),
      product_sub_category:
        readString(product, 'product_sub_category') || undefined,
      sub_category: readNumber(product, 'sub_category', 'sub_id') || undefined,
      description: cleanCaption(readString(product, 'description')),
      price: readString(product, 'price', 'product_price'),
      points:
        readString(
          product,
          'points',
          'product_points',
          'point_price',
          'points_price',
        ) || undefined,
      currency: readString(product, 'currency'),
      currency_code: readString(product, 'currency_code', 'currency'),
      currency_symbol: readString(product, 'currency_symbol'),
      price_format:
        readString(product, 'price_format', 'price_text') || undefined,
      location: cleanCaption(readString(product, 'location')),
      lat: readString(product, 'lat') || undefined,
      lng: readString(product, 'lng') || undefined,
      type: readNumber(product, 'type'),
      units: readNumber(product, 'units') || undefined,
      rating: readString(product, 'rating') || undefined,
      reviews_count: readString(product, 'reviews_count') || undefined,
      active: readNumber(product, 'active') || 1,
      post_id: postId,
      time: readString(product, 'time') || String(base.postedAt ?? ''),
      images,
      seller: {
        user_id: sellerId,
        username:
          readString(seller, 'username', 'user_name') ||
          base.publisher.username,
        name:
          cleanCaption(readString(seller, 'name', 'full_name')) ||
          base.publisher.name,
        avatar:
          normalizeMediaUrl(readString(seller, 'avatar', 'profile_picture')) ||
          base.publisher.avatarUrl ||
          '',
      },
      is_owner: readBool(product, 'is_owner', 'isOwner'),
      can_contact_seller:
        readOptionalBool(product, 'can_contact_seller', 'canContactSeller') ??
        true,
      can_add_to_cart:
        readOptionalBool(product, 'can_add_to_cart', 'canAddToCart') ?? true,
    },
  };
}

function looksLikeJobPost(raw: Record<string, unknown>) {
  const postType = readString(raw, 'postType', 'post_type').toLowerCase();
  return Boolean(
    readNestedRecord(raw, 'job', 'job_data') ||
      postType === 'job' ||
      readNumber(raw, 'job_id') > 0,
  );
}

function mapJobPost(raw: Record<string, unknown>): FeedJobPost {
  const base = mapTextPostBase(raw);
  const job = readNestedRecord(raw, 'job', 'job_data') ?? {};
  const page = readNestedRecord(job, 'page') ?? readNestedRecord(raw, 'page');
  const jobImage =
    readNestedImage(job) ||
    base.photos[0] ||
    normalizeMediaUrl(readString(raw, 'postFile')) ||
    '';
  const jobId = readString(job, 'id', 'job_id') || readString(raw, 'job_id');
  const postId = readString(job, 'post_id') || base.id;
  const pageId =
    readString(job, 'page_id') || readString(page ?? {}, 'page_id', 'id');
  const pageTitle =
    cleanCaption(readString(page ?? {}, 'page_title', 'name', 'full_name')) ||
    base.publisher.name;

  const mappedJob: JobsItem = {
    id: jobId,
    title:
      cleanCaption(readString(job, 'title', 'job_title', 'name')) || 'Việc làm',
    description: cleanCaption(readString(job, 'description')),
    location: cleanCaption(readString(job, 'location', 'address')),
    lat: readString(job, 'lat') || undefined,
    lng: readString(job, 'lng') || undefined,
    minimum: readNumber(job, 'minimum') || undefined,
    maximum: readNumber(job, 'maximum') || undefined,
    salary_date: readString(job, 'salary_date'),
    salary_date_label:
      readString(job, 'salary_date_label') || readString(job, 'salary_date'),
    job_type: readString(job, 'job_type'),
    job_type_label:
      readString(job, 'job_type_label') || readString(job, 'job_type'),
    category: readString(job, 'category'),
    category_label:
      readString(job, 'category_label') || readString(job, 'category'),
    currency: readString(job, 'currency') || undefined,
    currency_code: readString(job, 'currency_code') || undefined,
    currency_symbol: readString(job, 'currency_symbol') || undefined,
    image: jobImage,
    image_type: readString(job, 'image_type') || undefined,
    page_id: pageId,
    user_id: readString(job, 'user_id') || base.publisher.id,
    time: readNumber(job, 'time') || base.postedAt || 0,
    post_id: postId || undefined,
    apply: readBool(job, 'apply'),
    apply_count: readNumber(job, 'apply_count'),
    questions: mapJobQuestions(job),
    url: readString(job, 'url') || undefined,
    page: page
      ? {
          page_id: pageId,
          page_title: pageTitle,
          page_name: readString(page, 'page_name', 'username'),
          page_description: cleanCaption(
            readString(page, 'page_description', 'description'),
          ),
          avatar:
            normalizeMediaUrl(readString(page, 'avatar', 'profile_picture')) ||
            base.publisher.avatarUrl ||
            '',
          cover: normalizeMediaUrl(readString(page, 'cover')) || '',
          user_id: readString(page, 'user_id') || base.publisher.id,
          is_page_onwer: readBool(page, 'is_page_onwer', 'is_page_owner'),
        }
      : undefined,
  };

  return {
    ...base,
    kind: 'job',
    job: mappedJob,
    publisher: mappedJob.page
      ? {
          id: String(mappedJob.page.page_id || base.publisher.pageId || ''),
          name: mappedJob.page.page_title || base.publisher.name,
          username: mappedJob.page.page_name || base.publisher.username,
          avatarUrl: mappedJob.page.avatar || base.publisher.avatarUrl,
          entityType: 'page',
          pageId: String(mappedJob.page.page_id || base.publisher.pageId || ''),
          ownerId: String(
            mappedJob.page.user_id || base.publisher.ownerId || '',
          ),
        }
      : base.publisher,
  };
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
const DISCOVERY_AUTHOR_COHORT_SIZE = 8;
const DISCOVERY_AUTHOR_REQUEST_CONCURRENCY = 4;
const MIN_RECOMMENDED_PAGE_FILL_RATIO = 0.7;

const suggestedUsersCache = new Map<
  string,
  { ids: string[]; expiresAt: number }
>();
const suggestedAuthorOffsets = new Map<string, number>();
const activeSuggestedAuthorCohorts = new Map<string, string[]>();
type RecommendedEndpointAvailability = 'unknown' | 'available' | 'unsupported';
let recommendedEndpointAvailability: RecommendedEndpointAvailability =
  'unknown';

function getCachedSuggestedIds(viewerId: string): string[] | null {
  const entry = suggestedUsersCache.get(viewerId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    suggestedUsersCache.delete(viewerId);
    activeSuggestedAuthorCohorts.delete(viewerId);
    return null;
  }
  return entry.ids;
}

function setCachedSuggestedIds(viewerId: string, ids: string[]): void {
  suggestedUsersCache.set(viewerId, {
    ids,
    expiresAt: Date.now() + SUGGESTED_CACHE_TTL_MS,
  });
  const previousOffset = suggestedAuthorOffsets.get(viewerId) ?? 0;
  suggestedAuthorOffsets.set(
    viewerId,
    ids.length > 0 ? previousOffset % ids.length : 0,
  );
  if (ids.length === 0) {
    activeSuggestedAuthorCohorts.delete(viewerId);
  }
}

function takeNextSuggestedAuthorIds(
  viewerId: string,
  ids: string[],
  limit: number,
): string[] {
  if (ids.length <= limit) return ids;

  const start = suggestedAuthorOffsets.get(viewerId) ?? 0;
  const picked = Array.from(
    { length: Math.min(limit, ids.length) },
    (_, index) => ids[(start + index) % ids.length],
  );
  suggestedAuthorOffsets.set(viewerId, (start + picked.length) % ids.length);
  return picked;
}

function getSuggestedAuthorIdsForPage(
  viewerId: string,
  ids: string[],
  limit: number,
  _afterPostId?: string,
): string[] {
  const availableIds = new Set(ids);
  const activeCohort = (
    activeSuggestedAuthorCohorts.get(viewerId) ?? []
  ).filter(id => availableIds.has(id));
  if (activeCohort.length > 0) {
    return activeCohort.slice(0, limit);
  }

  // A single shared `after_post_id` is only safe when the same author cohort
  // is used for the complete pagination run. Fresh video/head probes can run
  // between two light-feed pages, so they must reuse (not replace) the active
  // cohort as well. The TTL expiry above starts the next rotation safely.
  const picked = takeNextSuggestedAuthorIds(viewerId, ids, limit);
  activeSuggestedAuthorCohorts.set(viewerId, picked);
  return picked;
}

// Per-row fan-out logs are extremely expensive in React Native DEV builds and
// were measurably blocking the JS thread during pagination. Keep diagnostics
// opt-in at the call site while normal development uses the production path.
const FEED_REPOSITORY_DEBUG = false;
// Diagnostic total-count probes fan out several extra API requests and must
// never compete with the user's first feed page. Enable locally only when
// explicitly investigating backend inventory.
const FEED_REPOSITORY_NETWORK_PROBES = false;

type RawFeedPostsPage = {
  posts: Array<Record<string, unknown>>;
  nextCursor?: string;
  primaryCount: number;
  reachedEnd?: boolean;
  sourceKind?: 'recommended' | 'legacy';
};

export function resetFeedRepositoryPaginationStateForTests(): void {
  suggestedUsersCache.clear();
  suggestedAuthorOffsets.clear();
  activeSuggestedAuthorCohorts.clear();
  recommendedEndpointAvailability = 'unknown';
}

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
    // Ads use their campaign/ad id in the same `id` field as posts. That id
    // does not belong to the post timeline and must never become
    // `after_post_id` (a real device snapshot contained post ids 3781-4504
    // plus ad id 18, which poisoned the whole feed cursor with `18`).
    .filter(item => !looksLikeAd(item))
    .map(item => Number(readString(item, 'id', 'post_id')))
    .filter(id => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return undefined;
  return String(Math.min(...ids));
}

function isRawCursorBackedByAd(
  cursor: string | undefined,
  posts: Array<Record<string, unknown>>,
): boolean {
  if (!cursor) return false;
  return posts.some(
    item => looksLikeAd(item) && readString(item, 'id', 'ad_id') === cursor,
  );
}

function isRecommendedEndpointUnsupportedError(error: unknown): boolean {
  if (error instanceof ApiBridgeError && error.apiStatus === '404') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /API Type Not Found/i.test(message);
}

function getSafestNextRawCursor(
  afterPostId: string | undefined,
  candidates: Array<string | undefined>,
): string | undefined {
  const current = Number(afterPostId);
  const numericCandidates = candidates
    .map(value => Number(value))
    .filter(
      value =>
        Number.isFinite(value) &&
        value > 0 &&
        (!Number.isFinite(current) || value < current),
    );

  if (numericCandidates.length > 0) {
    // Multiple client-side streams share one cursor. Continue from the least
    // advanced stream so slower sources are re-read/deduped instead of being
    // skipped permanently.
    return String(Math.max(...numericCandidates));
  }

  return candidates.find(value => {
    if (!value || value === afterPostId) return false;
    // Numeric post-id cursors must only move toward older rows. Preserve
    // opaque cursor compatibility, but never jump back to a larger post id.
    return !Number.isFinite(current) || !Number.isFinite(Number(value));
  });
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
  recommendedEndpointAvailability = 'available';
  const responseCursor =
    response.next_cursor !== null && response.next_cursor !== undefined
      ? String(response.next_cursor)
      : undefined;
  const nextCursor =
    responseCursor && !isRawCursorBackedByAd(responseCursor, rows)
      ? responseCursor
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
  minimumUsablePosts = 0,
): Promise<RawFeedPostsPage> {
  if (recommendedEndpointAvailability === 'unsupported') {
    return fetchRawFeedPosts(limit, afterPostId, source);
  }

  let page: RawFeedPostsPage;
  try {
    page = await fetchRecommendedRawFeedPosts(limit, afterPostId, source);
  } catch (err) {
    if (isRecommendedEndpointUnsupportedError(err)) {
      recommendedEndpointAvailability = 'unsupported';
    }
    debugFeedRepository('recommended-feed fallback', {
      afterPostId: afterPostId ?? 'first',
      error: err instanceof Error ? err.message : String(err),
    });
    return fetchRawFeedPosts(limit, afterPostId, source);
  }

  const usableLightPostCount =
    minimumUsablePosts > 0
      ? mapLightRawFeedPosts(page.posts).length
      : page.posts.length;
  const hasEnoughUsablePosts =
    minimumUsablePosts <= 0 || usableLightPostCount >= minimumUsablePosts;
  const hasAdvancingCursor = Boolean(
    page.nextCursor && page.nextCursor !== afterPostId,
  );
  const recommendedPageIsUsable =
    page.posts.length > 0 &&
    !page.reachedEnd &&
    hasEnoughUsablePosts &&
    (page.posts.length >= limit || hasAdvancingCursor);

  if (recommendedPageIsUsable) {
    return page;
  }

  // Once pagination has started, an advancing cursor is more reliable than
  // `reached_end`, but only when the recommended lane supplied enough rows
  // that Home can actually render. Sparse media/stub windows still need the
  // legacy own/follow/discovery lanes to fill the visible page.
  if (hasAdvancingCursor && hasEnoughUsablePosts) {
    debugFeedRepository('recommended-feed cursor continuation', {
      afterPostId,
      nextCursor: page.nextCursor ?? '(none)',
      usableLightPostCount,
      minimumUsablePosts,
      reachedEnd: page.reachedEnd === true,
    });
    return page;
  }

  // Keep fallback errors visible to the caller. Retrying the complete fan-out
  // immediately inside this function would double the wait and can still be
  // mistaken for an empty feed by higher layers.
  let legacyPage: RawFeedPostsPage;
  try {
    legacyPage = await fetchRawFeedPosts(limit, afterPostId, source);
  } catch (err) {
    if (page.posts.length > 0) {
      debugFeedRepository('legacy fallback ignored', {
        afterPostId: afterPostId ?? 'first',
        recommended: page.posts.length,
        error: err instanceof Error ? err.message : String(err),
      });
      return page;
    }
    throw err;
  }
  if (legacyPage.posts.length > 0) {
    const merged = new Map<string, Record<string, unknown>>();
    for (const post of [...page.posts, ...legacyPage.posts]) {
      merged.set(rawPostKey(post), post);
    }
    const posts = Array.from(merged.values());
    const nextCursor = getSafestNextRawCursor(afterPostId, [
      page.nextCursor,
      legacyPage.nextCursor,
      getOldestRawPostId(page.posts),
      getOldestRawPostId(legacyPage.posts),
    ]);
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
      reachedEnd: false,
      sourceKind: 'legacy',
    };
  }

  if (page.posts.length > 0 || page.reachedEnd) {
    return page;
  }

  return legacyPage;
}

async function fetchRawFeedPosts(
  limit: number,
  afterPostId?: string,
  source: FeedSource = 'all',
): Promise<RawFeedPostsPage> {
  let streamAttemptCount = 0;
  let streamFailureCount = 0;
  const tryFetch = async (
    payload: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> => {
    const streamTag = String(payload.type ?? 'unknown');
    streamAttemptCount += 1;
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
      streamFailureCount += 1;
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
  ): Promise<{
    posts: Array<Record<string, unknown>>;
    nextCursor?: string;
  }> => {
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
      // Relationship authors come first so a large suggestion response cannot
      // push followed/follower accounts out of the first discovery window.
      collectUserIds(friendsRes.data?.following).forEach(id => userIds.add(id));
      collectUserIds(friendsRes.data?.followers).forEach(id => userIds.add(id));
      collectUserIds(sugRes.suggestions).forEach(id => userIds.add(id));
      collectUserIds(nearbyRes.nearby_users).forEach(id => userIds.add(id));
      if (sessionUserIdLocal) userIds.delete(sessionUserIdLocal);

      setCachedSuggestedIds(cacheKey, Array.from(userIds));
    }

    const ids = getCachedSuggestedIds(cacheKey);
    if (!ids || ids.length === 0) {
      return { posts: [] };
    }

    const pickedIds = getSuggestedAuthorIdsForPage(
      cacheKey,
      ids,
      DISCOVERY_AUTHOR_COHORT_SIZE,
      afterPostId,
    );
    const perUserLimit = 10;

    // A 20-request Promise.all burst made pagination wait for the slowest
    // author and frequently saturated the mobile HTTP connection pool. Eight
    // pinned authors still provide up to 80 raw rows, while four workers keep
    // the fallback responsive without changing cursor ordering.
    const perUser = await mapFeedRequestsWithConcurrency(
      pickedIds,
      DISCOVERY_AUTHOR_REQUEST_CONCURRENCY,
      id =>
        tryFetch({
          type: 'get_user_posts',
          id,
          limit: perUserLimit,
          // First page: no cursor → freshest posts. On paging: only
          // fetch older-than-cursor so we don't re-emit the same
          // posts the followed feed already gave us.
          after_post_id: afterPostId,
        }),
    );

    return {
      posts: perUser.flat(),
      // Each author is an independent timeline. Taking the minimum id after
      // flattening every author can jump thousands of posts when one sparse
      // account has a very old row. Use the least-advanced author cursor
      // instead so active authors can continue page by page without gaps.
      nextCursor: getSafestNextRawCursor(
        afterPostId,
        perUser.map(rows => getOldestRawPostId(rows)),
      ),
    };
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

    if (
      followedRaw.length === 0 &&
      streamAttemptCount > 0 &&
      streamFailureCount === streamAttemptCount
    ) {
      throw new Error('Feed transport failed for every requested stream.');
    }

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

  // Preserve a complete window from the viewer's own timeline. A shared
  // cursor cannot safely advance past rows that were deliberately capped.
  const ownRawLimit = sessionUserId ? Math.min(50, Math.max(20, limit)) : 0;

  // ── Diagnostic: log total raw posts available per source ──
  //
  // On the first page (no cursor) we fire three cheap "max-limit"
  // probes in parallel to know the total pool of content the user
  // could in principle see. This answers the "is the feed short
  // because the install is empty, or because the dedupe / classifier
  // is eating things?" question with hard numbers instead of guessing.
  if (FEED_REPOSITORY_NETWORK_PROBES && !afterPostId) {
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
  const firstPageDiscoveryPromise = !afterPostId
    ? fetchDiscoveryPosts(undefined)
    : null;
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
          // Fetch a complete own-post window and dedupe it against followed
          // posts later without discarding cursor-covered rows.
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
  let discoveryCursor: string | undefined;
  if (firstPageDiscoveryPromise) {
    const discoveryPage = await firstPageDiscoveryPromise;
    discoveryRaw = discoveryPage.posts;
    discoveryCursor = discoveryPage.nextCursor;
  } else {
    // Keep the same relationship cohort moving with the cursor. Otherwise
    // older posts from active followed/follower accounts are skipped after
    // their first ten-row window.
    const discoveryPage = await fetchDiscoveryPosts(afterPostId);
    discoveryRaw = discoveryPage.posts;
    discoveryCursor = discoveryPage.nextCursor;
  }

  // Merge + dedupe by post id using a Map (O(1) lookup, no Set→Array churn).
  //
  // Keep every fetched source row and dedupe only by id. This preserves the
  // same own-post inventory that Profile can paginate through.
  const mergedMap = new Map<string, Record<string, unknown>>();
  const maxAdsPerPage = 3;
  let pageAdsIncluded = 0;
  let ownPostsIncluded = 0;
  const dropCounters = {
    adSkipped: 0,
    noId: 0,
    duplicate: 0,
  };

  const pushPost = (post: Record<string, unknown>) => {
    const isAd = looksLikeAd(post);
    if (isAd && pageAdsIncluded >= maxAdsPerPage) {
      dropCounters.adSkipped += 1;
      return;
    }
    const ownerId = readPostOwnerId(post);
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
    if (isAd) pageAdsIncluded += 1;
    if (sessionUserId && ownerId === String(sessionUserId)) {
      ownPostsIncluded += 1;
    }
  };

  // Phase 1: retain the viewer's own cursor window in full.
  for (const post of ownRaw) {
    pushPost(post);
  }

  // Phase 2: merge followed + discovery + public and dedupe overlaps.
  for (const post of followedRaw) {
    pushPost(post);
  }
  for (const post of discoveryRaw) {
    pushPost(post);
  }
  for (const post of publicRaw) {
    pushPost(post);
  }

  const merged = Array.from(mergedMap.values());

  if (
    merged.length === 0 &&
    streamAttemptCount > 0 &&
    streamFailureCount === streamAttemptCount
  ) {
    throw new Error('Feed transport failed for every requested stream.');
  }

  debugFeedRepository('raw streams merged', {
    afterPostId: afterPostId ?? 'first',
    requestedLimit: limit,
    followed: followedRaw.length,
    own: ownRaw.length,
    ownLimit: ownRawLimit,
    ownIncluded: ownPostsIncluded,
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
  const ownCursor = getOldestRawPostId(ownRaw);
  const nextCursor = getSafestNextRawCursor(afterPostId, [
    followedCursor,
    discoveryCursor,
    ownCursor,
  ]);
  const primaryCount = followedRaw.length;

  return {
    posts: merged,
    nextCursor,
    primaryCount,
  };
}

function mixAdsIntoPosts(posts: FeedPost[]): FeedPost[] {
  const maxAdsPerPage = 3;
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
  ads.slice(0, maxAdsPerPage).forEach((ad, index) => {
    const insertAt = Math.min(content.length, 4 + index * 6);
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
    if (draft.privacy !== 'public' && draft.privacy !== 'followers') {
      throw new Error('Invalid page audience.');
    }
    return 'page';
  }

  if (draft.groupId || draft.eventId) {
    return draft.groupId ? 'group' : 'event';
  }

  return 'personal';
}

function normalizeDraftTaggedUserIds(draft: CreatePostDraft): string[] {
  const ids = Array.from(
    new Set(
      (draft.taggedUsers ?? [])
        .map(user => String(user.id).trim())
        .filter(id => /^[1-9][0-9]*$/.test(id)),
    ),
  );
  if (ids.length > 20) {
    throw new Error('Maximum of 20 tagged people per post.');
  }
  return ids;
}

function buildTaggableUsersPayload(input: GetTaggableUsersInput) {
  const payload: Record<string, unknown> = {
    query: input.query?.trim() ?? '',
    postPrivacy: PRIVACY_TO_WIRE(input.privacy),
    privacy_contract: CONTENT_AUDIENCE_CONTRACT,
    limit: 20,
  };
  if (input.pageId) payload.page_id = input.pageId;
  if (input.groupId) payload.group_id = input.groupId;
  if (input.eventId) payload.event_id = input.eventId;
  if (input.cursor) payload.cursor = input.cursor;
  if (input.userIds?.length) {
    payload.user_ids = JSON.stringify(
      Array.from(new Set(input.userIds.map(id => String(id).trim()))),
    );
  }
  return payload;
}

function mapLightRawFeedPosts(raw: Array<Record<string, unknown>>): FeedPost[] {
  const posts: FeedPost[] = [];
  // Per-classifier counters. Tells us which branch a row went down
  // (ad / poll / text+photo / video / dropped-as-stub) so we can
  // see exactly where raw posts get filtered out.
  const buckets = {
    ad: 0,
    live: 0,
    product: 0,
    job: 0,
    poll: 0,
    text: 0,
    video: 0,
    dropped: 0,
  };
  for (const item of raw) {
    if (looksLikeLive(item)) {
      buckets.live += 1;
      continue;
    }

    if (looksLikeAd(item)) {
      posts.push(mapAdPost(item));
      buckets.ad += 1;
    } else if (looksLikeProductPost(item)) {
      // Marketplace rows are supplied by the independently paged product
      // lane. Keeping them out of the text lane prevents duplicate list keys
      // and ensures the richer product card wins when both APIs overlap.
      buckets.product += 1;
    } else if (looksLikeJobPost(item)) {
      posts.push(mapJobPost(item));
      buckets.job += 1;
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

async function fetchVideoFeedPostsPage(
  limit = 20,
  afterPostId?: string,
  source: FeedSource = 'all',
  maxScanPages = 3,
): Promise<FeedPostsPage<FeedVideoPost>> {
  const mappedById = new Map<string, FeedVideoPost>();
  const visitedCursors = new Set<string>();
  let cursor = afterPostId;
  let nextCursor = afterPostId;
  let reachedEnd = false;

  for (
    let pageIndex = 0;
    pageIndex < Math.max(1, maxScanPages) && mappedById.size < limit;
    pageIndex += 1
  ) {
    const page = await fetchRecommendedRawFeedPostsWithFallback(
      Math.max(limit, Math.ceil(limit * 1.5)),
      cursor,
      source,
    );

    page.posts
      .filter(looksLikeVideo)
      .map(mapVideoPost)
      .forEach(post => {
        if (!mappedById.has(post.id)) mappedById.set(post.id, post);
      });

    const candidateCursor = page.nextCursor ?? getOldestRawPostId(page.posts);
    const canAdvance = Boolean(
      candidateCursor &&
        candidateCursor !== cursor &&
        !visitedCursors.has(candidateCursor),
    );

    // The recommended endpoint can report `reached_end=true` while still
    // returning a valid older cursor. The cursor is the stronger pagination
    // signal here; stopping on the stale flag permanently starves sparse
    // video lanes even though older videos are still reachable.
    if (!canAdvance) {
      nextCursor = undefined;
      reachedEnd = true;
      break;
    }

    if (cursor) visitedCursors.add(cursor);
    nextCursor = candidateCursor;
    cursor = candidateCursor;
  }

  const mappedPosts = Array.from(mappedById.values());
  const posts = mappedPosts.slice(0, limit);
  const prefetchedPosts = mappedPosts.slice(limit);
  return {
    posts,
    prefetchedPosts: prefetchedPosts.length > 0 ? prefetchedPosts : undefined,
    nextCursor: reachedEnd ? undefined : nextCursor,
    reachedEnd,
  };
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
        if (looksLikeLive(item)) {
          continue;
        }

        if (looksLikeAd(item)) {
          posts.push(mapAdPost(item));
        } else if (looksLikeJobPost(item)) {
          posts.push(mapJobPost(item));
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

    async getLatestPosts(
      limit = 8,
      source: FeedSource = 'all',
    ): Promise<FeedPost[]> {
      if (recommendedEndpointAvailability === 'unsupported') {
        return [];
      }

      let page: RawFeedPostsPage;
      try {
        page = await fetchRecommendedRawFeedPosts(limit, undefined, source);
      } catch (error) {
        if (isRecommendedEndpointUnsupportedError(error)) {
          recommendedEndpointAvailability = 'unsupported';
          return [];
        }
        throw error;
      }
      const posts: FeedPost[] = [];
      for (const item of page.posts) {
        if (looksLikeLive(item)) continue;

        if (looksLikeAd(item)) {
          posts.push(mapAdPost(item));
        } else if (looksLikeJobPost(item)) {
          posts.push(mapJobPost(item));
        } else if (looksLikeVideo(item)) {
          posts.push(mapVideoPost(item));
        } else if (looksLikePoll(item)) {
          posts.push(mapPollPost(item));
        } else if (looksLikeTextOrPhoto(item)) {
          posts.push(mapTextPost(item));
        }
      }
      return mixAdsIntoPosts(posts).slice(0, limit);
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
        if (looksLikeLive(item)) {
          continue;
        }

        if (looksLikeAd(item)) {
          posts.push(mapAdPost(item));
        } else if (looksLikeJobPost(item)) {
          posts.push(mapJobPost(item));
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
      let cursorStalled = false;
      let primaryCount = 0;
      let scannedRawRows = 0;
      const visitedRawCursors = new Set<string>();
      if (cursor) visitedRawCursors.add(cursor);

      for (
        let scan = 0;
        scan < maxScanPages && mappedById.size < limit;
        scan += 1
      ) {
        const remainingVisibleSlots = Math.max(1, limit - mappedById.size);
        const minimumUsablePosts = Math.max(
          1,
          Math.ceil(remainingVisibleSlots * MIN_RECOMMENDED_PAGE_FILL_RATIO),
        );
        const page = await fetchRecommendedRawFeedPostsWithFallback(
          rawLimit,
          cursor,
          source,
          minimumUsablePosts,
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
          nextRawCursor &&
            nextRawCursor !== cursor &&
            !visitedRawCursors.has(nextRawCursor),
        );
        cursorStalled = !advancedCursor;

        if (cursorStalled) {
          // An empty transport window without an explicit end signal can be
          // transient. Return the missing cursor to the ViewModel and let its
          // consecutive-strike guard retry before declaring the feed ended.
          reachedEnd = page.reachedEnd === true;
          break;
        }

        lastRawCursor = nextRawCursor;
        reachedEnd = false;
        visitedRawCursors.add(nextRawCursor as string);
        cursor = nextRawCursor;
      }

      const mappedPosts = mixAdsIntoPosts(Array.from(mappedById.values()));
      const posts = mappedPosts.slice(0, limit);
      const prefetchedPosts = mappedPosts.slice(limit);
      const renderedCursor = getOldestFeedPostId(posts);
      // `rawLimit` is intentionally larger than the visible page so one
      // request can fill Home quickly. Never throw those extra mapped rows
      // away: the server cursor already advances past the complete raw
      // window, so discarding them here would permanently skip posts that
      // Profile can still display.
      const nextCursor = reachedEnd
        ? undefined
        : cursorStalled && cursor
        ? cursor
        : lastRawCursor ?? renderedCursor;

      debugFeedRepository('light posts page', {
        requestedLimit: limit,
        rawLimit,
        afterPostId: afterPostId ?? 'first',
        scannedRawRows,
        primaryCount,
        mapped: mappedPosts.length,
        returned: posts.length,
        prefetched: prefetchedPosts.length,
        renderedCursor: renderedCursor ?? '(none)',
        nextCursor: nextCursor ?? '(none)',
        reachedEnd,
        cursorStalled,
      });

      return {
        posts,
        prefetchedPosts:
          prefetchedPosts.length > 0 ? prefetchedPosts : undefined,
        nextCursor,
        reachedEnd,
      };
    },

    async getVideoPosts(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
    ) {
      const page = await fetchVideoFeedPostsPage(limit, afterPostId, source);
      return page.posts;
    },

    async getVideoPostsPage(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
      maxScanPages = 3,
    ) {
      return fetchVideoFeedPostsPage(limit, afterPostId, source, maxScanPages);
    },

    async getTextPosts(
      limit = 20,
      afterPostId?: string,
      source: FeedSource = 'all',
    ) {
      const page = await fetchRawFeedPosts(limit, afterPostId, source);
      return page.posts.filter(looksLikeTextOrPhoto).map(mapTextPostBase);
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
        payload.is_anonymous = '0';
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

      const taggedUserIds = normalizeDraftTaggedUserIds(draft);
      if (taggedUserIds.length > 0) {
        payload.tagged_user_ids = JSON.stringify(taggedUserIds);
      }

      const locationLabel = draft.location?.label?.trim();
      if (locationLabel) {
        payload.postMap = locationLabel;
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
        const mediaWidth = Math.round(Number(draft.video.width));
        const mediaHeight = Math.round(Number(draft.video.height));
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
        if (mediaWidth > 0 && mediaHeight > 0) {
          payload.media_width = mediaWidth;
          payload.media_height = mediaHeight;
        }
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
        if (!trimmedText && !locationLabel) {
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
        errors?: {
          error_id?: number | string;
          error_text?: string;
        };
      }>(apiRoutes.feed.newPost, payload);

      const ok = String(response.api_status) === '200';
      if (!ok || !response.post_data) {
        throw new Error(
          response.errors?.error_text ??
            response.message ??
            'Không đăng được bài. Vui lòng thử lại.',
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

    async getTaggableUsers(input) {
      if (input.privacy === 'only_me') {
        return { users: [], hasMore: false };
      }

      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
        next_cursor?: string | number;
        has_more?: boolean;
        message?: string;
      }>(apiRoutes.feed.taggableUsers, buildTaggableUsersPayload(input));

      if (String(response.api_status) !== '200') {
        throw new Error(
          response.message ?? 'Không tải được danh sách người có thể gắn thẻ.',
        );
      }

      return {
        users: (response.data ?? [])
          .map(mapPostTaggedUser)
          .filter((user): user is PostTaggedUser => Boolean(user)),
        nextCursor:
          response.next_cursor === undefined ||
          response.next_cursor === null ||
          response.next_cursor === ''
            ? undefined
            : String(response.next_cursor),
        hasMore: response.has_more === true,
      };
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
        const ownPostsPromise = backendApi.post<{
          api_status: number | string;
          data?: Array<Record<string, unknown>>;
        }>(apiRoutes.feed.posts, {
          type: 'get_user_posts',
          id: userId,
          limit,
          ...(afterPostId ? { after_post_id: afterPostId } : {}),
        });

        const publicVideosPromise = afterPostId
          ? Promise.resolve({ data: [] as Array<Record<string, unknown>> })
          : backendApi
              .post<{
                api_status: number | string;
                data?: Array<Record<string, unknown>>;
              }>(apiRoutes.feed.posts, {
                type: 'get_random_videos',
                limit: 50,
              })
              .catch(() => ({ data: [] as Array<Record<string, unknown>> }));

        const [response, publicVideoResponse] = await Promise.all([
          ownPostsPromise,
          publicVideosPromise,
        ]);

        const ownRaw = response.data ?? [];
        const oldestOwnPostId = Math.min(
          ...ownRaw
            .map(item => Number(readString(item, 'id', 'post_id')))
            .filter(id => Number.isFinite(id) && id > 0),
        );

        const publicVideoRaw = (publicVideoResponse.data ?? []).filter(item => {
          const postId = Number(readString(item, 'id', 'post_id'));
          return (
            String(readPostOwnerId(item)) === String(userId) &&
            (!Number.isFinite(oldestOwnPostId) || postId >= oldestOwnPostId)
          );
        });

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
            return mapStandardContextPost(item);
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
            return mapStandardContextPost(item);
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
            return mapStandardContextPost(item);
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

        const rawShareUrl = await getShareableUrl(input.postId, 'post');
        const shareUrl =
          input.sourceKind === 'live'
            ? markLiveShareUrl(rawShareUrl)
            : rawShareUrl;
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

      const persistedPostId = String(
        response.data?.id ?? response.data?.post_id ?? '',
      ).trim();
      if (
        String(response.api_status) !== '200' ||
        !response.data ||
        !/^[1-9]\d*$/.test(persistedPostId)
      ) {
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
        next_offset?: number | string | null;
        reached_end?: boolean | number | string;
        errors?: { error_text?: string };
        message?: string;
      }>(
        apiRoutes.feed.postReactions,
        {},
        {
          params: {
            post_id: postId,
            ...(reaction ? { reaction: REACTION_TO_WIRE[reaction] } : {}),
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

      const responseRecord = response as Record<string, unknown>;
      const explicitReachedEnd = readOptionalBool(
        responseRecord,
        'reached_end',
      );
      const rawUserCount = response.users?.length ?? users.length;
      const reachedEnd = explicitReachedEnd ?? rawUserCount < limit;
      const explicitNextOffset = readString(responseRecord, 'next_offset');
      const nextOffset = reachedEnd
        ? undefined
        : explicitNextOffset || String(offset + rawUserCount);

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
export function mapFeedPost(raw: Record<string, unknown>): FeedPost {
  if (readSharedInfo(raw)) {
    return mapSharedOuterPost(raw);
  }
  if (looksLikeProductPost(raw)) {
    return mapProductPost(raw);
  }
  if (looksLikeJobPost(raw)) {
    return mapJobPost(raw);
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
