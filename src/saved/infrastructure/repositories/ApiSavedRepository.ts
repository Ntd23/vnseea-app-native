// Description: Loads saved posts from WoWonder's `/api/posts type=saved` endpoint.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type {
  SavedPostsPage,
  SavedRepository,
} from '../../domain/repositories/SavedRepository';
import type { SavedItem, SavedItemKind } from '../../domain/types/saved.types';

const PAGE_SIZE = 20;
const IMAGE_URL_PATTERN = /\.(png|jpg|jpeg|gif|webp|heic)(?:[?#/]|$)/i;
const VIDEO_URL_PATTERN = /\.(mp4|m4v|mov|webm|flv|mpeg|mpg|mkv|avi|m3u8)(?:[?#/]|$)/i;

function readString(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function cleanText(value: string) {
  return value
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

function normalizeMediaUrl(url: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = apiConfig.webBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}/${url.replace(/^\/+/, '')}`;
}

function extractAlbumImage(raw: Record<string, unknown>) {
  const albumCandidates = [raw.photo_album, raw.photo_multi, raw.album, raw.photos];

  for (const candidate of albumCandidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      if (typeof item === 'string') {
        const url = normalizeMediaUrl(item);
        if (url && IMAGE_URL_PATTERN.test(url)) return url;
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const url = normalizeMediaUrl(
        readString(obj, 'image_org', 'image', 'url', 'src', 'file'),
      );
      if (url && IMAGE_URL_PATTERN.test(url)) return url;
    }
  }

  return undefined;
}

function getPublisherName(raw: Record<string, unknown>) {
  const publisher =
    (raw.publisher as Record<string, unknown> | undefined) ??
    (raw.user_data as Record<string, unknown> | undefined) ??
    {};
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');

  return (
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(publisher, 'name', 'full_name') ||
    username ||
    'Người dùng'
  );
}

function getKind(raw: Record<string, unknown>): SavedItemKind {
  const postType = readString(raw, 'postType').toLowerCase();
  const postFile = readString(raw, 'postFile');

  if (postType === 'video' || postType === 'reel' || VIDEO_URL_PATTERN.test(postFile)) {
    return 'video';
  }

  if (
    postType === 'photo' ||
    IMAGE_URL_PATTERN.test(postFile) ||
    Boolean(extractAlbumImage(raw))
  ) {
    return 'photo';
  }

  return 'text';
}

function getImageUrl(raw: Record<string, unknown>, kind: SavedItemKind) {
  const thumb = normalizeMediaUrl(readString(raw, 'postFileThumb'));
  if (thumb) return thumb;

  const postFile = normalizeMediaUrl(readString(raw, 'postFile'));
  if (postFile && (kind === 'video' || IMAGE_URL_PATTERN.test(postFile))) {
    return postFile;
  }

  return extractAlbumImage(raw);
}

function mapSavedPost(raw: Record<string, unknown>): SavedItem {
  const id = readString(raw, 'id', 'post_id');
  const kind = getKind(raw);
  const text = cleanText(readString(raw, 'postText'));
  const title =
    text ||
    (kind === 'video'
      ? 'Video đã lưu'
      : kind === 'photo'
        ? 'Ảnh đã lưu'
        : 'Bài viết đã lưu');

  return {
    id,
    title,
    author: getPublisherName(raw),
    postedAt: readNumber(raw, 'time', 'postedAt'),
    imageUrl: getImageUrl(raw, kind),
    kind,
    postUrl: `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/index.php?link1=post&id=${id}`,
    videoUrl: kind === 'video' ? normalizeMediaUrl(readString(raw, 'postFile')) : undefined,
    rawPost: raw,
  };
}

export function createSavedRepository(): SavedRepository {
  return {
    async getSavedPosts(options) {
      const limit = options?.limit ?? PAGE_SIZE;
      const response = await backendApi.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
      }>(apiRoutes.feed.posts, {
        type: 'saved',
        limit,
        ...(options?.afterPostId ? { after_post_id: options.afterPostId } : {}),
      });

      const rawItems = response.data ?? [];
      const items = rawItems.map(mapSavedPost).filter(item => item.id);
      const nextCursor = items.at(-1)?.id;

      return {
        items,
        nextCursor,
        hasMore: rawItems.length >= limit && Boolean(nextCursor),
      };
    },
  };
}
