// Description: Manages real WoWonder article list loading and cursor pagination.
import { useCallback, useMemo, useState } from 'react';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';
import type { BlogsItem } from '../../domain/types/blogs.types';

const PAGE_SIZE = 20;

export function useBlogsViewModel() {
  const repository = useMemo(() => createBlogsRepository(), []);
  const [articles, setArticles] = useState<BlogsItem[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(
    async (refreshing = false) => {
      refreshing ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const result = await repository.getArticles({ limit: PAGE_SIZE });
        setArticles(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch (err) {
        setArticles([]);
        setNextOffset(null);
        setHasMore(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách bài viết.',
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
    if (!hasMore || !nextOffset || isLoading || isRefreshing || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await repository.getArticles({
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setArticles(current => {
        const ids = new Set(current.map(article => article.id));
        return [
          ...current,
          ...result.items.filter(article => !ids.has(article.id)),
        ];
      });
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải thêm bài viết.',
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
    articles,
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
