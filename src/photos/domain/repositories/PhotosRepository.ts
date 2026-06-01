// Photos Repository Interface
// Port từ: client/src/photos/domain/repositories/

import type {
  PhotosListOptions,
  PhotosListPage,
  AlbumsListPage,
} from '../types/photos.types';

export interface PhotosRepository {
  getUserPhotos(
    userId: string | number,
    options?: PhotosListOptions,
  ): Promise<PhotosListPage>;
  getUserAlbums(
    userId: string | number,
    options?: PhotosListOptions,
  ): Promise<AlbumsListPage>;
}
