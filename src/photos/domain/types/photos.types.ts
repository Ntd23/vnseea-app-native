// Photos domain types
// Port từ: client/src/photos/domain/types/

export interface PhotosItem {
  id: string;
  postId: string;
  imageUrl: string;
  caption?: string;
  postedAt?: number;
}

export interface PhotosListOptions {
  limit?: number;
  offset?: string | number | null;
}

export interface PhotosListPage {
  items: PhotosItem[];
  nextOffset: string | null;
  hasMore: boolean;
}

// Album types
import type { ContentAudience } from '../../../shared-kernel/domain/types/contentAudience';

export interface AlbumItem {
  id: string;
  postId: string;
  albumName: string;
  coverUrl: string;
  photoCount: number;
  privacy: ContentAudience;
  postedAt?: number;
}

export interface AlbumsListPage {
  items: AlbumItem[];
  nextOffset: string | null;
  hasMore: boolean;
}
