// English description: Loads API-backed movies with genre and country filters.

import { useState, useCallback, useEffect } from 'react';
import { createMoviesRepository } from '../../infrastructure/repositories/ApiMoviesRepository';
import type { MovieFilterOption, MovieItem } from '../../domain/types/movies.types';

const repository = createMoviesRepository();

export function useMoviesViewModel() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState('');
  const [activeCountry, setActiveCountry] = useState('');
  const [genreOptions, setGenreOptions] = useState<MovieFilterOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<MovieFilterOption[]>([]);

  const loadMovies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getMovies({
        limit: 26,
        genre: activeGenre || undefined,
        country: activeCountry || undefined,
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

  useEffect(() => {
    let active = true;
    repository
      .getFilterMetadata()
      .then(metadata => {
        if (!active) return;
        setGenreOptions(metadata.genres);
        setCountryOptions(metadata.countries);
      })
      .catch(() => {
        if (!active) return;
        setGenreOptions([]);
        setCountryOptions([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    movies,
    isLoading,
    error,
    activeGenre,
    setActiveGenre,
    activeCountry,
    setActiveCountry,
    genreOptions,
    countryOptions,
    reload: loadMovies,
  };
}
