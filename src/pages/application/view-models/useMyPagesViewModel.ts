import { useCallback, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createPagesRepository } from '../../infrastructure/repositories/ApiPagesRepository';
import type { PagesFilter, PagesItem } from '../../domain/types/pages.types';

const PAGE_LIMIT = 20;
const repository = createPagesRepository();

async function fetchPages(filter: PagesFilter, offset?: string | null) {
  if (filter === 'suggested') {
    return repository.getSuggestedPages({ limit: PAGE_LIMIT });
  }

  if (filter === 'liked') {
    const userId = sessionStorage.getSession()?.userId;
    if (!userId) {
      throw new Error('Không tìm thấy tài khoản hiện tại để tải trang đã yêu thích.');
    }

    return repository.getLikedPages(userId, {
      limit: PAGE_LIMIT,
      offset,
    });
  }

  return repository.getMyPages({
    limit: PAGE_LIMIT,
    offset,
  });
}

export function useMyPagesViewModel() {
  const [activeFilter, setActiveFilterState] = useState<PagesFilter>('mine');
  const [pages, setPages] = useState<PagesItem[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetchPages(activeFilter);
        setPages(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách trang. Vui lòng thử lại.';
        setError(message);
        setPages([]);
        setNextOffset(null);
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeFilter],
  );

  const setActiveFilter = useCallback(
    (filter: PagesFilter) => {
      if (filter === activeFilter) {
        return;
      }

      setActiveFilterState(filter);
      setPages([]);
      setNextOffset(null);
      setHasMore(true);
      setError(null);
    },
    [activeFilter],
  );

  const refresh = useCallback(() => loadFirstPage(true), [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextOffset || isLoading || isRefreshing || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await fetchPages(activeFilter, nextOffset);

      setPages(current => {
        const existingIds = new Set(current.map(page => String(page.id)));
        const nextItems = result.items.filter(
          page => !existingIds.has(String(page.id)),
        );
        return [...current, ...nextItems];
      });
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể tải thêm trang. Vui lòng thử lại.';
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    activeFilter,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    nextOffset,
  ]);

  const retry = useCallback(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  return {
    activeFilter,
    pages,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    setActiveFilter,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
  };
}
