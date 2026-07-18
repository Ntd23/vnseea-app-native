// Description: Maps and loads current-state saved/reaction/comment/share collections.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { ActivityRepository } from '../../domain/repositories/ActivityRepository';
import type {
  ActivityCenterTab,
  ActivityMediaKind,
  ActivityShareDestination,
  PostActivityItem,
  PostActivityPage,
} from '../../domain/types/activity.types';

interface RawPostActivityItem {
  id?: unknown;
  post_id?: unknown;
  category?: unknown;
  reaction_type?: unknown;
  interaction_count?: unknown;
  latest_comment_text?: unknown;
  share_destination?: unknown;
  action_time?: unknown;
  post_data?: unknown;
}

interface RawPostActivityResponse {
  api_status: number | string;
  data?: RawPostActivityItem[];
  next_cursor?: unknown;
  has_more?: unknown;
  errors?: { error_text?: string };
  error_message?: string;
}

const VIDEO_PATTERN = /\.(mp4|m4v|mov|webm|flv|mpeg|mpg|mkv|avi|m3u8)(?:[?#/]|$)/i;
const IMAGE_PATTERN = /\.(png|jpg|jpeg|gif|webp|heic)(?:[?#/]|$)/i;
const WIRE_REACTIONS: Record<string, ReactionType> = {
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

function readString(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function readNumber(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
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

function normalizeMediaUrl(value: string) {
  const url = value.trim();
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

function readPublisher(raw: Record<string, unknown>) {
  const candidate = raw.publisher ?? raw.user_data;
  const publisher =
    candidate && typeof candidate === 'object'
      ? (candidate as Record<string, unknown>)
      : {};
  const firstName = readString(publisher, 'first_name');
  const lastName = readString(publisher, 'last_name');
  const username = readString(publisher, 'username', 'user_name');
  return {
    name:
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      readString(publisher, 'name', 'full_name') ||
      username ||
      'Người dùng',
    avatarUrl: normalizeMediaUrl(
      readString(publisher, 'avatar', 'profile_picture'),
    ),
  };
}

function extractAlbumImage(raw: Record<string, unknown>) {
  for (const candidate of [raw.photo_album, raw.photo_multi, raw.album, raw.photos]) {
    if (!Array.isArray(candidate)) continue;
    for (const entry of candidate) {
      if (typeof entry === 'string') {
        const url = normalizeMediaUrl(entry);
        if (url) return url;
        continue;
      }
      if (!entry || typeof entry !== 'object') continue;
      const url = normalizeMediaUrl(
        readString(
          entry as Record<string, unknown>,
          'image_org',
          'image',
          'url',
          'src',
          'file',
        ),
      );
      if (url) return url;
    }
  }
  return undefined;
}

function getMedia(raw: Record<string, unknown>) {
  const postType = readString(raw, 'postType', 'post_type').toLowerCase();
  const postFile = normalizeMediaUrl(readString(raw, 'postFile', 'post_file'));
  const thumbnail = normalizeMediaUrl(
    readString(raw, 'postFileThumb', 'post_file_thumb'),
  );
  const albumImage = extractAlbumImage(raw);
  const isVideo =
    postType === 'video' ||
    postType === 'reel' ||
    Boolean(postFile && VIDEO_PATTERN.test(postFile));
  const isPhoto =
    postType === 'photo' ||
    Boolean(postFile && IMAGE_PATTERN.test(postFile)) ||
    Boolean(albumImage);

  return {
    mediaKind: (isVideo ? 'video' : isPhoto ? 'photo' : 'text') as ActivityMediaKind,
    imageUrl: thumbnail || (isVideo ? undefined : postFile) || albumImage,
    videoUrl: isVideo ? postFile : undefined,
  };
}

function isActivityCategory(value: string): value is ActivityCenterTab {
  return ['saved', 'reaction', 'comment', 'share'].includes(value);
}

function mapActivityItem(raw: RawPostActivityItem): PostActivityItem | null {
  const post =
    raw.post_data && typeof raw.post_data === 'object'
      ? (raw.post_data as Record<string, unknown>)
      : null;
  if (!post) return null;

  const postId = String(raw.post_id ?? readString(post, 'id', 'post_id')).trim();
  const category = String(raw.category ?? '').trim();
  if (!postId || !isActivityCategory(category)) return null;

  const publisher = readPublisher(post);
  const media = getMedia(post);
  const postText = cleanText(readString(post, 'postText', 'post_text'));
  const title =
    postText ||
    (media.mediaKind === 'video'
      ? 'Video'
      : media.mediaKind === 'photo'
        ? 'Ảnh'
        : 'Bài viết');
  const reactionKey = String(raw.reaction_type ?? '').toLowerCase();
  const shareDestination = String(raw.share_destination ?? '');

  return {
    id: String(raw.id ?? `${category}:${postId}`),
    postId,
    category,
    title,
    author: publisher.name,
    authorAvatarUrl: publisher.avatarUrl,
    postedAt: readNumber(post, 'time', 'postedAt'),
    imageUrl: media.imageUrl,
    videoUrl: media.videoUrl,
    mediaKind: media.mediaKind,
    reaction: WIRE_REACTIONS[reactionKey],
    interactionCount: readNumber(
      raw as unknown as Record<string, unknown>,
      'interaction_count',
    ),
    latestCommentText: cleanText(String(raw.latest_comment_text ?? '')) || undefined,
    shareDestination: ['timeline', 'page', 'group'].includes(shareDestination)
      ? (shareDestination as ActivityShareDestination)
      : undefined,
    actionAt: readNumber(
      raw as unknown as Record<string, unknown>,
      'action_time',
    ),
    rawPost: post,
  };
}

export function mapPostActivityPage(
  response: RawPostActivityResponse,
): PostActivityPage {
  const items = (response.data ?? [])
    .map(mapActivityItem)
    .filter((item): item is PostActivityItem => Boolean(item));
  const cursor =
    typeof response.next_cursor === 'string' && response.next_cursor.trim()
      ? response.next_cursor.trim()
      : undefined;

  return {
    items,
    nextCursor: cursor,
    hasMore: response.has_more === true || response.has_more === 1 || response.has_more === '1',
  };
}

export function createActivityRepository(): ActivityRepository {
  return {
    async getPostActivity({ category, cursor, limit = 20 }) {
      const response = await backendApi.post<RawPostActivityResponse>(
        apiRoutes.feed.postActivity,
        {
          category,
          limit,
          ...(cursor ? { cursor } : {}),
        },
      );
      if (Number(response.api_status) !== 200) {
        throw new Error(
          response.errors?.error_text ||
            response.error_message ||
            'Không tải được hoạt động.',
        );
      }
      return mapPostActivityPage(response);
    },
  };
}
