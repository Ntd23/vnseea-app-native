import { NativeModules } from 'react-native';

/**
 * Downscales a picked image before multipart upload.
 *
 * Decoding happens in the app-owned `VnseeaUploadImageProcessor` native module
 * (ImageIO on iOS, ImageDecoder/BitmapFactory on Android).  It reads the file
 * straight into the target size and bakes the EXIF orientation into the
 * pixels, so a 48MP camera photo never becomes a full-resolution bitmap and
 * the uploaded JPEG is always upright.
 */
export type ImageProcessingAttachment = {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
};

export type PrepareImageOptions = {
  /** Longest side of the uploaded image, in pixels. */
  maxDimension?: number;
  /** JPEG quality between 0 and 1. */
  quality?: number;
  /** JPEG/PNG files at or under this size and dimension are sent unchanged. */
  passthroughMaxBytes?: number;
};

type NativePreparedImage = {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  type: string;
  fileSize?: number;
  transformed: boolean;
};

type NativeUploadImageProcessor = {
  prepare: (
    uri: string,
    options: Required<PrepareImageOptions>,
  ) => Promise<NativePreparedImage>;
};

export const DEFAULT_UPLOAD_IMAGE_MAX_DIMENSION = 2048;
export const DEFAULT_UPLOAD_IMAGE_QUALITY = 0.8;
export const DEFAULT_UPLOAD_IMAGE_PASSTHROUGH_BYTES = 1024 * 1024;

function resolveNativeProcessor(): NativeUploadImageProcessor | undefined {
  const processor = NativeModules.VnseeaUploadImageProcessor as
    | NativeUploadImageProcessor
    | undefined;
  return typeof processor?.prepare === 'function' ? processor : undefined;
}

function isLocalImageUri(uri: string) {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');
}

function isAnimatedGif(image: ImageProcessingAttachment) {
  return (
    image.type.toLowerCase() === 'image/gif' || /\.gif$/i.test(image.name)
  );
}

function getOutputName(name: string, type: string) {
  const extension = type === 'image/png' ? 'png' : 'jpg';
  const baseName = name.replace(/\.[^/.]+$/, '').trim() || `image-${Date.now()}`;
  return `${baseName}.${extension}`;
}

/**
 * Returns an upload-sized copy of a local image.
 *
 * The operation is fail-open: animated GIFs, remote URIs, older native builds
 * without the processor and decoder failures all return the original image so
 * the message can still be sent.
 */
export async function prepareImageForUpload<T extends ImageProcessingAttachment>(
  image: T,
  options: PrepareImageOptions = {},
): Promise<T> {
  if (!image.uri || !isLocalImageUri(image.uri) || isAnimatedGif(image)) {
    return image;
  }

  const processor = resolveNativeProcessor();
  if (!processor) {
    return image;
  }

  try {
    const prepared = await processor.prepare(image.uri, {
      maxDimension: options.maxDimension ?? DEFAULT_UPLOAD_IMAGE_MAX_DIMENSION,
      quality: options.quality ?? DEFAULT_UPLOAD_IMAGE_QUALITY,
      passthroughMaxBytes:
        options.passthroughMaxBytes ?? DEFAULT_UPLOAD_IMAGE_PASSTHROUGH_BYTES,
    });

    if (!prepared?.transformed || !prepared.uri) {
      return {
        ...image,
        width: prepared?.width || image.width,
        height: prepared?.height || image.height,
      };
    }

    return {
      ...image,
      uri: prepared.uri,
      name: getOutputName(image.name, prepared.type),
      type: prepared.type,
      width: prepared.width,
      height: prepared.height,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[image-processing] preparation failed; using original', {
        uri: image.uri,
        error,
      });
    }
    return image;
  }
}
