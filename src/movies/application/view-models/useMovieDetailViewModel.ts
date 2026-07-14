// English description: Coordinates movie comments and comment submission for the detail screen.
import { useCallback, useEffect, useState } from 'react';
import { createMoviesRepository } from '../../infrastructure/repositories/ApiMoviesRepository';
import type { MovieComment } from '../../domain/types/movies.types';

const repository = createMoviesRepository();

export function useMovieDetailViewModel(movieId: number | string) {
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true);
    setError(null);
    try {
      setComments(await repository.getComments(movieId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được bình luận.');
    } finally {
      setIsLoadingComments(false);
    }
  }, [movieId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const submitComment = useCallback(async (text: string) => {
    const value = text.trim();
    if (!value || isSubmittingComment) return false;
    setIsSubmittingComment(true);
    setError(null);
    try {
      const comment = await repository.addComment(movieId, value);
      if (comment) setComments(previous => [comment, ...previous]);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không gửi được bình luận.');
      return false;
    } finally {
      setIsSubmittingComment(false);
    }
  }, [isSubmittingComment, movieId]);

  return {
    comments,
    isLoadingComments,
    isSubmittingComment,
    error,
    loadComments,
    submitComment,
  };
}
