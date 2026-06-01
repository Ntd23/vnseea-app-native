// Description: Loads one real WoWonder article for the article detail screen.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';
import type { BlogsItem } from '../../domain/types/blogs.types';

export function useBlogDetailViewModel(blogId: string) {
  const repository = useMemo(() => createBlogsRepository(), []);
  const [article, setArticle] = useState<BlogsItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setArticle(await repository.getArticleById(blogId));
    } catch (err) {
      setArticle(null);
      setError(
        err instanceof Error ? err.message : 'Không thể tải bài viết.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [blogId, repository]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    article,
    isLoading,
    error,
    retry: load,
  };
}
