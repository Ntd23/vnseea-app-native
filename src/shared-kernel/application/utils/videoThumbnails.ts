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
const VIDEO_POSTER_CACHE_LIMIT = 140;
const VIDEO_POSTER_FAILURE_COOLDOWN_MS = 2 * 60 * 1000;

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

type CreateVideoThumbnailOptions = {
  timeStamp?: number;
  cacheName?: string;
};

type VideoPosterCacheEntry = GeneratedVideoThumbnail & {
  cacheKey: string;
};

const videoPosterMemoryCache = new Map<string, VideoPosterCacheEntry>();
const videoPosterFailureCache = new Map<string, number>();
const videoPosterInFlight = new Map<
  string,
  Promise<GeneratedVideoThumbnail | undefined>
>();
let videoPosterSerialQueue: Promise<unknown> = Promise.resolve();

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

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getVideoPosterCacheKey(videoUri: string, cacheKey?: string) {
  return `${cacheKey || 'video'}:${videoUri}`;
}

function getStableVideoPosterCacheName(cacheKey: string) {
  return `vnseea_video_poster_${stableHash(cacheKey)}`;
}

function rememberVideoPosterThumbnail(
  cacheKey: string,
  thumbnail: GeneratedVideoThumbnail,
) {
  if (videoPosterMemoryCache.has(cacheKey)) {
    videoPosterMemoryCache.delete(cacheKey);
  }
  videoPosterMemoryCache.set(cacheKey, {
    ...thumbnail,
    cacheKey,
  });

  while (videoPosterMemoryCache.size > VIDEO_POSTER_CACHE_LIMIT) {
    const oldestKey = videoPosterMemoryCache.keys().next().value;
    if (!oldestKey) break;
    videoPosterMemoryCache.delete(oldestKey);
  }
}

function runVideoPosterTaskSerially<T>(task: () => Promise<T>) {
  const runTask = videoPosterSerialQueue.then(task, task);
  videoPosterSerialQueue = runTask.catch(() => undefined);
  return runTask;
}

async function createThumbnailAt(
  videoUri: string,
  timeStamp: number,
  cacheName: string,
) {
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
    cacheName,
  });
}

async function createVideoThumbnail(
  videoUri: string,
  options: CreateVideoThumbnailOptions = {},
): Promise<GeneratedVideoThumbnail | undefined> {
  if (!videoUri) return undefined;
  const timeStamp = options.timeStamp ?? DEFAULT_VIDEO_THUMBNAIL_TIME_MS;
  const cacheName =
    options.cacheName ?? `vnseea_video_thumb_${Date.now()}_${timeStamp}`;

  try {
    const thumbnail = await createThumbnailAt(videoUri, timeStamp, cacheName);
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
      const thumbnail = await createThumbnailAt(videoUri, 0, `${cacheName}_0`);
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

export async function createVideoUploadThumbnail(
  videoUri: string,
  timeStamp = DEFAULT_VIDEO_THUMBNAIL_TIME_MS,
): Promise<GeneratedVideoThumbnail | undefined> {
  return createVideoThumbnail(videoUri, { timeStamp });
}

export function getCachedVideoPosterThumbnail(
  videoUri: string,
  cacheKey?: string,
): GeneratedVideoThumbnail | undefined {
  if (!videoUri) return undefined;
  const resolvedCacheKey = getVideoPosterCacheKey(videoUri, cacheKey);
  return videoPosterMemoryCache.get(resolvedCacheKey);
}

export async function createCachedVideoPosterThumbnail(
  videoUri: string,
  cacheKey?: string,
): Promise<GeneratedVideoThumbnail | undefined> {
  if (!videoUri) return undefined;

  const resolvedCacheKey = getVideoPosterCacheKey(videoUri, cacheKey);
  const cachedThumbnail = videoPosterMemoryCache.get(resolvedCacheKey);
  if (cachedThumbnail) {
    return cachedThumbnail;
  }

  const lastFailureAt = videoPosterFailureCache.get(resolvedCacheKey) ?? 0;
  if (Date.now() - lastFailureAt < VIDEO_POSTER_FAILURE_COOLDOWN_MS) {
    return undefined;
  }

  const inFlight = videoPosterInFlight.get(resolvedCacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = runVideoPosterTaskSerially(async () => {
    const thumbnail = await createVideoThumbnail(videoUri, {
      timeStamp: DEFAULT_VIDEO_THUMBNAIL_TIME_MS,
      cacheName: getStableVideoPosterCacheName(resolvedCacheKey),
    });
    if (thumbnail?.uri) {
      videoPosterFailureCache.delete(resolvedCacheKey);
      rememberVideoPosterThumbnail(resolvedCacheKey, thumbnail);
      return thumbnail;
    }
    videoPosterFailureCache.set(resolvedCacheKey, Date.now());
    return undefined;
  }).finally(() => {
    videoPosterInFlight.delete(resolvedCacheKey);
  });

  videoPosterInFlight.set(resolvedCacheKey, promise);
  return promise;
}
