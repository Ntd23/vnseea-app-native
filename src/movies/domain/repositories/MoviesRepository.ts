// Movies Repository Interface
// Port từ: client/src/movies/domain/repositories/

import type { MovieItem } from '../types/movies.types';

export interface MoviesRepository {
  getMovies(options?: {
    limit?: number;
    offset?: number;
    genre?: string;
    country?: string;
  }): Promise<MovieItem[]>;
}
