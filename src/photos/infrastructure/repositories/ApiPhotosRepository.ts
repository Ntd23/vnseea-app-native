// Description: Loads the current user's photo posts and albums from WoWonder.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { PhotosRepository } from '../../domain/repositories/PhotosRepository';
import type { AlbumItem, PhotosItem } from '../../domain/types/photos.types';

type RawRecord = Record<string, unknown>;

type PhotosApiResponse = {
  api_status: number | string;
  data?: RawRecord[];
  message?: string;
  errors?: {
    error_text?: string;
  };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function readString(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const number = Number(raw?.[key]);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function normalizeUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

function cleanCaption(raw: string) {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getNestedPhotoUrl(value: unknown) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  return readString(
    value as RawRecord,
    'image_org',
    'image',
    'postFile',
    'postFileThumb',
    'url_image',
    'url',
    'source',
    'src',
    'filename',
  );
}

function extractPhotoUrls(raw: RawRecord) {
  const urls: string[] = [];

  const append = (value: unknown) => {
    const url = normalizeUrl(getNestedPhotoUrl(value));
    if (url && !urls.includes(url)) urls.push(url);
  };

  const photoAlbum = Array.isArray(raw.photo_album) ? raw.photo_album : [];
  const photoMulti = Array.isArray(raw.photo_multi) ? raw.photo_multi : [];
  photoAlbum.forEach(append);
  photoMulti.forEach(append);

  append(raw.postFile);
  append(raw.postPhoto);

  return urls;
}

function mapPostPhotos(raw: RawRecord): PhotosItem[] {
  const postId = readString(raw, 'id', 'post_id');
  const caption = cleanCaption(readString(raw, 'postText')) || undefined;
  const postedAt = readNumber(raw, 'time', 'posted');

  return extractPhotoUrls(raw).map((imageUrl, index) => ({
    id: `${postId}-${index}-${imageUrl}`,
    postId,
    imageUrl,
    caption,
    postedAt,
  }));
}

function isSuccess(status: number | string | undefined) {
  return status === 200 || status === '200';
}

function mapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('user_id (POST) is missing')) {
    return 'Không tìm thấy tài khoản hiện tại để tải ảnh.';
  }

  if (message.includes('Recipient user not found')) {
    return 'Không tìm thấy người dùng để tải ảnh.';
  }

  return message || 'Không thể tải ảnh. Vui lòng thử lại.';
}

export function createPhotosRepository(): PhotosRepository {
  return {
    async getUserPhotos(userId, options = {}) {
      const limit = options.limit ?? 24;

      try {
        const response = await apiBridge.post<PhotosApiResponse>(
          apiRoutes.photos.getUserAlbums,
          {
            user_id: String(userId),
            type: 'photos',
            limit,
            offset: options.offset ? String(options.offset) : undefined,
          },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Không thể tải ảnh.',
          );
        }

        const rawPosts = Array.isArray(response.data) ? response.data : [];
        const lastPost = rawPosts[rawPosts.length - 1];

        return {
          items: rawPosts.flatMap(mapPostPhotos),
          nextOffset: readString(lastPost, 'id', 'post_id') || null,
          hasMore:
            rawPosts.length >= limit &&
            Boolean(readString(lastPost, 'id', 'post_id')),
        };
      } catch (error) {
        console.warn('[ApiPhotosRepository] get user photos failed', error);
        throw new Error(mapError(error));
      }
    },

    async getUserAlbums(userId, options = {}) {
      const limit = options.limit ?? 20;

      try {
        const response = await apiBridge.post<PhotosApiResponse>(
          apiRoutes.photos.create,
          {
            type: 'fetch',
            user_id: String(userId),
            limit: String(limit),
            offset: options.offset ? String(options.offset) : '0',
          },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Không thể tải albums.',
          );
        }

        const rawAlbums = Array.isArray(response.data) ? response.data : [];
        const lastAlbum = rawAlbums[rawAlbums.length - 1];

        // Map raw albums to AlbumItem
        const albums: AlbumItem[] = rawAlbums.map((raw) => {
          const postId = readString(raw, 'id', 'post_id');
          const albumName = cleanCaption(readString(raw, 'album_name', 'postText')) || 'Album không tên';

          // Wo_GetUserAlbums exposes the same cover used by phtml as first_image.
          const photoAlbum = Array.isArray(raw.photo_album) ? raw.photo_album : [];
          const firstPhoto = photoAlbum[0];
          let coverUrl = normalizeUrl(readString(raw, 'first_image'));
          if (!coverUrl) {
            coverUrl = normalizeUrl(getNestedPhotoUrl(firstPhoto));
          }
          if (!coverUrl) {
            coverUrl = normalizeUrl(
              readString(raw, 'postPhoto', 'postFile', 'postFileThumb', 'url_image'),
            );
          }
          if (!coverUrl) {
            coverUrl = normalizeUrl(readString(raw, 'avatar', 'cover'));
          }

          // Count photos
          const photoCount = Array.isArray(raw.photo_album)
            ? raw.photo_album.length
            : (Array.isArray(raw.photo_multi) ? raw.photo_multi.length : 0);

          // Get privacy
          const privacyValue = readNumber(raw, 'postPrivacy', 'privacy');
          let privacy: 'public' | 'friends' | 'private' = 'public';
          if (privacyValue === 2) privacy = 'friends';
          else if (privacyValue === 3) privacy = 'private';

          const postedAt = readNumber(raw, 'time', 'posted');

          return {
            id: postId || String(Math.random()),
            postId,
            albumName,
            coverUrl,
            photoCount,
            privacy,
            postedAt,
          };
        });

        return {
          items: albums,
          nextOffset: readString(lastAlbum, 'id', 'post_id') || null,
          hasMore:
            rawAlbums.length >= limit &&
            Boolean(readString(lastAlbum, 'id', 'post_id')),
        };
      } catch (error) {
        console.warn('[ApiPhotosRepository] get user albums failed', error);
        throw new Error(mapError(error));
      }
    },
  };
}
