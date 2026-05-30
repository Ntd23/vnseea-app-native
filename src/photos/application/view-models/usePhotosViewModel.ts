// Description: Manages the real photo grid shown from Settings.
import { useCallback, useMemo, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createPhotosRepository } from '../../infrastructure/repositories/ApiPhotosRepository';
import type { PhotosItem } from '../../domain/types/photos.types';

const PAGE_SIZE = 24;

export function usePhotosViewModel() {
  const repository = useMemo(() => createPhotosRepository(), []);
  const [photos, setPhotos] = useState<PhotosItem[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(
    async (refreshing = false) => {
      const userId = sessionStorage.getSession()?.userId;

      if (!userId) {
        setPhotos([]);
        setError('Không tìm thấy phiên đăng nhập.');
        return;
      }

      refreshing ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const result = await repository.getUserPhotos(userId, {
          limit: PAGE_SIZE,
        });
        setPhotos(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch (err) {
        setPhotos([]);
        setNextOffset(null);
        setHasMore(false);
        setError(
          err instanceof Error ? err.message : 'Không thể tải ảnh của bạn.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [repository],
  );

  const refresh = useCallback(() => loadFirstPage(true), [loadFirstPage]);

  const loadMore = useCallback(async () => {
    const userId = sessionStorage.getSession()?.userId;

    if (
      !userId ||
      !hasMore ||
      !nextOffset ||
      isLoading ||
      isRefreshing ||
      isLoadingMore
    ) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await repository.getUserPhotos(userId, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setPhotos(current => {
        const ids = new Set(current.map(photo => photo.id));
        return [
          ...current,
          ...result.items.filter(photo => !ids.has(photo.id)),
        ];
      });
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải thêm ảnh.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    nextOffset,
    repository,
  ]);

  const retry = useCallback(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  return {
    photos,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
  };
}
