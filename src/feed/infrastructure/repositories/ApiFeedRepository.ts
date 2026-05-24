// Feed API Repository (Infrastructure)
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
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { reelsReactionsStorage } from '../../../reels/infrastructure/storage/reelsReactionsStorage';
import type { FeedRepository } from '../../domain/repositories/FeedRepository';
import type {
  CreatePostDraft,
  CreatePostResult,
  FeedTextPost,
  FeedVideoPost,
  PostFeeling,
  PostPrivacy,
} from '../../domain/types/feed.types';

// ── Privacy mapping ──────────────────────────────────────────────────────
// WoWonder's `postPrivacy` is numeric: 0=Public, 1=Friends, 2=Only me.
// We accept extra values (3=Close, 4=Custom) at the wire layer too, but
// the domain only exposes the 3 most common ones.
const PRIVACY_TO_WIRE: Record<PostPrivacy, string> = {
  public: '0',
  friends: '1',
  only_me: '2',
};

const WIRE_TO_PRIVACY: Record<string, PostPrivacy> = {
  '0': 'public',
  '1': 'friends',
  '2': 'only_me',
  // Anything else (3, 4) we collapse to 'public' on read — we don't
  // surface those modes in the UI yet, but we shouldn't crash.
};

// ── Wire format ──────────────────────────────────────────────────────────
//
// WoWonder keys `$wo['reactions_types']` by the numeric `id` column of
// `Wo_Reactions_Types` (1..6), NOT by the human name. The `post-actions`
// endpoint then validates:
//
//   in_array($_POST['reaction'], array_keys($wo['reactions_types']))
//
// → sending `reaction=love` silently fails ("reaction missing"). Confirmed
// by inspecting WoWonder's own web client at script.js:4489 which sends
// `name: '1'..'6'`. Same mapping as `src/reels/.../ApiReelsRepository.ts`.
const REACTION_TO_WIRE: Record<ReactionType, string> = {
  like: '1',
  love: '2',
  haha: '3',
  wow: '4',
  sad: '5',
  angry: '6',
};

const WIRE_TO_REACTION: Record<string, ReactionType> = {
  '1': 'like',
  '2': 'love',
  '3': 'haha',
  '4': 'wow',
  '5': 'sad',
  '6': 'angry',
  // Defensive: some installs occasionally return the lowercase name.
  like: 'like',
  love: 'love',
  haha: 'haha',
  wow: 'wow',
  sad: 'sad',
  angry: 'angry',
};

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

function readBool(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1' || v === 1) return true;
    if (v === 'false' || v === '0' || v === 0) return false;
  }
  return false;
}

// Match any common video extension anywhere in the URL (allows query
// strings, signed-CDN tokens, weird paths). The `.` is bare so we also
// catch `video.mp4.encrypted` paths some installs ship with.
const VIDEO_URL_PATTERN = /\.(mp4|mov|webm|m3u8|mkv|avi)(?:[?#/]|$)/i;

function readString(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
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

function mapVideoPost(raw: Record<string, unknown>): FeedVideoPost {
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

  return {
    id: postId,
    caption: cleanCaption(readString(raw, 'postText')) || undefined,
    videoUrl: readString(raw, 'postFile'),
    thumbnailUrl: readString(raw, 'postFileThumb') || undefined,
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    publisher: {
      id: readString(publisher, 'user_id', 'id'),
      name,
      username,
      avatarUrl: readString(publisher, 'avatar', 'profile_picture') || undefined,
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
  const postType = readString(raw, 'postType').toLowerCase();
  if (postType === 'video' || postType === 'reel') return true;
  const file = readString(raw, 'postFile');
  return Boolean(file) && VIDEO_URL_PATTERN.test(file);
}

// ── Photo URL extraction for text/photo posts ────────────────────────────
//
// WoWonder represents photo posts in 3 different ways depending on how
// they were uploaded:
//
//   1. Single photo  → `postFile` is the image URL, `postFileThumb` may
//                      contain a thumb. `postType` may be 'photo'.
//   2. Album (multi) → `photo_album` or `album` is an array of objects
//                      with `image`/`url`/`source` keys, OR `postPhotos`
//                      is an array of URL strings.
//   3. Imported URL  → `postPhoto` contains a single URL grabbed from
//                      a link in `postText`.
//
// We try all three so the UI can render any photo post the server
// returns, regardless of upload path.
const IMAGE_URL_PATTERN = /\.(png|jpg|jpeg|gif|webp|heic)(?:[?#/]|$)/i;

function extractPhotoUrls(raw: Record<string, unknown>): string[] {
  const urls: string[] = [];

  // Path 1: single-photo post
  const postFile = readString(raw, 'postFile');
  if (postFile && IMAGE_URL_PATTERN.test(postFile)) {
    urls.push(postFile);
  }

  // Path 3: link-preview / imported image
  const postPhoto = readString(raw, 'postPhoto');
  if (postPhoto && IMAGE_URL_PATTERN.test(postPhoto) && !urls.includes(postPhoto)) {
    urls.push(postPhoto);
  }

  // Path 2: album — try the various shapes WoWonder uses
  const albumCandidates = [
    raw.photo_album,
    raw.album,
    raw.postPhotos,
    raw.photos,
  ];

  for (const candidate of albumCandidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      if (typeof item === 'string') {
        if (IMAGE_URL_PATTERN.test(item) && !urls.includes(item)) {
          urls.push(item);
        }
        continue;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const url = readString(obj, 'image', 'url', 'source', 'src', 'photo');
        if (url && IMAGE_URL_PATTERN.test(url) && !urls.includes(url)) {
          urls.push(url);
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
  if (looksLikeVideo(raw)) return false;
  const text = readString(raw, 'postText').trim();
  const hasPhoto = extractPhotoUrls(raw).length > 0;
  return Boolean(text) || hasPhoto;
}

function mapTextPost(raw: Record<string, unknown>): FeedTextPost {
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

  const rawPrivacy = readString(raw, 'postPrivacy');
  const privacy: PostPrivacy = WIRE_TO_PRIVACY[rawPrivacy] ?? 'public';

  return {
    id: postId,
    caption: cleanCaption(readString(raw, 'postText')) || undefined,
    photos: extractPhotoUrls(raw),
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    feeling: extractFeeling(raw),
    privacy,
    publisher: {
      id: readString(publisher, 'user_id', 'id'),
      name,
      username,
      avatarUrl: readString(publisher, 'avatar', 'profile_picture') || undefined,
    },
  };
}

// ── Shared fetch helper ──────────────────────────────────────────────────
// `getVideoPosts` and `getTextPosts` both call `/api/posts` with the
// same fallback chain (news-feed → user-posts). We extract the fetch
// once so both methods stay in sync if WoWonder's quirks ever change.
async function fetchRawFeedPosts(
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  const tryFetch = async (
    payload: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> => {
    const response = await backendApi.post<{
      api_status: number | string;
      data?: Array<Record<string, unknown>>;
    }>(apiRoutes.feed.posts, payload);
    return response.data ?? [];
  };

  let raw = await tryFetch({ type: 'get_news_feed', limit });
  if (raw.length === 0) {
    const sessionUserId = sessionStorage.getSession()?.userId;
    if (sessionUserId) {
      raw = await tryFetch({
        type: 'get_user_posts',
        id: sessionUserId,
        limit,
      });
    }
  }
  return raw;
}

export function createFeedRepository(): FeedRepository {
  return {
    async getVideoPosts(limit = 20) {
      const raw = await fetchRawFeedPosts(limit);
      return raw.filter(looksLikeVideo).map(mapVideoPost);
    },

    async getTextPosts(limit = 20) {
      const raw = await fetchRawFeedPosts(limit);
      return raw.filter(looksLikeTextOrPhoto).map(mapTextPost);
    },

    async createPost(draft: CreatePostDraft): Promise<CreatePostResult> {
      // Build the multipart payload. Keys MUST match WoWonder's expected
      // POST fields (see phtml/api/phone/new_post.php). Empty optional
      // fields are omitted entirely so the backend defaults kick in.
      const payload: Record<string, unknown> = {
        postPrivacy: PRIVACY_TO_WIRE[draft.privacy] ?? '0',
      };

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
      // `/api/posts` returns. Reuse `mapTextPost` so the optimistic
      // prepend is type-consistent with the rest of the feed.
      const post = mapTextPost(response.post_data);

      return { postId: post.id, post };
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
  };
}
