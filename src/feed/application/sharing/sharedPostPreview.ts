import type {
  FeedPost,
  SharedPostPreviewModel,
} from '../../domain/types/feed.types';

function compactText(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = compactText(value);
    if (text) return text;
  }
  return undefined;
}

function productPrice(post: Extract<FeedPost, { kind: 'product' }>) {
  const formatted = compactText(post.product.price_format);
  if (formatted) return formatted;
  const price = compactText(post.product.price);
  return price
    ? `${compactText(post.product.currency_symbol) ?? ''}${price}`.trim()
    : undefined;
}

export function buildSharedPostPreviewModel(
  post: FeedPost,
): SharedPostPreviewModel {
  const base = {
    postId: String(post.id),
    publisher: post.publisher,
    postedAt: post.postedAt,
    privacy: 'privacy' in post ? post.privacy : ('public' as const),
    feeling: post.feeling,
    taggedUsers: post.taggedUsers,
    location: post.location,
  };

  switch (post.kind) {
    case 'video':
      return {
        ...base,
        caption: compactText(post.caption),
        mentionNames: post.mentionNames,
        content: {
          kind: 'video',
          videoUrl: post.videoUrl,
          thumbnailUrl: compactText(post.thumbnailUrl),
        },
      };
    case 'poll':
      return {
        ...base,
        caption: compactText(post.caption),
        mentionNames: post.mentionNames,
        content: {
          kind: 'poll',
          question:
            firstText(post.pollQuestion, post.caption) ?? 'Cuộc thăm dò',
          options: post.options
            .map(option => compactText(option.text))
            .filter((option): option is string => Boolean(option))
            .slice(0, 3),
        },
      };
    case 'product':
      return {
        ...base,
        content: {
          kind: 'attachment',
          attachmentKind: 'product',
          title: firstText(post.product.name) ?? 'Sản phẩm',
          subtitle: productPrice(post),
          imageUrl: compactText(post.product.images?.[0]?.image),
        },
      };
    case 'event':
      return {
        ...base,
        content: {
          kind: 'attachment',
          attachmentKind: 'event',
          title:
            firstText(post.event.name, post.event.event_name) ?? 'Sự kiện',
          subtitle: firstText(
            post.event.location,
            post.event.event_location,
          ),
          imageUrl: firstText(post.event.cover, post.event.event_cover),
        },
      };
    case 'job':
      return {
        ...base,
        content: {
          kind: 'attachment',
          attachmentKind: 'job',
          title: firstText(post.job.title) ?? 'Việc làm',
          subtitle: firstText(post.job.location),
          imageUrl: firstText(post.job.image),
        },
      };
    case 'ad':
      return {
        ...base,
        content: {
          kind: 'attachment',
          attachmentKind: 'ad',
          title: firstText(post.title) ?? 'Nội dung được tài trợ',
          subtitle: firstText(post.description),
          imageUrl: post.isVideo ? undefined : firstText(post.mediaUrl),
        },
      };
    case 'text':
    default:
      return {
        ...base,
        caption: compactText(post.caption),
        mentionNames: post.mentionNames,
        content: {
          kind: 'text',
          photos: post.photos,
          audioUrl: compactText(post.audioUrl),
          linkPreview: post.linkPreview,
        },
      };
  }
}

export function getSharedPostPreviewAssetUrls(
  model: SharedPostPreviewModel,
): string[] {
  const urls = [model.publisher.avatarUrl];
  switch (model.content.kind) {
    case 'text':
      urls.push(...model.content.photos.slice(0, 4));
      if (model.content.linkPreview?.image) {
        urls.push(model.content.linkPreview.image);
      }
      break;
    case 'video':
      urls.push(model.content.thumbnailUrl);
      break;
    case 'attachment':
      urls.push(model.content.imageUrl);
      break;
    case 'poll':
      break;
  }
  return Array.from(
    new Set(urls.filter((url): url is string => Boolean(url?.trim()))),
  );
}

export function getSharedPostPreviewPrimaryMediaUrl(
  model: SharedPostPreviewModel,
): string | undefined {
  switch (model.content.kind) {
    case 'text':
      return (
        model.content.photos[0] ?? model.content.linkPreview?.image ?? undefined
      );
    case 'video':
      return model.content.thumbnailUrl;
    case 'attachment':
      return model.content.imageUrl;
    case 'poll':
      return undefined;
  }
}

export function getPostRealtimeWatchIds(
  posts: FeedPost[],
  requestedIds: Array<string | number>,
  limit = 50,
): string[] {
  const requested = requestedIds
    .map(value => String(value).trim())
    .filter(value => /^[1-9][0-9]*$/.test(value));
  const requestedSet = new Set(requested);
  const sourceIds = posts
    .filter(post => requestedSet.has(String(post.id)))
    .map(post => String(post.sharedPostId ?? ''))
    .filter(value => /^[1-9][0-9]*$/.test(value));
  return Array.from(new Set([...requested, ...sourceIds])).slice(0, limit);
}

export function applySharedPostSourceSnapshot(
  outerPost: FeedPost,
  sourcePost: FeedPost,
): FeedPost {
  if (String(outerPost.sharedPostId ?? '') !== String(sourcePost.id)) {
    return outerPost;
  }
  const sharedPost = buildSharedPostPreviewModel(sourcePost);
  if (outerPost.kind === 'video' && sharedPost.content.kind === 'video') {
    return {
      ...outerPost,
      sharedPost,
      videoUrl: sharedPost.content.videoUrl,
      thumbnailUrl: sharedPost.content.thumbnailUrl,
    };
  }
  return { ...outerPost, sharedPost };
}
