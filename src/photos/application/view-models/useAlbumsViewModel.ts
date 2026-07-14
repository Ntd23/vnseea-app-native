// Description: Manages the user's albums list state with real API data.
import { useCallback, useMemo, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createPhotosRepository } from '../../infrastructure/repositories/ApiPhotosRepository';
import type { AlbumItem } from '../../domain/types/photos.types';

const PAGE_SIZE = 50;

export function useAlbumsViewModel() {
  const repository = useMemo(() => createPhotosRepository(), []);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
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
        setAlbums([]);
        setError('Không tìm thấy phiên đăng nhập.');
        return;
      }

      refreshing ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const result = await repository.getUserAlbums(userId, {
          limit: PAGE_SIZE,
        });
        setAlbums(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch (err) {
        setAlbums([]);
        setNextOffset(null);
        setHasMore(false);
        setError(
          err instanceof Error ? err.message : 'Không thể tải albums của bạn.',
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
      const result = await repository.getUserAlbums(userId, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setAlbums(current => {
        const ids = new Set(current.map(album => album.id));
        return [
          ...current,
          ...result.items.filter(album => !ids.has(album.id)),
        ];
      });
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải thêm albums.',
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
    albums,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
  };
}
