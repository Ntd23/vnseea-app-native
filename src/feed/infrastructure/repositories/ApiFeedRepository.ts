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
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { reelsReactionsStorage } from '../../../reels/infrastructure/storage/reelsReactionsStorage';
import type { FeedRepository } from '../../domain/repositories/FeedRepository';
import type {
  CreatePostDraft,
  CreatePostResult,
  FeedPost,
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
      typeof val === 'number'
        ? val
        : typeof val === 'string'
          ? Number(val)
          : 0;
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

function buildFallbackTopReactions(myReaction: ReactionType | null): ReactionType[] {
  if (!myReaction) return ['like'];
  if (myReaction === 'like') return ['like'];
  // Viewer has a non-like reaction → show both like + theirs
  return ['like', myReaction];
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
  if (/^https?:\/\//i.test(url)) return url;
  // Relative path — prepend site root.
  return `${_siteRoot}/${url.replace(/^\/+/, '')}`;
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
    kind: 'video',
    id: postId,
    caption: cleanCaption(readString(raw, 'postText')) || undefined,
    // `postFile` + `postFileThumb` + `avatar` are pre-normalized by
    // `Wo_GetMedia()` in posts.php → already full URLs. Do NOT wrap
    // them with `normalizeMediaUrl` or we double-prepend the host.
    videoUrl: readString(raw, 'postFile'),
    thumbnailUrl: readString(raw, 'postFileThumb') || undefined,
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    topReactions: extractTopReactions(raw, myReaction),
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
// WoWonder represents photo posts in MULTIPLE different ways depending
// on the upload path. We have to be defensive because not all installs
// surface the same fields:
//
//   1. Single photo  → `postFile` is the image URL, `postFileThumb` may
//                      contain a thumb. `postType` may be 'photo'.
//   2. Album upload  → `photo_album` is an array of objects each with
//                      an `image_org` field (full URL). This is what
//                      WoWonder writes when our `createPost` sends
//                      `postPhotos[]` + `album_name`. Confirmed by
//                      `phtml/sources/timeline.php:252` which does
//                      `Wo_GetMedia($wo['story']['photo_album'][0]['image_org'])`.
//   3. Multi-image   → `photo_multi` same shape as `photo_album` (items
//                      with `image_org`). Used for the `multi_image=1`
//                      flag flow — also surfaced via `timeline.php:257`.
//   4. Imported URL  → `postPhoto` contains a single URL grabbed from
//                      a link in `postText`.
//
// IMPORTANT: WoWonder's item keys include `image_org` (the photo URL)
// and `image` (sometimes a thumbnail). Previously we only looked for
// `image`/`url`/`source`/etc — that's why multi-photo posts rendered
// caption but no images. We now check `image_org` FIRST so the
// full-res URL wins, then fall back to the others.
const IMAGE_URL_PATTERN = /\.(png|jpg|jpeg|gif|webp|heic)(?:[?#/]|$)/i;

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
        // `image_org` is the canonical full-res URL key (confirmed
        // against timeline.php). We still check the legacy keys after
        // so installs that surface the photo under a different name
        // still work.
        tryPush(
          readString(obj, 'image_org', 'image', 'url', 'source', 'src', 'photo'),
        );
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
    kind: 'text',
    id: postId,
    caption: cleanCaption(readString(raw, 'postText')) || undefined,
    photos: extractPhotoUrls(raw),
    postedAt: readNumber(raw, 'time') || undefined,
    likeCount,
    commentCount: readNumber(raw, 'post_comments', 'commentCount'),
    isLiked: myReaction !== null || readBool(raw, 'isLiked', 'postReacted'),
    myReaction,
    topReactions: extractTopReactions(raw, myReaction),
    feeling: extractFeeling(raw),
    privacy,
    publisher: {
      id: readString(publisher, 'user_id', 'id'),
      name,
      username,
      // Avatar is pre-normalized by Wo_GetMedia in posts.php — full URL
      // already. Don't double-prepend the host here.
      avatarUrl: readString(publisher, 'avatar', 'profile_picture') || undefined,
    },
  };
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
//   3. Suggested users   — posts from `/api/get-user-suggestions`. This
//                          fixes the "I only see my own posts" bug on
//                          accounts that haven't followed anyone yet.
//                          We pick the top 5 suggested users and pull
//                          their recent posts in parallel.
//
// All three run in parallel. We dedupe by post id and let the downstream
// `getAllPosts` sort by `postedAt` desc — the result is a chronological
// merged feed that mixes own + follows + discovery content, just like
// the FB / Twitter home tab.
async function fetchRawFeedPosts(
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  const tryFetch = async (
    payload: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> => {
    try {
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.posts, payload);
      return response.data ?? [];
    } catch {
      // One stream failing should never blank the whole feed — return
      // empty and let the other streams populate the UI.
      return [];
    }
  };

  /**
   * Fetch posts from many users at once via a discovery chain.
   *
   * On installs where the admin enforces a follow-graph filter on
   * `get_news_feed`, the only way to surface posts from people the
   * viewer hasn't followed yet is to fan out per-user via
   * `get_user_posts` (which has no follow filter — it only filters
   * by privacy = public/friends/only_me where we explicitly target a
   * publisher_id).
   *
   * We pull user_ids from THREE places to maximise hit rate:
   *   - /api/get-user-suggestions  (12 random suggested users)
   *   - /api/get-friends           (the viewer's actual following list)
   *   - /api/get-nearby-users      (geo-proximity if enabled)
   *
   * Then we Promise.all over the merged unique user_id list, fetching
   * each user's last few posts. Capped at 12 users × 5 posts = 60
   * extra posts max — still well under 100 after dedup with the other
   * streams.
   */
  const fetchDiscoveryPosts = async (): Promise<
    Array<Record<string, unknown>>
  > => {
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

    const sessionUserIdLocal = sessionStorage.getSession()?.userId;

    // Response shapes — each WoWonder endpoint puts its user list under
    // a different key. We type them separately so the parsing is
    // explicit and verified against the actual PHP returns:
    //
    //   /api/get-user-suggestions → { suggestions: [...] }       (top-level)
    //   /api/get-friends          → { data: { following, followers } } (NESTED!)
    //   /api/get-nearby-users     → { nearby_users: [...] }      (top-level)
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
      backendApi
        .post<SuggestionsResponse>(apiRoutes.user.suggestions, { limit: 12 })
        .catch(() => ({}) as SuggestionsResponse),
      sessionUserIdLocal
        ? backendApi
            .post<FriendsResponse>(apiRoutes.social.friends, {
              user_id: sessionUserIdLocal,
              type: 'following,followers',
              limit: 20,
            })
            .catch(() => ({}) as FriendsResponse)
        : Promise.resolve({} as FriendsResponse),
      backendApi
        .post<NearbyResponse>(apiRoutes.user.nearby, { limit: 10 })
        .catch(() => ({}) as NearbyResponse),
    ]);

    const userIds = new Set<string>();
    collectUserIds(sugRes.suggestions).forEach(id => userIds.add(id));
    // `get-friends` nests its lists under `data` — this was the bug
    // that hid admin's posts when the viewer followed admin. We now
    // pull from BOTH following and followers so mutual connections
    // surface even if the social graph is one-sided.
    collectUserIds(friendsRes.data?.following).forEach(id => userIds.add(id));
    collectUserIds(friendsRes.data?.followers).forEach(id => userIds.add(id));
    collectUserIds(nearbyRes.nearby_users).forEach(id => userIds.add(id));
    // Don't refetch our own posts here — the `ownRaw` stream handles that.
    if (sessionUserIdLocal) userIds.delete(sessionUserIdLocal);

    // eslint-disable-next-line no-console
    console.log(
      '[feed] discovery sources →',
      'suggestions:',
      sugRes.suggestions?.length ?? 0,
      'following:',
      friendsRes.data?.following?.length ?? 0,
      'followers:',
      friendsRes.data?.followers?.length ?? 0,
      'nearby:',
      nearbyRes.nearby_users?.length ?? 0,
    );

    if (userIds.size === 0) {
      // eslint-disable-next-line no-console
      console.log('[feed] discovery: no user ids found from any source');
      return [];
    }

    const ids = Array.from(userIds).slice(0, 15);
    // eslint-disable-next-line no-console
    console.log(
      '[feed] discovery: fetching posts for',
      ids.length,
      'users →',
      ids,
    );

    const perUser = await Promise.all(
      ids.map(id =>
        tryFetch({ type: 'get_user_posts', id, limit: 5 }),
      ),
    );

    const flat = perUser.flat();
    // eslint-disable-next-line no-console
    console.log('[feed] discovery: total', flat.length, 'posts collected');
    return flat;
  };

  const sessionUserId = sessionStorage.getSession()?.userId;

  const [followedRaw, ownRaw, discoveryRaw] = await Promise.all([
    tryFetch({ type: 'get_news_feed', limit }),
    sessionUserId
      ? tryFetch({ type: 'get_user_posts', id: sessionUserId, limit })
      : Promise.resolve<Array<Record<string, unknown>>>([]),
    fetchDiscoveryPosts(),
  ]);

  // Diagnostics — kept until the "I only see my own posts" report
  // stops coming in. Drop once we're confident the feed is healthy.
  // eslint-disable-next-line no-console
  console.log(
    '[feed] sources →',
    'news_feed:',
    followedRaw.length,
    'own:',
    ownRaw.length,
    'discovery:',
    discoveryRaw.length,
  );

  // Merge + dedupe by post id. Order of source matters only when two
  // posts have the same timestamp — `getAllPosts` re-sorts by time
  // anyway, so the practical effect is just deduplication.
  const seen = new Set<string>();
  const merged: Array<Record<string, unknown>> = [];
  for (const list of [followedRaw, ownRaw, discoveryRaw]) {
    for (const post of list) {
      const id = String(
        (post as { id?: unknown; post_id?: unknown }).id ??
          (post as { id?: unknown; post_id?: unknown }).post_id ??
          '',
      );
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(post);
    }
  }

  // eslint-disable-next-line no-console
  console.log('[feed] merged unique posts →', merged.length);

  return merged;
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
    async getAllPosts(limit = 20): Promise<FeedPost[]> {
      const raw = await fetchRawFeedPosts(limit);
      const posts: FeedPost[] = [];
      for (const item of raw) {
        if (looksLikeVideo(item)) {
          posts.push(mapVideoPost(item));
        } else if (looksLikeTextOrPhoto(item)) {
          posts.push(mapTextPost(item));
        }
        // else: shared/empty/system stub — skip silently.
      }
      return posts.sort(
        (a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0),
      );
    },

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
