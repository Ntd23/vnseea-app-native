// Movies API Repository (Infrastructure)
// Port từ: client/src/movies/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { MoviesRepository } from '../../domain/repositories/MoviesRepository';
import type { MovieItem, MoviesResponse } from '../../domain/types/movies.types';

export function createMoviesRepository(): MoviesRepository {
  return {
    async getMovies(options = {}) {
      const { limit = 26, offset, genre, country } = options;

      const params: Record<string, string | number> = { limit };
      if (offset) params.offset = offset;
      if (genre) params.genre = genre;
      if (country) params.country = country;

      const response = await apiBridge.post<MoviesResponse>(
        apiRoutes.movies.get,
        params,
      );

      return response.movies ?? [];
    },
  };
}
