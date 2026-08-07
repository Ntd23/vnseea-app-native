const MAX_MULTIPART_FILE_NAME_LENGTH = 120;

const MIME_EXTENSIONS: Record<string, string> = {
  'audio/aac': 'aac',
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

interface SafeUploadFileNameInput {
  originalName?: string;
  mimeType?: string;
  prefix: 'audio' | 'photo' | 'video' | 'video-thumb';
  uniqueSuffix?: string;
}

function fileNameOnly(value: string): string {
  return value.split(/[\\/]/).pop()?.trim() ?? '';
}

function resolveExtension(originalName: string, mimeType?: string): string {
  const match = originalName.match(/\.([a-zA-Z0-9]{1,10})$/);
  if (match) return match[1].toLowerCase();

  return MIME_EXTENSIONS[mimeType?.toLowerCase() ?? ''] ?? 'bin';
}

function normalizeSuffix(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
  return normalized || String(Date.now());
}

/**
 * Keeps ordinary ASCII names while replacing unsafe or oversized picker names.
 * Some iOS providers expose a percent-encoded caption as the asset filename;
 * sending that value unchanged can overflow Wo_Posts.postFileName.
 */
export function createSafeUploadFileName({
  originalName = '',
  mimeType,
  prefix,
  uniqueSuffix = String(Date.now()),
}: SafeUploadFileNameInput): string {
  const candidate = fileNameOnly(originalName);
  const isSafeAscii = /^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/.test(candidate);

  if (
    isSafeAscii &&
    candidate.length > 0 &&
    candidate.length <= MAX_MULTIPART_FILE_NAME_LENGTH
  ) {
    return candidate;
  }

  const extension = resolveExtension(candidate, mimeType);
  return `${prefix}-${normalizeSuffix(uniqueSuffix)}.${extension}`;
}

export { MAX_MULTIPART_FILE_NAME_LENGTH };
