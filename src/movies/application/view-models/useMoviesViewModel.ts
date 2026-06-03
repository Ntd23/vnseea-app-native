// Movies - useMoviesViewModel ViewModel
// Port từ: client/src/movies/application/view-models/

import { useState, useCallback, useEffect } from 'react';
import { createMoviesRepository } from '../../infrastructure/repositories/ApiMoviesRepository';
import type { MovieItem } from '../../domain/types/movies.types';

const repository = createMoviesRepository();

export function useMoviesViewModel() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string>('Tất cả');

  const loadMovies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const genreParam = activeGenre === 'Tất cả' ? undefined : activeGenre;
      const data = await repository.getMovies({ limit: 26, genre: genreParam });
      setMovies(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Lỗi khi tải phim');
    } finally {
      setIsLoading(false);
    }
  }, [activeGenre]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  return {
    movies,
    isLoading,
    error,
    activeGenre,
    setActiveGenre,
    reload: loadMovies,
  };
}
