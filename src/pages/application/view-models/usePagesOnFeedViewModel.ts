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
    return feedCacheStorage.getCachedPages();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  return {
    pages,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    error,
    reloadPages,
  };
}
