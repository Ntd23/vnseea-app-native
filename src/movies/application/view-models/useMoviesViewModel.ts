// English description: Loads API-backed movies with genre and country filters.

import { useState, useCallback, useEffect } from 'react';
import { createMoviesRepository } from '../../infrastructure/repositories/ApiMoviesRepository';
import type { MovieItem } from '../../domain/types/movies.types';

const repository = createMoviesRepository();

export function useMoviesViewModel() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string>('Tất cả');
  const [activeCountry, setActiveCountry] = useState<string>('Tất cả');

  const loadMovies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const genreParam = activeGenre === 'Tất cả' ? undefined : activeGenre;
      const countryParam = activeCountry === 'Tất cả' ? undefined : activeCountry;
      const data = await repository.getMovies({
        limit: 26,
        genre: genreParam,
        country: countryParam,
      });
      setMovies(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Lỗi khi tải phim');
    } finally {
      setIsLoading(false);
    }
  }, [activeCountry, activeGenre]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  return {
    movies,
    isLoading,
    error,
    activeGenre,
    setActiveGenre,
    activeCountry,
    setActiveCountry,
    reload: loadMovies,
  };
}
