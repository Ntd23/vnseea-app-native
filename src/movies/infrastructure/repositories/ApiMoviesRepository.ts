// English description: Implements movie listing, creation, and comment API operations.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { MoviesRepository } from '../../domain/repositories/MoviesRepository';
import type {
  CreateMovieInput,
  CreateMovieResponse,
  MovieItem,
  MovieComment,
  MoviesResponse,
} from '../../domain/types/movies.types';

type MovieCommentsResponse = {
  api_status: number | string;
  data?: Array<Record<string, unknown>>;
  errors?: { error_text?: string };
};

function mapMovieComment(raw: Record<string, unknown>): MovieComment {
  const user = raw.user_data && typeof raw.user_data === 'object'
    ? raw.user_data as Record<string, unknown>
    : {};
  return {
    id: String(raw.id ?? ''),
    text: String(raw.Orginaltext ?? raw.text ?? ''),
    time: raw.time as number | string | undefined,
    userName: String(user.name ?? user.username ?? ''),
    userAvatar: user.avatar ? String(user.avatar) : undefined,
  };
}

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

    async createMovie(input: CreateMovieInput): Promise<CreateMovieResponse> {
      // Build multipart payload. apiBridge.multipart handles file objects that
      // look like { uri, name, type } and forwards access_token + server_key
      // for the WoWonder v2 API. See apiBridge.ts:29-102.
      const formData: Record<string, unknown> = {
        name: input.name,
        description: input.description,
        genre: input.genre,
        country: input.country,
        stars: input.stars,
        producer: input.producer,
        release: input.release,
        duration: input.duration,
        quality: input.quality,
        rating: input.rating,
        source: input.source,
      };

      if (input.cover) {
        formData.cover = input.cover;
      }

      const response = await apiBridge.multipart<CreateMovieResponse>(
        apiRoutes.movies.create,
        formData,
      );

      if (response.api_status !== 200) {
        const errorText =
          response.errors?.error_text ?? 'Could not create movie';
        throw new Error(errorText);
      }

      return response;
    },

    async getComments(movieId): Promise<MovieComment[]> {
      const response = await apiBridge.post<MovieCommentsResponse>(
        apiRoutes.movies.comments,
        { type: 'get_comments', movie_id: movieId, limit: 50 },
      );
      return response.api_status === 200 || response.api_status === '200'
        ? (response.data ?? []).map(mapMovieComment)
        : [];
    },

    async addComment(movieId, text): Promise<MovieComment | null> {
      const response = await apiBridge.post<MovieCommentsResponse>(
        apiRoutes.movies.comments,
        { type: 'add_comment', movie_id: movieId, text },
      );
      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(response.errors?.error_text ?? 'Không thể gửi bình luận.');
      }
      const comment = response.data?.[0];
      return comment ? mapMovieComment(comment) : null;
    },
  };
}
