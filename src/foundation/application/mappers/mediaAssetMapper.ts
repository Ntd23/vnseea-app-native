// Description: Maps raw media fields into shared media asset objects.
import type {
  RawRecord,
  MediaAsset,
  MediaKind,
} from '../../domain/types/foundation.types';
import { firstString } from '../normalizers/resolveValue';
import { normalizeRawUrl } from '../normalizers/url';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm3u8'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];

function inferMediaKind(url: string, mimeType?: string): MediaKind {
  if (mimeType?.startsWith('video/')) {
    return 'video';
  }

  if (mimeType?.startsWith('image/')) {
    return 'image';
  }

  const extension = url.split('?')[0].split('.').pop()?.toLowerCase();

  if (extension && VIDEO_EXTENSIONS.includes(extension)) {
    return 'video';
  }

  if (extension && IMAGE_EXTENSIONS.includes(extension)) {
    return 'image';
  }

  return 'file';
}

export function mapMediaAsset(
  record: RawRecord,
  webBaseUrl: string,
): MediaAsset | undefined {
  const rawUrl = firstString(record, ['url', 'src', 'image', 'file', 'media']);
  const url = normalizeRawUrl(rawUrl, webBaseUrl);

  if (!url) {
    return undefined;
  }

  const mimeType = firstString(record, ['mime_type', 'mimeType', 'type']);
  const thumbnailUrl = normalizeRawUrl(
    firstString(record, ['thumbnail', 'thumb', 'poster']),
    webBaseUrl,
  );

  return {
    url,
    kind: inferMediaKind(url, mimeType),
    thumbnailUrl,
    mimeType,
  };
}
