// Description: Maps Feed posts into a stable 9:16 Story card and upload draft.

import type {
  CreateStoryDraft,
  CreateStoryResult,
} from '../../../stories/domain/types/stories.types';
import type { FeedPost } from '../../domain/types/feed.types';

const STORY_DESCRIPTION_MAX_LENGTH = 300;
const STORY_TITLE_MAX_LENGTH = 100;

export const POST_STORY_CAPTURE_OPTIONS = {
  format: 'jpg',
  quality: 0.92,
  width: 1080,
  height: 1920,
  result: 'tmpfile',
} as const;

export interface PostStoryCardModel {
  postId: string;
  publisherName: string;
  publisherAvatar?: string;
  kindLabel: string;
  title: string;
  body?: string;
  mediaUrl?: string;
  showPlayIcon: boolean;
  options: string[];
  note?: string;
}

function compactText(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function buildProductPrice(post: Extract<FeedPost, { kind: 'product' }>) {
  const formatted = compactText(post.product.price_format);
  if (formatted) return formatted;

  const price = compactText(post.product.price);
  if (!price) return undefined;
  return `${post.product.currency_symbol || ''}${price}`.trim();
}

export function buildPostStoryCardModel(
  post: FeedPost,
  note: string,
): PostStoryCardModel {
  const base = {
    postId: String(post.id),
    publisherName: compactText(post.publisher.name) || 'VNSEEA',
    publisherAvatar: compactText(post.publisher.avatarUrl),
    note: compactText(note),
    showPlayIcon: false,
    options: [] as string[],
  };

  switch (post.kind) {
    case 'video':
      return {
        ...base,
        kindLabel: 'Video',
        title: compactText(post.caption) || 'Video mới',
        mediaUrl: compactText(post.thumbnailUrl),
        showPlayIcon: true,
      };
    case 'product':
      return {
        ...base,
        kindLabel: 'Sản phẩm',
        title: compactText(post.product.name) || 'Sản phẩm',
        body: buildProductPrice(post),
        mediaUrl: compactText(post.product.images?.[0]?.image),
      };
    case 'event':
      return {
        ...base,
        kindLabel: 'Sự kiện',
        title:
          compactText(post.event.name) ||
          compactText(post.event.event_name) ||
          'Sự kiện',
        body:
          compactText(post.event.location) ||
          compactText(post.event.event_location),
        mediaUrl:
          compactText(post.event.cover) || compactText(post.event.event_cover),
      };
    case 'job':
      return {
        ...base,
        kindLabel: 'Việc làm',
        title: compactText(post.job.title) || 'Việc làm',
        body: compactText(post.job.location),
        mediaUrl: compactText(post.job.image),
      };
    case 'poll':
      return {
        ...base,
        kindLabel: 'Thăm dò',
        title:
          compactText(post.pollQuestion) ||
          compactText(post.caption) ||
          'Cuộc thăm dò',
        options: post.options
          .map(option => compactText(option.text))
          .filter((option): option is string => Boolean(option))
          .slice(0, 3),
      };
    case 'ad':
      return {
        ...base,
        kindLabel: 'Quảng cáo',
        title: compactText(post.title) || 'Nội dung được tài trợ',
        body: compactText(post.description),
        mediaUrl: post.isVideo ? undefined : compactText(post.mediaUrl),
        showPlayIcon: post.isVideo,
      };
    case 'text':
    default:
      return {
        ...base,
        kindLabel: 'Bài viết',
        title: compactText(post.caption) || 'Bài viết mới',
        mediaUrl: compactText(post.photos?.[0]),
      };
  }
}

function buildStoryDescription(note: string, shareUrl: string) {
  const normalizedNote = note.trim();
  const linkLine = `Xem bài viết trên VNSEEA: ${shareUrl}`;
  if (!normalizedNote) return linkLine.slice(0, STORY_DESCRIPTION_MAX_LENGTH);

  const availableNoteLength = Math.max(
    0,
    STORY_DESCRIPTION_MAX_LENGTH - linkLine.length - 2,
  );
  const truncatedNote = normalizedNote.slice(0, availableNoteLength).trimEnd();
  return truncatedNote ? `${truncatedNote}\n\n${linkLine}` : linkLine;
}

export function buildPostStoryDraft({
  post,
  note,
  captureUri,
  shareUrl,
}: {
  post: FeedPost;
  note: string;
  captureUri: string;
  shareUrl: string;
}): CreateStoryDraft {
  const publisherName = compactText(post.publisher.name) || 'VNSEEA';
  const safePostId = String(post.id).replace(/[^a-zA-Z0-9_-]/g, '-');

  return {
    media: {
      uri: captureUri,
      name: `vnseea-post-${safePostId}.jpg`,
      type: 'image/jpeg',
      fileType: 'image',
      width: 1080,
      height: 1920,
    },
    title: `Bài viết của ${publisherName}`.slice(0, STORY_TITLE_MAX_LENGTH),
    description: buildStoryDescription(note, shareUrl),
  };
}

export async function createPostStoryShare({
  post,
  note,
  capture,
  getShareUrl,
  upload,
}: {
  post: FeedPost;
  note: string;
  capture: (options: typeof POST_STORY_CAPTURE_OPTIONS) => Promise<string>;
  getShareUrl: (postId: string) => Promise<string>;
  upload: (draft: CreateStoryDraft) => Promise<CreateStoryResult>;
}) {
  const captureUri = await capture(POST_STORY_CAPTURE_OPTIONS);
  const shareUrl = await getShareUrl(String(post.id));
  const draft = buildPostStoryDraft({
    post,
    note,
    captureUri,
    shareUrl,
  });
  const result = await upload(draft);
  return { captureUri, draft, result };
}
