// Popular API Repository (Infrastructure)

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { normalizeConfiguredUrl } from '../../../shared-kernel/infrastructure/config/url';
import type { PopularRepository } from '../../domain/repositories/PopularRepository';
import type { PopularPost } from '../../domain/types/popular.types';
import { mapUserSummary } from '../../../foundation/application/mappers/userSummaryMapper';

// ── Helper functions (matching FeedRepository patterns) ────────────────────────
function normalizeMediaUrl(url: string | undefined): string | undefined {
  return normalizeConfiguredUrl(url);
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

function cleanCaption(raw: string): string {
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

// Extract photo URLs from various WoWonder formats
function extractPhotoUrls(raw: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const tryPush = (url: string | undefined) => {
    if (!url) return;
    const fullUrl = normalizeMediaUrl(url);
    if (!fullUrl) return;
    if (!/\.(png|jpg|jpeg|gif|webp|heic)(?:[?#/]|$)/i.test(fullUrl)) return;
    if (urls.includes(fullUrl)) return;
    urls.push(fullUrl);
  };

  // Single photo
  tryPush(readString(raw, 'postFile'));
  // Link preview image
  tryPush(readString(raw, 'postPhoto'));

  // Album/multi-image arrays
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
        tryPush(readString(obj, 'image_org', 'image', 'url', 'source', 'src', 'photo'));
      }
    }
  }

  return urls;
}

// Get reactions count from reaction object
function extractReactionsCount(raw: Record<string, unknown>): Record<string, number> {
  const reactionObj = raw.reaction as Record<string, unknown> | undefined;
  if (!reactionObj || typeof reactionObj !== 'object') {
    return { like: 0, wow: 0, love: 0, haha: 0, sad: 0, angry: 0 };
  }

  const counts: Record<string, number> = { like: 0, wow: 0, love: 0, haha: 0, sad: 0, angry: 0 };
  const keysToCheck: Array<[string, string]> = [
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

  for (const [key, type] of keysToCheck) {
    if (counts[type] > 0) continue;
    const val = reactionObj[key];
    if (typeof val === 'number' && val > 0) {
      counts[type] = val;
    }
  }

  return counts;
}

interface BackendPostResponse {
  post_id: string | number;
  id: string | number;
  postText: string;
  time: string;
  time_text: string;
  location: string;
  views: number;
  blur: string;
  feeling: string;
  feeling_color: string;
  postType: string;
  postLink: string;
  postFile: string;
  postFileThumb: string;
  postFileFallback: string;
  postYoutube: string;
  postVine: string;
  postDailymotion: string;
  postVimeo: string;
  postPlaytube: string;
  postSoundCloud: string;
  age: string;
  postMusic: string;
  postFacebook: string;
  postFileType: string;
  postFileId: string;
  postFileUrl: string;
  album_id: string;
  poll_id: string;
  product_id: string;
  event_id: string;
  group_id: string;
  page_id: string;
  blog_id: string;
  forum_id: string;
  thread_id: string;
  job_id: string;
  offer_id: string;
  funding_id: string;
  donation_id: string;
  petition_id: string;
  color_id: string;
  registered: string;
  mode: string;
  stream: string;
  live_time: number;
  live_bg: string;
  product: Record<string, unknown>;
  options: unknown[];
  memory: string;
  postMap: string;
  lat: string;
  lng: string;
  publisher: Record<string, unknown>;
  user_data: Record<string, unknown>;
  get_post_comments: unknown[];
  reaction: Record<string, unknown>;
  postLikes: number;
  likes: number;
  likeCount: number;
  reactions_count: { like: number; wow: number; love: number; haha: number; sad: number; angry: number };
  comments_count: number;
  post_comments: number;
  shares_count: number;
  boosted: string;
  status: string;
}

interface MostLikedResponse {
  api_status: number | string;
  data: BackendPostResponse[];
}

function mapPost(raw: BackendPostResponse): PopularPost {
  // Resolve publisher from either publisher or user_data
  const publisher =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    {};

  // Get media URL - check multiple possible fields
  let mediaUrl = '';
  if (raw.postFile) mediaUrl = normalizeMediaUrl(raw.postFile) || '';
  if (!mediaUrl && raw.postFileUrl) mediaUrl = normalizeMediaUrl(raw.postFileUrl) || '';
  if (!mediaUrl && raw.postFileThumb) mediaUrl = normalizeMediaUrl(raw.postFileThumb) || '';

  // Get avatar
  const avatar = readString(publisher, 'avatar', 'profile_picture') || '';

  // Get name
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(publisher, 'name', 'full_name') ||
    username ||
    'Người dùng';

  // Get like count from various possible fields
  const likeCount = readNumber(raw as unknown as Record<string, unknown>, 'postLikes', 'likes', 'likeCount');

  // Get reactions count
  const reactionsCount = extractReactionsCount(raw as unknown as Record<string, unknown>);

  // Get comment count
  const commentCount = readNumber(raw as unknown as Record<string, unknown>, 'comments_count', 'post_comments');

  // Get shares count
  const sharesCount = readNumber(raw as unknown as Record<string, unknown>, 'shares_count');

  // Get photos from album/multi arrays
  const photos = extractPhotoUrls(raw as unknown as Record<string, unknown>);

  return {
    post_id: raw.post_id || raw.id || '',
    user_id: readString(publisher, 'user_id', 'id'),
    postText: cleanCaption(raw.postText || ''),
    time: raw.time || '',
    location: raw.location || '',
    views: raw.views ?? 0,
    blur: raw.blur || '',
    feeling: raw.feeling || '',
    feeling_color: raw.feeling_color || '',
    postType: raw.postType || '',
    postLink: raw.postLink || '',
    postFile: mediaUrl,
    postFileFallback: raw.postFileFallback || '',
    postYoutube: raw.postYoutube || '',
    postVine: raw.postVine || '',
    postDailymotion: raw.postDailymotion || '',
    postVimeo: raw.postVimeo || '',
    postPlaytube: raw.postPlaytube || '',
    postSoundCloud: raw.postSoundCloud || '',
    age: raw.age || '',
    postMusic: raw.postMusic || '',
    postFacebook: raw.postFacebook || '',
    postFileType: raw.postFileType || '',
    postFileId: raw.postFileId || '',
    postFileUrl: mediaUrl,
    albumId: raw.album_id || '',
    pollId: raw.poll_id || '',
    productId: raw.product_id || '',
    eventId: raw.event_id || '',
    groupId: raw.group_id || '',
    pageId: raw.page_id || '',
    blogId: raw.blog_id || '',
    forumId: raw.forum_id || '',
    threadId: raw.thread_id || '',
    jobId: raw.job_id || '',
    offerId: raw.offer_id || '',
    fundingId: raw.funding_id || '',
    donationId: raw.donation_id || '',
    petitionId: raw.petition_id || '',
    colorId: raw.color_id || '',
    registered: raw.registered || '',
    mode: raw.mode || '',
    stream: raw.stream || '',
    live_time: raw.live_time ?? 0,
    live_bg: raw.live_bg || '',
    product: raw.product ?? {},
    options: raw.options ?? [],
    memory: raw.memory || '',
    time_text: raw.time_text || '',
    postMap: raw.postMap || '',
    lat: raw.lat || '',
    lng: raw.lng || '',
    publisher: {
      id: readString(publisher, 'user_id', 'id'),
      username: username,
      name: name,
      avatarUrl: avatar || undefined,
      verified: false,
    },
    getPostComments: raw.get_post_comments ?? [],
    reactions: raw.reaction ?? {},
    reactionsCount: raw.reactions_count ?? reactionsCount,
    commentsCount: commentCount,
    sharesCount: sharesCount,
    boosted: raw.boosted ?? '',
    status: raw.status ?? '',
  };
}

export function createPopularRepository(): PopularRepository {
  return {
    async getMostLiked(): Promise<PopularPost[]> {
      const response = await apiBridge.get<MostLikedResponse>(
        apiRoutes.popular.mostLiked,
      );
      console.log('[PopularRepository] API response:', JSON.stringify(response, null, 2));
      return (response.data ?? []).map(mapPost);
    },
  };
}
