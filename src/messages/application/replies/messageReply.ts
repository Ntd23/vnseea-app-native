import type {
  MessageItem,
  MessageReplyReference,
} from '../../domain/types/messages.types';
import { describeMessageTextContent } from '../preview/messageContentDescriptor';

const LEGACY_REPLY_TITLE = 'Trả lời tin nhắn';
const NUXT_INLINE_REPLY_PREFIX = '__VNSEEA_MINI_REPLY__:';

type LegacyReplyMediaType = 'image' | 'video' | 'audio' | 'file' | 'call';

function normalizeLegacyMediaType(
  value: string,
): LegacyReplyMediaType | undefined {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'image' ||
    normalized === 'video' ||
    normalized === 'audio' ||
    normalized === 'file' ||
    normalized === 'call'
  ) {
    return normalized;
  }
  return undefined;
}

function inferLegacyContentKind(
  originalText: string,
  mediaType: LegacyReplyMediaType | undefined,
  webBaseUrl: string,
): Pick<
  MessageReplyReference,
  'contentKind' | 'sharedPost' | 'link' | 'location'
> {
  if (mediaType === 'image') return { contentKind: 'image' };
  if (mediaType === 'video') return { contentKind: 'video' };
  if (mediaType === 'audio') return { contentKind: 'audio' };
  if (mediaType === 'file') return { contentKind: 'file' };
  if (mediaType === 'call') {
    return {
      contentKind: /video/i.test(originalText) ? 'video_call' : 'audio_call',
    };
  }

  const descriptor = describeMessageTextContent(originalText, webBaseUrl);
  if (descriptor.kind !== 'text') {
    return {
      contentKind: descriptor.kind,
      sharedPost: descriptor.sharedPost,
      link: descriptor.link,
      location: descriptor.location,
    };
  }

  const normalized = originalText.toLocaleLowerCase('vi-VN');
  if (
    normalized.includes('bài viết đã chia sẻ') ||
    normalized.includes('bài viết được chia sẻ') ||
    normalized.includes('shared post')
  ) {
    return { contentKind: 'shared_post' };
  }
  if (
    normalized.startsWith('địa điểm:') ||
    normalized.includes('vị trí được chia sẻ') ||
    normalized.includes('shared location')
  ) {
    return { contentKind: 'location' };
  }
  if (
    normalized.startsWith('liên kết:') ||
    normalized.startsWith('link:')
  ) {
    return { contentKind: 'link' };
  }
  if (
    normalized.includes('cuộc gọi video') ||
    normalized.includes('video call')
  ) {
    return { contentKind: 'video_call' };
  }
  if (
    normalized.includes('cuộc gọi') ||
    normalized.includes('audio call') ||
    normalized.includes('voice call')
  ) {
    return { contentKind: 'audio_call' };
  }

  return { contentKind: 'text' };
}

export function parseLegacyMessageReply(
  value: string,
  webBaseUrl: string,
): { body: string; replyTo: MessageReplyReference } | undefined {
  const [inlineReplyLine, ...inlineBodyLines] = value.split('\n');
  if (inlineReplyLine?.startsWith(NUXT_INLINE_REPLY_PREFIX)) {
    try {
      const payload = JSON.parse(
        decodeURIComponent(
          inlineReplyLine.slice(NUXT_INLINE_REPLY_PREFIX.length),
        ),
      ) as {
        author?: string;
        quote?: string;
        targetMessageId?: string | number;
        mediaUrl?: string;
        mediaType?: string;
      };
      const mediaType = normalizeLegacyMediaType(payload.mediaType ?? '');
      const text = String(payload.quote ?? '').trim();
      const content = inferLegacyContentKind(text, mediaType, webBaseUrl);
      const messageId = String(payload.targetMessageId ?? '').trim();
      if (!messageId) return undefined;

      return {
        body: inlineBodyLines.join('\n').trim(),
        replyTo: {
          messageId,
          senderId: '',
          senderName: String(payload.author ?? '').trim() || 'Người dùng',
          text,
          contentKind: content.contentKind,
          media: payload.mediaUrl || undefined,
          mediaType: mediaType === 'call' ? undefined : mediaType,
          thumbnail: mediaType === 'image' ? payload.mediaUrl : undefined,
          sharedPost: content.sharedPost,
          link: content.link,
          location: content.location,
        },
      };
    } catch {
      return undefined;
    }
  }

  if (!value.includes(LEGACY_REPLY_TITLE)) return undefined;

  const senderMatch = value.match(/👉\s*\*(.*?)\*:\s*([\s\S]*?)\s*🆔/);
  const idMatch = value.match(/🆔\s*ID:\s*\*(.*?)\*/);
  if (!senderMatch || !idMatch) return undefined;

  const imageMatch = value.match(/🖼️\s*Ảnh:\s*\*(.*?)\*/);
  const mediaMatch = value.match(/META_MEDIA:\s*\*(.*?)\*/);
  const mediaTypeMatch = value.match(/META_MEDIA_TYPE:\s*\*(.*?)\*/);
  const mediaType =
    normalizeLegacyMediaType(mediaTypeMatch?.[1] ?? '') ??
    (imageMatch ? 'image' : undefined);
  const originalText = senderMatch[2].trim();
  const content = inferLegacyContentKind(originalText, mediaType, webBaseUrl);
  const separatorIndex = value.indexOf('\n\n');
  const body =
    separatorIndex >= 0 ? value.slice(separatorIndex + 2).trim() : '';
  const media = mediaMatch?.[1] || imageMatch?.[1] || undefined;

  return {
    body,
    replyTo: {
      messageId: idMatch[1].trim(),
      senderId: '',
      senderName: senderMatch[1].trim(),
      text: originalText,
      contentKind: content.contentKind,
      media,
      mediaType: mediaType === 'call' ? undefined : mediaType,
      thumbnail: mediaType === 'image' ? media : undefined,
      sharedPost: content.sharedPost,
      link: content.link,
      location: content.location,
    },
  };
}

export function createMessageReplyReference(
  message: MessageItem,
  senderName?: string,
): MessageReplyReference {
  return {
    messageId: message.id,
    senderId: message.fromId,
    senderName: senderName || message.senderName || 'Người dùng',
    text: message.message,
    contentKind: message.contentKind ?? 'text',
    media: message.media,
    mediaType: message.mediaType,
    thumbnail: message.thumbnail,
    sharedPost: message.sharedPost,
    link: message.link,
    location: message.location,
    callEvent: message.callEvent,
    marketplaceContext: message.marketplaceContext,
    storyReply: message.storyReply,
  };
}

function mediaFileName(value?: string) {
  if (!value) return '';
  const withoutQuery = value.split(/[?#]/)[0];
  try {
    return decodeURIComponent(withoutQuery.split('/').pop() ?? '');
  } catch {
    return withoutQuery.split('/').pop() ?? '';
  }
}

export function getMessageReplyPreviewText(reply: MessageReplyReference) {
  switch (reply.contentKind) {
    case 'image':
      return 'Hình ảnh';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Tin nhắn thoại';
    case 'file': {
      const fileName = mediaFileName(reply.media);
      return fileName ? `Tệp · ${fileName}` : 'Tệp đính kèm';
    }
    case 'shared_post':
      return 'Bài viết được chia sẻ';
    case 'story':
      return 'Tin được trả lời';
    case 'location':
      return reply.location?.title || 'Vị trí được chia sẻ';
    case 'link':
      return reply.link?.host ? `Liên kết · ${reply.link.host}` : 'Liên kết';
    case 'video_call':
      return 'Cuộc gọi video';
    case 'audio_call':
      return 'Cuộc gọi thoại';
    case 'product':
      return reply.marketplaceContext?.type === 'product_inquiry'
        ? `Sản phẩm · ${reply.marketplaceContext.name}`
        : 'Sản phẩm';
    case 'order':
      return reply.marketplaceContext?.type === 'order_request'
        ? `Yêu cầu mua #${reply.marketplaceContext.orderHash}`
        : 'Yêu cầu mua';
    case 'sticker':
      return 'Nhãn dán';
    default:
      return reply.text || 'Tin nhắn';
  }
}
