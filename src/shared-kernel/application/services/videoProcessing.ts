import { Platform } from 'react-native';

/**
 * The composer keeps its own attachment types, so this service deliberately
 * works with a small, transport-friendly shape.  That keeps media processing
 * out of the screens and lets us replace the native implementation later
 * (for example with an FFmpegKitNext adapter) without changing the UI.
 */
export type VideoProcessingAttachment = {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUri?: string;
  thumbnailName?: string;
  thumbnailType?: string;
};

export type PrepareVideoOptions = {
  /** Receives a throttled value between 0 and 1. */
  onProgress?: (progress: number) => void;
  /** Allows a caller to cancel an in-flight native compression. */
  signal?: AbortSignal;
  /** Override the native size threshold, for example to normalize chat MOVs. */
  minimumFileSizeForCompress?: number;
};

type NativeVideoCompressor = {
  compress: (
    fileUrl: string,
    options?: {
      compressionMethod?: 'auto' | 'manual';
      maxSize?: number;
      minimumFileSizeForCompress?: number;
      progressDivider?: number;
      getCancellationId?: (id: string) => void;
    },
    onProgress?: (progress: number) => void,
  ) => Promise<string>;
  cancelCompression?: (id: string) => void;
};

type NativeCompressorPackage = {
  Video?: NativeVideoCompressor;
  default?: {
    Video?: NativeVideoCompressor;
  };
};

const MAX_VIDEO_DIMENSION = 1080;
const MINIMUM_COMPRESS_SIZE_MB = 8;
const PROGRESS_DIVIDER = 10;

let nativeVideo: NativeVideoCompressor | null | undefined;
let activeCancellationId: string | undefined;

function resolveNativeVideo(): NativeVideoCompressor | undefined {
  if (nativeVideo !== undefined) {
    return nativeVideo ?? undefined;
  }

  try {
    // Keep the native dependency lazy.  This is important for web/Jest and
    // gives older builds a safe pass-through fallback while the native app is
    // being upgraded.
    const loaded =
      require('react-native-compressor') as NativeCompressorPackage;
    nativeVideo = loaded.Video ?? loaded.default?.Video ?? null;
  } catch (error) {
    nativeVideo = null;
    if (__DEV__) {
      console.warn('[video-processing] native compressor unavailable', error);
    }
  }

  return nativeVideo ?? undefined;
}

function isLocalVideoUri(uri: string) {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    (!/^https?:\/\//i.test(uri) && !uri.startsWith('ph://'))
  );
}

function normalizeLocalUri(uri: string) {
  if (!uri) return uri;
  if (uri.startsWith('file://content://')) {
    return uri.slice('file://'.length);
  }
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  return Platform.OS === 'android' ? `file://${uri}` : uri;
}

function getOutputName(uri: string, fallbackName: string) {
  const leaf = uri.split('?')[0].split('/').pop()?.trim();
  if (leaf && /\.(mp4|m4v|mov)$/i.test(leaf)) {
    return leaf.replace(/\.(m4v|mov)$/i, '.mp4');
  }

  const safeFallback = fallbackName.replace(/\.[^/.]+$/, '');
  return `${safeFallback || 'video'}-compressed.mp4`;
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0;
  // Some native implementations report 0..100 while others report 0..1.
  const normalized = progress > 1 ? progress / 100 : progress;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Compress a local video before multipart upload.
 *
 * The operation is intentionally fail-open: if native compression is not
 * linked, the URI is a content URI the native module cannot read, or the
 * device rejects the transcode, the original file is returned unchanged so a
 * post/reel can still be uploaded.
 */
export async function prepareVideoForUpload<
  T extends VideoProcessingAttachment,
>(video: T, options: PrepareVideoOptions = {}): Promise<T> {
  if (!video.uri || !isLocalVideoUri(video.uri)) {
    return video;
  }

  const compressor = resolveNativeVideo();
  if (!compressor?.compress) {
    return video;
  }

  let cancellationId: string | undefined;
  let lastProgressAt = 0;
  const abortHandler = () => {
    if (cancellationId && compressor.cancelCompression) {
      compressor.cancelCompression(cancellationId);
    }
  };

  if (options.signal) {
    if (options.signal.aborted) {
      return video;
    }
    options.signal.addEventListener('abort', abortHandler, { once: true });
  }

  try {
    const sourceUri = normalizeLocalUri(video.uri);
    const compressedUri = await compressor.compress(
      sourceUri,
      {
        compressionMethod: 'auto',
        maxSize: MAX_VIDEO_DIMENSION,
        minimumFileSizeForCompress:
          options.minimumFileSizeForCompress ?? MINIMUM_COMPRESS_SIZE_MB,
        progressDivider: PROGRESS_DIVIDER,
        getCancellationId: id => {
          cancellationId = id;
          activeCancellationId = id;
        },
      },
      progress => {
        const now = Date.now();
        // Avoid re-rendering the React tree for every encoder callback.
        if (now - lastProgressAt < 250) return;
        lastProgressAt = now;
        options.onProgress?.(clampProgress(progress));
      },
    );

    const outputUri = normalizeLocalUri(compressedUri);
    if (!outputUri || outputUri === sourceUri) {
      return video;
    }

    options.onProgress?.(1);
    return {
      ...video,
      uri: outputUri,
      name: getOutputName(outputUri, video.name),
      type: 'video/mp4',
      // A transcode may change the dimensions, so leave the original hints
      // intact only when the picker supplied them.  The server does not rely
      // on these optional fields.
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[video-processing] compression failed; using original', {
        uri: video.uri,
        error,
      });
    }
    return video;
  } finally {
    if (options.signal) {
      options.signal.removeEventListener('abort', abortHandler);
    }
    if (activeCancellationId === cancellationId) {
      activeCancellationId = undefined;
    }
  }
}

/** Cancel the currently running compression, if any. */
export function cancelVideoProcessing() {
  const compressor = resolveNativeVideo();
  if (activeCancellationId && compressor?.cancelCompression) {
    compressor.cancelCompression(activeCancellationId);
  }
  activeCancellationId = undefined;
}
