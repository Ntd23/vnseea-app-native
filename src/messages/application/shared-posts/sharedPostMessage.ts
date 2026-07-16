import type { FeedRepository } from '../../../feed/domain/repositories/FeedRepository';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import type { SharedPostMessageReference } from '../../domain/types/messages.types';

const SHARED_POST_URL_PATTERN = /(?:https?:\/\/|vnseea:\/\/)[^\s<>()]+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:\])]+$/;

export type SharedPostPreviewModel = {
  postId: string;
  kind: FeedPost['kind'];
  publisherName: string;
  publisherAvatar?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  isVideo: boolean;
};

type SharedPostPreviewRepository = Pick<FeedRepository, 'getPostById'>;

export type SharedPostPreviewLoader = {
  load(postId: string): Promise<SharedPostPreviewModel>;
};

function readWebPostId(candidate: string, webBaseUrl: string) {
  try {
    const url = new URL(candidate);
    const baseUrl = new URL(webBaseUrl);
    if (!/^https?:$/.test(url.protocol) || url.host !== baseUrl.host) {
      return undefined;
    }

    const match = url.pathname.match(/^\/post\/([^/]+)\/?$/i);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

function readDeepLinkPostId(candidate: string) {
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'vnseea:' || url.hostname.toLowerCase() !== 'post') {
      return undefined;
    }

    const postId = url.pathname.replace(/^\/+|\/+$/g, '');
    return postId ? decodeURIComponent(postId) : undefined;
  } catch {
    return undefined;
  }
}

function normalizeSharedPostNote(before: string, after: string) {
  return [before.trimEnd(), after.trimStart()]
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseSharedPostMessage(
  message: string,
  webBaseUrl: string,
): SharedPostMessageReference | undefined {
  if (!message.trim()) return undefined;

  SHARED_POST_URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SHARED_POST_URL_PATTERN.exec(message)) !== null) {
    const rawUrl = match[0];
    const url = rawUrl.replace(TRAILING_URL_PUNCTUATION, '');
    const postId = url.toLowerCase().startsWith('vnseea://')
      ? readDeepLinkPostId(url)
      : readWebPostId(url, webBaseUrl);
    if (!postId) continue;

    return {
      postId,
      url,
      note: normalizeSharedPostNote(
        message.slice(0, match.index),
        message.slice(match.index + rawUrl.length),
      ),
    };
  }

  return undefined;
}

function firstText(...values: Array<string | undefined | null>) {
  return values.map(value => value?.trim()).find(Boolean) || undefined;
}

export function buildSharedPostPreviewModel(
  post: FeedPost,
): SharedPostPreviewModel {
  const base = {
    postId: String(post.id),
    kind: post.kind,
    publisherName: post.publisher.name || post.publisher.username || 'VNSEEA',
    publisherAvatar: post.publisher.avatarUrl,
    isVideo: false,
  };

  switch (post.kind) {
    case 'video':
      return {
        ...base,
        title: firstText(post.caption) || 'Video',
        imageUrl: firstText(post.thumbnailUrl),
        isVideo: true,
      };
    case 'poll':
      return {
        ...base,
        title: firstText(post.pollQuestion, post.caption) || 'Thăm dò',
        description: post.options
          .slice(0, 3)
          .map(option => option.text)
          .filter(Boolean)
          .join(' • '),
      };
    case 'product':
      return {
        ...base,
        title: firstText(post.product.name) || 'Sản phẩm',
        description: firstText(
          post.product.price_format,
          post.product.description,
        ),
        imageUrl: firstText(post.product.images?.[0]?.image),
      };
    case 'event':
      return {
        ...base,
        title:
          firstText(post.event.name, post.event.event_name) || 'Sự kiện',
        description: firstText(
          post.event.location,
          post.event.event_location,
          post.event.description,
          post.event.event_description,
        ),
        imageUrl: firstText(post.event.cover, post.event.event_cover),
      };
    case 'job':
      return {
        ...base,
        title: firstText(post.job.title) || 'Việc làm',
        description: firstText(post.job.location, post.job.description),
        imageUrl: firstText(post.job.image),
      };
    case 'ad':
      return {
        ...base,
        title: firstText(post.title) || 'Nội dung được tài trợ',
        description: firstText(post.description),
        imageUrl: post.isVideo ? undefined : firstText(post.mediaUrl),
        isVideo: post.isVideo,
      };
    case 'text':
    default:
      return {
        ...base,
        title:
          firstText(post.caption) ||
          (post.photos.length > 0 ? 'Bài viết có ảnh' : 'Bài viết'),
        description: firstText(post.linkPreview?.description),
        imageUrl: firstText(post.photos[0], post.linkPreview?.image),
      };
  }
}

export function createSharedPostPreviewLoader(
  repository: SharedPostPreviewRepository,
  maxEntries = 100,
): SharedPostPreviewLoader {
  const cache = new Map<string, Promise<SharedPostPreviewModel>>();
  const safeMaxEntries = Math.max(1, maxEntries);

  return {
    load(postId) {
      const normalizedPostId = String(postId || '').trim();
      const cached = cache.get(normalizedPostId);
      if (cached) return cached;

      while (cache.size >= safeMaxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
      }

      const request = repository
        .getPostById(normalizedPostId, {
          fetchComments: false,
          addView: false,
        })
        .then(result => buildSharedPostPreviewModel(result.post));
      cache.set(normalizedPostId, request);
      request.catch(() => {
        if (cache.get(normalizedPostId) === request) {
          cache.delete(normalizedPostId);
        }
      });
      return request;
    },
  };
}
