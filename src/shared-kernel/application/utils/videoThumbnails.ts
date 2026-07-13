import { NativeModules, Platform } from 'react-native';

export type GeneratedVideoThumbnail = {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
};

const DEFAULT_VIDEO_THUMBNAIL_TIME_MS = 1000;
const VIDEO_THUMBNAIL_WIDTH = 525;
const VIDEO_THUMBNAIL_HEIGHT = 295;

type NativeVideoThumbnail = {
  path: string;
  size?: number;
  mime?: string;
  width?: number;
  height?: number;
};

type NativeCreateThumbnailModule = {
  create?: (config: {
    url: string;
    timeStamp?: number;
    format?: 'jpeg' | 'png';
    cacheName?: string;
    maxWidth?: number;
    maxHeight?: number;
  }) => Promise<NativeVideoThumbnail>;
};

function normalizeThumbnailUri(path?: string) {
  if (!path) return '';
  if (path.startsWith('file://') || path.startsWith('content://')) {
    return path;
  }
  return Platform.OS === 'android' ? `file://${path}` : path;
}

function getThumbnailName(uri: string) {
  const cleanUri = uri.split('?')[0];
  const leaf = cleanUri.split('/').pop();
  if (leaf && /\.[a-z0-9]+$/i.test(leaf)) {
    return leaf;
  }
  return `video-thumb-${Date.now()}.jpg`;
}

async function createThumbnailAt(videoUri: string, timeStamp: number) {
  const nativeModule = NativeModules.CreateThumbnail as
    | NativeCreateThumbnailModule
    | undefined;
  if (!nativeModule?.create) {
    throw new Error('react-native-create-thumbnail native module is not linked');
  }

  return nativeModule.create({
    url: videoUri,
    timeStamp,
    format: 'jpeg',
    maxWidth: VIDEO_THUMBNAIL_WIDTH,
    maxHeight: VIDEO_THUMBNAIL_HEIGHT,
    cacheName: `vnseea_video_thumb_${Date.now()}_${timeStamp}`,
  });
}

export async function createVideoUploadThumbnail(
  videoUri: string,
  timeStamp = DEFAULT_VIDEO_THUMBNAIL_TIME_MS,
): Promise<GeneratedVideoThumbnail | undefined> {
  if (!videoUri) return undefined;

  try {
    const thumbnail = await createThumbnailAt(videoUri, timeStamp);
    const uri = normalizeThumbnailUri(thumbnail.path);
    if (!uri) return undefined;
    return {
      uri,
      name: getThumbnailName(uri),
      type: thumbnail.mime || 'image/jpeg',
      width: thumbnail.width,
      height: thumbnail.height,
    };
  } catch (firstError) {
    try {
      const thumbnail = await createThumbnailAt(videoUri, 0);
      const uri = normalizeThumbnailUri(thumbnail.path);
      if (!uri) return undefined;
      return {
        uri,
        name: getThumbnailName(uri),
        type: thumbnail.mime || 'image/jpeg',
        width: thumbnail.width,
        height: thumbnail.height,
      };
    } catch (fallbackError) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[video-thumbnail] create thumbnail failed', {
          videoUri,
          firstError,
          fallbackError,
        });
      }
      return undefined;
    }
  }
}
