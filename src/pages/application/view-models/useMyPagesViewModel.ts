import { useCallback, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createPagesRepository } from '../../infrastructure/repositories/ApiPagesRepository';
import type { PagesFilter, PagesItem } from '../../domain/types/pages.types';

const PAGE_LIMIT = 20;
const repository = createPagesRepository();

async function fetchPages(filter: PagesFilter, offset?: string | null) {
  if (filter === 'suggested') {
    return repository.getSuggestedPages({ limit: PAGE_LIMIT, offset });
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

export function useMyPagesViewModel(
  initialFilter: PagesFilter = 'mine',
) {
  const [activeFilter, setActiveFilterState] =
    useState<PagesFilter>(initialFilter);
  const [pages, setPages] = useState<PagesItem[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
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
    loadFirstPage(false).catch(() => undefined);
  }, [loadFirstPage]);

  const toggleLikePage = useCallback(
    async (pageId: string | number) => {
      if (isActionLoading) return;

      const pageKey = String(pageId);
      const target = pages.find(
        page => String(page.pageId || page.id) === pageKey,
      );
      if (!target) return;

      const previousPages = pages;
      const nextLiked = !target.isLiked;
      setPages(current =>
        current.map(page =>
          String(page.pageId || page.id) === pageKey
            ? {
                ...page,
                isLiked: nextLiked,
                likes: Math.max(0, (page.likes ?? 0) + (nextLiked ? 1 : -1)),
              }
            : page,
        ),
      );

      setIsActionLoading(true);
      try {
        const result = await repository.toggleLikePage(pageId);
        let isFollowing = target.isFollowing;

        // A page that is liked from a recommendation is also followed, so
        // the action is useful everywhere the page is surfaced.
        if (result.isLiked && !target.isFollowing) {
          try {
            const followResult = await repository.toggleFollowPage(pageId);
            isFollowing = followResult.isFollowing;
          } catch {
            // Keep the successful like even if following is unavailable.
          }
        }

        setPages(current =>
          current.map(page =>
            String(page.pageId || page.id) === pageKey
              ? {
                  ...page,
                  isLiked: result.isLiked,
                  isFollowing,
                  likes: Math.max(
                    0,
                    (target.likes ?? page.likes ?? 0) +
                      (result.isLiked === target.isLiked
                        ? 0
                        : result.isLiked
                          ? 1
                          : -1),
                  ),
                }
              : page,
          ),
        );
      } catch (err) {
        setPages(previousPages);
        setError(
          err instanceof Error ? err.message : 'Không thể thích trang.',
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [isActionLoading, pages],
  );

  const toggleFollowPage = useCallback(
    async (pageId: string | number) => {
      if (isActionLoading) return;

      const pageKey = String(pageId);
      const target = pages.find(
        page => String(page.pageId || page.id) === pageKey,
      );
      if (!target) return;

      const previousPages = pages;
      const nextFollowing = !target.isFollowing;
      setPages(current =>
        current.map(page =>
          String(page.pageId || page.id) === pageKey
            ? {
                ...page,
                isFollowing: nextFollowing,
                followersCount: Math.max(
                  0,
                  (page.followersCount ?? 0) + (nextFollowing ? 1 : -1),
                ),
              }
            : page,
        ),
      );

      setIsActionLoading(true);
      try {
        const result = await repository.toggleFollowPage(pageId);
        setPages(current =>
          current.map(page =>
            String(page.pageId || page.id) === pageKey
              ? { ...page, isFollowing: result.isFollowing }
              : page,
          ),
        );
      } catch (err) {
        setPages(previousPages);
        setError(
          err instanceof Error ? err.message : 'Không thể theo dõi trang.',
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [isActionLoading, pages],
  );

  return {
    activeFilter,
    pages,
    isLoading,
    isRefreshing,
    isLoadingMore,
    isActionLoading,
    error,
    hasMore,
    setActiveFilter,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
    toggleLikePage,
    toggleFollowPage,
  };
}
