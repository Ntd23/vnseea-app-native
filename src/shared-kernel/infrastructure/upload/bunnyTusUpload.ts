// Description: Uploads a local video straight to Bunny Stream in resumable TUS chunks so long videos survive flaky networks.
import type ReactNativeBlobUtilModule from 'react-native-blob-util';

type BlobUtil = typeof ReactNativeBlobUtilModule;

function blobUtil(): BlobUtil {
  // Loaded lazily, like the video compressor: the native module is only needed
  // once a video uploads, so modules importing this file stay loadable in tests.
  const loaded = require('react-native-blob-util') as { default?: BlobUtil } & BlobUtil;
  return loaded.default ?? loaded;
}

/** Presigned credentials issued by the backend `media-upload-ticket` endpoint. */
export interface BunnyTusCredentials {
  endpoint: string;
  libraryId: string;
  videoId: string;
  expires: number;
  signature: string;
}

export interface BunnyTusFile {
  uri: string;
  name: string;
  type: string;
}

export interface BunnyTusOptions {
  /** Receives the uploaded fraction between 0 and 1. */
  onProgress?: (progress: number) => void;
  chunkSize?: number;
  /** Retries per chunk before giving up; each retry resumes from Bunny's offset. */
  maxRetries?: number;
  signal?: AbortSignal;
  /** Overridable for tests. */
  wait?: (milliseconds: number) => Promise<void>;
}

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
const RETRY_DELAYS_MS = [1000, 3000, 5000, 10000, 20000];

function toFilePath(uri: string) {
  const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function readHeader(headers: unknown, name: string): string {
  if (!headers) return '';
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? '';
  }
  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers as Record<string, unknown>).find(
    ([key]) => key.toLowerCase() === lowerName,
  );
  return entry ? String(entry[1]) : '';
}

/** TUS metadata values are base64; keep them ASCII so the encoder is safe. */
function metadataValue(value: string) {
  // "Đ" has no NFD decomposition, so map it before stripping accents.
  const latin = value.replace(/Đ/g, 'D').replace(/đ/g, 'd');
  const decomposed =
    typeof latin.normalize === 'function' ? latin.normalize('NFD') : latin;
  const ascii = decomposed.replace(/[^\x20-\x7E]/g, '').trim();
  return blobUtil().base64.encode(ascii || 'video');
}

function resolveUploadUrl(location: string, endpoint: string) {
  if (/^https?:\/\//i.test(location)) return location;
  const origin = endpoint.match(/^https?:\/\/[^/]+/i)?.[0] ?? '';
  return `${origin}${location.startsWith('/') ? '' : '/'}${location}`;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('Video upload was cancelled');
}

/** Size in bytes of a local file URI, or 0 when it cannot be read. */
export async function getLocalFileSize(uri: string): Promise<number> {
  try {
    const size = Number((await blobUtil().fs.stat(toFilePath(uri))).size);
    return Number.isFinite(size) && size > 0 ? size : 0;
  } catch {
    return 0;
  }
}

export async function uploadToBunnyStream(
  file: BunnyTusFile,
  credentials: BunnyTusCredentials,
  options: BunnyTusOptions = {},
): Promise<void> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const maxRetries = options.maxRetries ?? RETRY_DELAYS_MS.length;
  const wait =
    options.wait ??
    ((milliseconds: number) =>
      new Promise<void>(resolve => setTimeout(resolve, milliseconds)));
  const path = toFilePath(file.uri);
  const size = Number((await blobUtil().fs.stat(path)).size);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('The video file is empty');
  }

  const authHeaders: Record<string, string> = {
    AuthorizationSignature: credentials.signature,
    AuthorizationExpire: String(credentials.expires),
    VideoId: credentials.videoId,
    LibraryId: String(credentials.libraryId),
    'Tus-Resumable': '1.0.0',
  };

  const created = await fetch(credentials.endpoint, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Upload-Length': String(size),
      'Upload-Metadata': `filetype ${metadataValue(file.type)},title ${metadataValue(file.name)}`,
    },
  });
  const location = readHeader(created.headers, 'Location');
  if (created.status !== 201 || !location) {
    throw new Error(`Bunny upload could not start (HTTP ${created.status})`);
  }
  const uploadUrl = resolveUploadUrl(location, credentials.endpoint);

  const readServerOffset = async () => {
    const response = await fetch(uploadUrl, {
      method: 'HEAD',
      headers: authHeaders,
    });
    const offset = Number(readHeader(response.headers, 'Upload-Offset'));
    return Number.isFinite(offset) && offset >= 0 ? offset : undefined;
  };

  const sendChunk = async (offset: number, end: number) => {
    const chunkPath = `${blobUtil().fs.dirs.CacheDir}/bunny-tus-${credentials.videoId}-${offset}.part`;
    await blobUtil().fs.slice(path, chunkPath, offset, end);
    try {
      const response = await blobUtil().config({
        IOSBackgroundTask: true,
      })
        .fetch(
          'PATCH',
          uploadUrl,
          {
            ...authHeaders,
            'Upload-Offset': String(offset),
            'Content-Type': 'application/offset+octet-stream',
          },
          blobUtil().wrap(chunkPath),
        )
        .uploadProgress({ interval: 250 }, sent => {
          options.onProgress?.(Math.min(1, (offset + Number(sent)) / size));
        });
      const info = response.info();
      if (info.status !== 204 && info.status !== 200) {
        throw new Error(`Bunny rejected a video chunk (HTTP ${info.status})`);
      }
      const next = Number(readHeader(info.headers, 'Upload-Offset'));
      return Number.isFinite(next) && next > offset ? next : end;
    } finally {
      blobUtil().fs.unlink(chunkPath).catch(() => undefined);
    }
  };

  let offset = 0;
  let failures = 0;
  options.onProgress?.(0);
  while (offset < size) {
    throwIfAborted(options.signal);
    try {
      offset = await sendChunk(offset, Math.min(offset + chunkSize, size));
      failures = 0;
    } catch (error) {
      if (failures >= maxRetries) throw error;
      await wait(RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)]);
      failures += 1;
      throwIfAborted(options.signal);
      // Resume exactly where Bunny stopped instead of resending the chunk blindly.
      offset = (await readServerOffset().catch(() => undefined)) ?? offset;
    }
  }
  options.onProgress?.(1);
}
