// Movies domain types
// Port từ: client/src/movies/domain/types/

export interface MovieItem {
  id: number | string;
  name: string;
  title?: string;
  cover: string;
  source: string;
  url?: string;
  genre?: string;
  country?: string;
  release?: string;
  quality?: string;
  views?: number | string;
  duration?: string;
  category?: string;
  author?: string;
}

export interface MoviesResponse {
  api_status: number;
  movies: MovieItem[];
}
