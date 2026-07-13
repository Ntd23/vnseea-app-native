// English description: Declares movie listing, creation, and comment operations.

import type {
  CreateMovieInput,
  CreateMovieResponse,
  MovieItem,
  MovieComment,
} from '../types/movies.types';

export interface MoviesRepository {
  getMovies(options?: {
    limit?: number;
    offset?: number;
    genre?: string;
    country?: string;
  }): Promise<MovieItem[]>;

  createMovie(input: CreateMovieInput): Promise<CreateMovieResponse>;
  getComments(movieId: number | string): Promise<MovieComment[]>;
  addComment(movieId: number | string, text: string): Promise<MovieComment | null>;
}
