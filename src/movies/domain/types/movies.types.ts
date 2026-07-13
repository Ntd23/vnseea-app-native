// English description: Defines movie listing and creation data contracts.

// --- Existing read-side types (kept for backward compatibility) -------------

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
  rating?: number | string;
  duration?: string;
  category?: string;
  author?: string;
  description?: string;
  stars?: string;
  producer?: string;
  iframe?: string;
  video?: string;
}

export interface MovieComment {
  id: number | string;
  text: string;
  time?: number | string;
  userName: string;
  userAvatar?: string;
}

export interface MoviesResponse {
  api_status: number;
  movies: MovieItem[];
}

export type MovieFilterOption = {
  value: string;
  label: string;
};

export type MovieFilterMetadata = {
  genres: MovieFilterOption[];
  countries: MovieFilterOption[];
};

// --- Create-side constants (mirrored from phtml/assets/includes/data.php) --

// Mirrors $wo['film-genres'] in phtml/assets/includes/data.php (line 201-220).
export const MOVIE_GENRE_KEYS = [
  'action',
  'comedy',
  'drama',
  'horror',
  'mythological',
  'war',
  'adventure',
  'family',
  'sport',
  'animation',
  'crime',
  'fantasy',
  'musical',
  'romance',
  'thriller',
  'history',
  'documentary',
  'tvshow',
] as const;
export type MovieGenreKey = (typeof MOVIE_GENRE_KEYS)[number];

// Mirrors the quality <select> in phtml/admin-panel/pages/edit-movie/content.phtml.
export const MOVIE_QUALITY_KEYS = [
  'cam',
  'ts',
  'vsh',
  'wp',
  'scr',
  'dvds',
  'ldr',
  'tv',
  'sat',
  'dvb',
  'dtv',
  'dvd',
  'hdr',
  'web-dl',
  'hd-tv',
  'hd',
] as const;
export type MovieQuality = (typeof MOVIE_QUALITY_KEYS)[number];

// Mirrors $wo['countries'] in phtml/assets/includes/data.php (line 190-200).
// Backend may expose more countries at runtime; use string fallback in the picker.
export const MOVIE_COUNTRY_KEYS = [
  'united-states',
  'china',
  'india',
  'iran',
  'japan',
  'turkey',
  'russia',
  'france',
  'united-kingdom',
  'vietnam',
] as const;
export type MovieCountryKey = (typeof MOVIE_COUNTRY_KEYS)[number];

// --- Create-side payload types --------------------------------------------

// Mirrors the field set accepted by phtml/api/v2/endpoints/create-movie.php.
export interface MovieDraft {
  name: string;
  description: string;
  genre: MovieGenreKey;
  country: MovieCountryKey;
  stars: string;
  producer: string;
  release: number; // year (1960 -> currentYear)
  duration: number; // minutes (10 - 350)
  quality: MovieQuality;
  rating: number; // 1 - 10
  source: string; // YouTube / Vimeo / direct URL
  cover?: { uri: string; name: string; type: string } | null;
}

export type CreateMovieInput = MovieDraft;

export interface CreateMovieResponse {
  api_status: number;
  movie_id?: number;
  url?: string;
  errors?: {
    error_id: number;
    error_text: string;
  };
}
