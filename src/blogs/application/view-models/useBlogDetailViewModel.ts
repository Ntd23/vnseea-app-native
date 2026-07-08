// Description: Loads one real WoWonder article, comments, and sidebar data for the article detail screen.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';
import type { BlogCategoryOption, BlogComment, BlogsItem } from '../../domain/types/blogs.types';

export function useBlogDetailViewModel(blogId: string) {
  const repository = useMemo(() => createBlogsRepository(), []);
  const [article, setArticle] = useState<BlogsItem | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<BlogsItem[]>([]);
  const [popularArticles, setPopularArticles] = useState<BlogsItem[]>([]);
  const [categories, setCategories] = useState<BlogCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    console.log('[useBlogDetailViewModel] Loading article:', blogId);
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.getArticleById(blogId);
      setArticle(result);

      const [commentsResult, categoriesResult, articlesResult] = await Promise.all([
        repository.getBlogComments(blogId),
        repository.getCategories(),
        repository.getArticles({ limit: 12 }),
      ]);

      const otherArticles = articlesResult.items.filter(item => item.id !== result.id);
      const sameCategory = otherArticles.filter(item => item.categoryId === result.categoryId);

      setComments(commentsResult);
      setCategories(categoriesResult);
      setRelatedArticles((sameCategory.length > 0 ? sameCategory : otherArticles).slice(0, 3));
      setPopularArticles(
        otherArticles
          .slice()
          .sort((left, right) => (right.views || 0) - (left.views || 0))
          .slice(0, 5),
      );
    } catch (err) {
      console.log('[useBlogDetailViewModel] Error loading article:', err);
      setArticle(null);
      setComments([]);
      setRelatedArticles([]);
      setPopularArticles([]);
      setError(
        err instanceof Error ? err.message : 'Kh\u00f4ng th\u1ec3 t\u1ea3i b\u00e0i vi\u1ebft.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [blogId, repository]);

  const submitComment = useCallback(
    async (text: string) => {
      const normalizedText = text.trim();

      if (!normalizedText || isSubmittingComment) {
        return false;
      }

      setIsSubmittingComment(true);
      try {
        const comment = await repository.addBlogComment(blogId, normalizedText);
        setComments(current => [comment, ...current]);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kh\u00f4ng th\u1ec3 g\u1eedi b\u00ecnh lu\u1eadn.');
        return false;
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [blogId, isSubmittingComment, repository],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    article,
    comments,
    relatedArticles,
    popularArticles,
    categories,
    isLoading,
    isSubmittingComment,
    error,
    retry: load,
    submitComment,
  };
}
