// Description: Loads a compact suggested-pages rail for the home feed.
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';
import { createPagesRepository } from '../../infrastructure/repositories/ApiPagesRepository';
import type { PagesItem } from '../../domain/types/pages.types';

const repository = createPagesRepository();
const FEED_PAGES_LIMIT = 10;

type InteractionTask = ReturnType<typeof InteractionManager.runAfterInteractions>;

let pendingPagesCacheTask: InteractionTask | null = null;

function cachePagesAfterInteractions(pages: PagesItem[]) {
  const snapshot = pages.slice(0, FEED_PAGES_LIMIT);
  pendingPagesCacheTask?.cancel();
  pendingPagesCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedPages(snapshot);
    pendingPagesCacheTask = null;
  });
}

type UsePagesOnFeedViewModelOptions = {
  autoLoad?: boolean;
};

export function usePagesOnFeedViewModel(
  options: UsePagesOnFeedViewModelOptions = {},
) {
  const { autoLoad = true } = options;
  const [pages, setPages] = useState<PagesItem[]>(() => {
    return autoLoad ? feedCacheStorage.getCachedPages() : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadPages = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await repository.getSuggestedPages({
        limit: FEED_PAGES_LIMIT,
      });
      setPages(result.items);
      cachePagesAfterInteractions(result.items);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Khong tai duoc danh sach trang goi y.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    reloadPages();
  }, [autoLoad, reloadPages]);

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
        if (result.isLiked && !target.isFollowing) {
          try {
            const followResult = await repository.toggleFollowPage(pageId);
            isFollowing = followResult.isFollowing;
          } catch {
            // Preserve the successful like if follow is temporarily unavailable.
          }
        }

        const updatedPages = pages.map(page =>
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
        );
        setPages(updatedPages);
        cachePagesAfterInteractions(updatedPages);
      } catch (caught) {
        setPages(previousPages);
        setError(
          caught instanceof Error ? caught.message : 'Khong the thich trang.',
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
        const updatedPages = pages.map(page =>
          String(page.pageId || page.id) === pageKey
            ? { ...page, isFollowing: result.isFollowing }
            : page,
        );
        setPages(updatedPages);
        cachePagesAfterInteractions(updatedPages);
      } catch (caught) {
        setPages(previousPages);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Khong the theo doi trang.',
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [isActionLoading, pages],
  );

  return {
    pages,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    error,
    isActionLoading,
    reloadPages,
    toggleLikePage,
    toggleFollowPage,
  };
}
