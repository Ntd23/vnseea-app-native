import { parseMapShareUrl } from '../../../user/application/utils/mapShare';
import type {
  ChatPreviewKind,
  MessageLinkReference,
  MessageLocationReference,
  SharedPostMessageReference,
} from '../../domain/types/messages.types';
import { parseSharedPostMessage } from '../shared-posts/sharedPostMessage';

const ABSOLUTE_URL_PATTERN = /(?:https?:\/\/|vnseea:\/\/)[^\s<>"']+/gi;
const WEB_URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:\/[^\s<>"']*)?/i;

export type MessageTextContentDescriptor = {
  kind: Extract<ChatPreviewKind, 'text' | 'link' | 'shared_post' | 'location'>;
  sharedPost?: SharedPostMessageReference;
  link?: MessageLinkReference;
  location?: MessageLocationReference;
};

function trimUrlPunctuation(value: string) {
  return value.replace(/[.,!?;:\])]+$/, '');
}

export function isValidMessageLocation(
  latitude: number,
  longitude: number,
) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function parseLocationFromText(value: string) {
  ABSOLUTE_URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ABSOLUTE_URL_PATTERN.exec(value)) !== null) {
    const location = parseMapShareUrl(trimUrlPunctuation(match[0]));
    if (
      location &&
      isValidMessageLocation(location.latitude, location.longitude)
    ) {
      return location;
    }
  }
  return undefined;
}

function parseLinkReference(value: string): MessageLinkReference | undefined {
  const rawUrl = value.match(WEB_URL_PATTERN)?.[0];
  if (!rawUrl) return undefined;
  const cleanUrl = trimUrlPunctuation(rawUrl);
  const url = /^https?:\/\//i.test(cleanUrl)
    ? cleanUrl
    : `https://${cleanUrl.replace(/^www\./i, '')}`;
  try {
    const parsed = new URL(url);
    return {
      url,
      host: parsed.hostname.replace(/^www\./i, ''),
    };
  } catch {
    return undefined;
  }
}

export function describeMessageTextContent(
  value: string,
  webBaseUrl: string,
): MessageTextContentDescriptor {
  const sharedPost = parseSharedPostMessage(value, webBaseUrl);
  if (sharedPost) return { kind: 'shared_post', sharedPost };

  const location = parseLocationFromText(value);
  if (location) return { kind: 'location', location };

  const link = parseLinkReference(value);
  if (link) return { kind: 'link', link };

  return { kind: 'text' };
}
