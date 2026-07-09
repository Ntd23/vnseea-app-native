// Description: Manages real WoWonder article list loading with search and filter.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';
import type { BlogCategoryOption, BlogsItem } from '../../domain/types/blogs.types';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';

const PAGE_SIZE = 20;

export function useBlogsViewModel() {
  const repository = useMemo(() => createBlogsRepository(), []);
  const { user } = useCurrentUserViewModel();
  const [articles, setArticles] = useState<BlogsItem[]>([]);
  const [categories, setCategories] = useState<BlogCategoryOption[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('latest');
  const [myPostsOnly, setMyPostsOnly] = useState(false);

  const loadFirstPage = useCallback(
    async (refreshing = false) => {
      console.log('[useBlogsViewModel] loadFirstPage called with:', { refreshing, selectedCategory });
      refreshing ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const result = await repository.getArticles({
          limit: PAGE_SIZE,
          category: selectedCategory,
        });
        console.log('[useBlogsViewModel] Articles loaded:', result.items.length);
        setArticles(result.items);
        if (result.categories && result.categories.length > 0) {
          setCategories(result.categories);
        }
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch (err) {
        console.log('[useBlogsViewModel] Error loading articles:', err);
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
    [repository, selectedCategory],
  );

  const loadCategories = useCallback(async () => {
    const result = await repository.getCategories();
    setCategories(result);
  }, [repository]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

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
        category: selectedCategory,
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
    selectedCategory,
  ]);

  const retry = useCallback(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  // Client-side search filtering since backend doesn't have search endpoint
  const filteredArticles = useMemo(() => {
    console.log('[useBlogsViewModel] filteredArticles called, isLoading:', isLoading, 'articles.length:', articles.length);
    let result = articles;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        article =>
          article.title.toLowerCase().includes(query) ||
          article.description?.toLowerCase().includes(query) ||
          article.author.name.toLowerCase().includes(query),
      );
    }

    // Filter by my posts only
    if (myPostsOnly && user?.userId) {
      console.log('[useBlogsViewModel] Filtering by my posts only, userId:', user.userId);
      result = result.filter(article => article.author.id === user.userId);
      console.log('[useBlogsViewModel] Articles after my posts filter:', result.length);
    }

    // Sort by
    if (sortBy === 'popular') {
      result = [...result].sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'most_viewed') {
      result = [...result].sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'quick_read') {
      result = [...result].sort((a, b) => (a.content?.length || 0) - (b.content?.length || 0));
    }
    // 'latest' is default, no sorting needed as API returns in chronological order

    console.log('[useBlogsViewModel] Final filteredArticles.length:', result.length);
    return result;
  }, [articles, searchQuery, sortBy, myPostsOnly, isLoading, user]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
  }, []);

  const handleMyPostsOnlyChange = useCallback((value: boolean) => {
    setMyPostsOnly(value);
  }, []);

  return {
    categories,
    articles: filteredArticles,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    searchQuery,
    selectedCategory,
    sortBy,
    myPostsOnly,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
    handleSearchChange,
    handleCategoryChange,
    handleSortChange,
    handleMyPostsOnlyChange,
  };
}
