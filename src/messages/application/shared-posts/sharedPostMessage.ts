import type { FeedRepository } from '../../../feed/domain/repositories/FeedRepository';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import type { SharedPostMessageReference } from '../../domain/types/messages.types';

const SHARED_POST_URL_PATTERN = /(?:https?:\/\/|vnseea:\/\/)[^\s<>()]+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:\])]+$/;

export type SharedPostPreviewModel = {
  postId: string;
  kind: FeedPost['kind'];
  productId?: number;
  jobId?: string;
  job?: JobsItem;
  publisherName: string;
  publisherAvatar?: string;
  companyName?: string;
  companyAvatar?: string;
  category?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  points?: string;
  location?: string;
  isVideo: boolean;
};

export type SharedPostOpenTarget = {
  postId: string;
  kind?: FeedPost['kind'];
  productId?: number;
  jobId?: string;
  job?: JobsItem;
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

function formatProductPrice(post: Extract<FeedPost, { kind: 'product' }>) {
  const formatted = firstText(post.product.price_format, post.product.price);
  if (!formatted) return undefined;
  const currency = firstText(
    post.product.currency_code,
    post.product.currency_symbol,
    post.product.currency,
  );
  return currency && !formatted.toUpperCase().includes(currency.toUpperCase())
    ? `${formatted} ${currency}`
    : formatted;
}

function formatProductPoints(post: Extract<FeedPost, { kind: 'product' }>) {
  const rawPoints = String(post.product.points ?? '').trim();
  if (!rawPoints) return undefined;
  const points = Number(rawPoints.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(points) || points <= 0) return undefined;
  return `${points.toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
  })} VNSEEA`;
}

function formatJobSalary(post: Extract<FeedPost, { kind: 'job' }>) {
  const minimum = Number(post.job.minimum ?? 0);
  const maximum = Number(post.job.maximum ?? 0);
  if (minimum <= 0 && maximum <= 0) return undefined;
  const currency = firstText(post.job.currency_symbol, post.job.currency) || '';
  const period = firstText(post.job.salary_date_label, post.job.salary_date);
  const range =
    minimum > 0 && maximum > 0
      ? `${currency}${minimum.toLocaleString('vi-VN')} - ${currency}${maximum.toLocaleString('vi-VN')}`
      : `${currency}${Math.max(minimum, maximum).toLocaleString('vi-VN')}`;
  return period ? `${range} / ${period}` : range;
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
        productId:
          Number(post.product.id) > 0 ? Number(post.product.id) : undefined,
        title: firstText(post.product.name) || 'Sản phẩm',
        eyebrow: 'PRODUCT',
        description: firstText(post.product.description),
        imageUrl: firstText(post.product.images?.[0]?.image),
        price: formatProductPrice(post),
        points: formatProductPoints(post),
        location: firstText(post.product.location),
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
        jobId: String(post.job.id || '').trim() || undefined,
        job: post.job,
        companyName: firstText(
          post.job.page?.page_title,
          post.job.page?.page_name,
          base.publisherName,
        ),
        companyAvatar: firstText(
          post.job.page?.avatar,
          base.publisherAvatar,
        ),
        category: firstText(post.job.category_label, post.job.category),
        title: firstText(post.job.title) || 'Việc làm',
        eyebrow: 'VIỆC LÀM',
        description: firstText(post.job.description),
        imageUrl: firstText(post.job.image),
        price: formatJobSalary(post),
        points: firstText(post.job.job_type_label, post.job.job_type),
        location: firstText(post.job.location),
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
