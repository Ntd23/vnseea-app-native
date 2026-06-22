// Description: Coordinates the Create Movie composer state.
//
// Mirrors the structure of useCreateStoryViewModel: state lives here, the
// screen is a dumb view that reads `phase` and calls the mutators. On submit
// the draft is sent to repository.createMovie which posts multipart to
// /api/create-movie and returns the new movie id.
//
// Phase machine:
//   'idle' | 'submitting' | { type: 'success', movieId, url } | { type: 'error', message }
//
// The screen reads `phase.type` to drive the ActivityIndicator and error
// banner. We keep the draft intact across errors so the user can retry
// without re-typing all 10 fields.

import { useCallback, useMemo, useState } from 'react';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { createMoviesRepository } from '../../infrastructure/repositories/ApiMoviesRepository';
import type {
  CreateMovieInput,
  CreateMovieResponse,
  MovieCountryKey,
  MovieDraft,
  MovieGenreKey,
  MovieQuality,
} from '../../domain/types/movies.types';
import { getCreateMovieCopy } from '../i18n/moviesCopy';

const repository = createMoviesRepository();

// ── Validation limits (mirror phtml/api/v2/endpoints/create-movie.php) ──
const MIN_NAME_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 32;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_RELEASE_YEAR = 1960;
const MAX_RELEASE_YEAR = new Date().getFullYear();
const MIN_DURATION = 10;
const MAX_DURATION = 350;
const MIN_RATING = 1;
const MAX_RATING = 10;
const COVER_MAX_W = 400;
const COVER_MAX_H = 570;

// Flip to true once phtml/api/v2/endpoints/create-movie.php is verified with
// Postman. While false the composer simulates a successful publish so the
// UI flow can be exercised end-to-end without backend access.
const USE_REAL_API = true;

const MOCK_SUBMIT_DELAY_MS = 1000;

export interface CreateMovieResult {
  movieId: number | string;
  url?: string;
}

type Phase =
  | { type: 'idle' }
  | { type: 'submitting' }
  | { type: 'success'; result: CreateMovieResult }
  | { type: 'error'; message: string };

export interface CoverAsset {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface UseCreateMovieOptions {
  /**
   * Called after a successful publish. The parent (MoviesScreen) uses it
   * to refresh the grid so the new movie shows up without a manual pull.
   */
  onCreated?: (result: CreateMovieResult) => void;
}

function isYouTubeUrl(value: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/i.test(value);
}

function isVimeoUrl(value: string): boolean {
  return /^(https?:\/\/)?(www\.)?vimeo\.com/i.test(value);
}

function isValidUrl(value: string): boolean {
  // filter_var has a polyfill in RN, but it returns false for https URLs
  // without TLD sometimes. Fall back to a permissive check.
  if (/^https?:\/\/[^\s]+/i.test(value)) return true;
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function useCreateMovieViewModel(options: UseCreateMovieOptions = {}) {
  const language = useAppLanguage();
  const copy = getCreateMovieCopy(language);
  const { onCreated } = options;

  // 10 scalar fields + cover file + phase machine.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState<MovieGenreKey | ''>('');
  const [country, setCountry] = useState<MovieCountryKey | ''>('');
  const [stars, setStars] = useState('');
  const [producer, setProducer] = useState('');
  const [release, setRelease] = useState<string>(''); // text during typing
  const [duration, setDuration] = useState<string>('');
  const [quality, setQuality] = useState<MovieQuality | ''>('');
  const [rating, setRating] = useState<string>('');
  const [source, setSource] = useState('');
  const [cover, setCoverState] = useState<CoverAsset | null>(null);
  const [phase, setPhase] = useState<Phase>({ type: 'idle' });

  // Track which fields the user has interacted with so we only show errors
  // for fields they actually touched (UX: avoid screaming on first render).
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = useCallback((key: string) => {
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  // ── Mutators ─────────────────────────────────────────────────────────

  const setCover = useCallback((next: CoverAsset | null) => {
    setCoverState(next);
    setPhase({ type: 'idle' });
  }, []);

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setGenre('');
    setCountry('');
    setStars('');
    setProducer('');
    setRelease('');
    setDuration('');
    setQuality('');
    setRating('');
    setSource('');
    setCoverState(null);
    setTouched({});
    setPhase({ type: 'idle' });
  }, []);

  // ── Validation ──────────────────────────────────────────────────────

  const validate = useCallback((): string | null => {
    const trimmedName = name.trim();
    if (trimmedName.length < MIN_NAME_LENGTH) {
      return copy.validationNameMin;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      return copy.validationDescriptionMin;
    }

    if (!genre) {
      return copy.validationGenreRequired;
    }
    if (!country) {
      return copy.validationCountryRequired;
    }
    if (!quality) {
      return copy.validationQualityRequired;
    }

    const releaseNumber = Number(release);
    if (!release.trim() || Number.isNaN(releaseNumber)) {
      return copy.validationReleaseRequired;
    }
    if (releaseNumber < MIN_RELEASE_YEAR || releaseNumber > MAX_RELEASE_YEAR) {
      return copy.validationReleaseRange(MIN_RELEASE_YEAR, MAX_RELEASE_YEAR);
    }

    const durationNumber = Number(duration);
    if (Number.isNaN(durationNumber)) {
      return copy.validationDurationRange(MIN_DURATION, MAX_DURATION);
    }
    if (durationNumber < MIN_DURATION || durationNumber > MAX_DURATION) {
      return copy.validationDurationRange(MIN_DURATION, MAX_DURATION);
    }

    const ratingNumber = Number(rating);
    if (Number.isNaN(ratingNumber)) {
      return copy.validationRatingRange(MIN_RATING, MAX_RATING);
    }
    if (ratingNumber < MIN_RATING || ratingNumber > MAX_RATING) {
      return copy.validationRatingRange(MIN_RATING, MAX_RATING);
    }

    const trimmedSource = source.trim();
    if (!trimmedSource) {
      return copy.validationSourceRequired;
    }
    if (
      !isYouTubeUrl(trimmedSource) &&
      !isVimeoUrl(trimmedSource) &&
      !isValidUrl(trimmedSource)
    ) {
      return copy.validationSourceInvalid;
    }

    if (!cover) {
      return copy.validationCoverRequired;
    }

    return null;
  }, [
    copy,
    name,
    description,
    genre,
    country,
    quality,
    release,
    duration,
    rating,
    source,
    cover,
  ]);

  const canSubmit = useMemo(() => {
    if (phase.type === 'submitting') return false;
    return validate() === null;
  }, [phase.type, validate]);

  // ── Submit ──────────────────────────────────────────────────────────

  const submit = useCallback(async (): Promise<CreateMovieResult | null> => {
    const error = validate();
    if (error) {
      setPhase({ type: 'error', message: error });
      // Mark every field as touched so the inline errors become visible.
      setTouched({
        name: true,
        description: true,
        genre: true,
        country: true,
        quality: true,
        release: true,
        duration: true,
        rating: true,
        source: true,
        cover: true,
      });
      return null;
    }

    if (!genre || !country || !quality) {
      // Defensive — validate() already covers this but TS narrowing needs it.
      return null;
    }

    const draft: CreateMovieInput = {
      name: name.trim(),
      description: description.trim(),
      genre,
      country,
      stars: stars.trim(),
      producer: producer.trim(),
      release: Number(release),
      duration: Number(duration),
      quality,
      rating: Number(rating),
      source: source.trim(),
      cover: cover
        ? {
            uri: cover.uri,
            name: cover.name,
            type: cover.type,
          }
        : null,
    };

    setPhase({ type: 'submitting' });
    try {
      let result: CreateMovieResult;
      if (USE_REAL_API) {
        const response: CreateMovieResponse = await repository.createMovie(
          draft,
        );
        if (response.api_status !== 200) {
          throw new Error(
            response.errors?.error_text ?? copy.errorTitle,
          );
        }
        result = {
          movieId: response.movie_id ?? 0,
          url: response.url,
        };
      } else {
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), MOCK_SUBMIT_DELAY_MS);
        });
        result = {
          movieId: Math.floor(Math.random() * 10000),
          url: `mock://movie/${Date.now()}`,
        };
      }

      setPhase({ type: 'success', result });
      onCreated?.(result);
      return result;
    } catch (caught) {
      const rawMessage =
        caught instanceof Error ? caught.message : copy.errorTitle;
      const lowered = rawMessage.toLowerCase();
      let friendly = rawMessage;
      if (lowered.includes('timeout') || lowered.includes('econnaborted')) {
        friendly = copy.errorNetwork;
      } else if (
        lowered.includes('network error') ||
        lowered.includes('failed to fetch')
      ) {
        friendly = copy.errorNetwork;
      }
      setPhase({ type: 'error', message: friendly });
      return null;
    }
  }, [
    validate,
    genre,
    country,
    quality,
    name,
    description,
    stars,
    producer,
    release,
    duration,
    rating,
    source,
    cover,
    onCreated,
    copy,
  ]);

  // ── Public helpers ──────────────────────────────────────────────────

  const errorFor = useCallback(
    (key: string, value: unknown): string | null => {
      if (!touched[key]) return null;
      // Re-validate but only consider the field the caller is asking about.
      const asString = (input: unknown): string =>
        input === null || input === undefined ? '' : String(input);
      switch (key) {
        case 'name':
          if (asString(value).trim().length < MIN_NAME_LENGTH) {
            return copy.validationNameMin;
          }
          return null;
        case 'description':
          if (asString(value).trim().length < MIN_DESCRIPTION_LENGTH) {
            return copy.validationDescriptionMin;
          }
          return null;
        case 'genre':
          if (!value) return copy.validationGenreRequired;
          return null;
        case 'country':
          if (!value) return copy.validationCountryRequired;
          return null;
        case 'quality':
          if (!value) return copy.validationQualityRequired;
          return null;
        case 'release': {
          const num = Number(value);
          if (!value || Number.isNaN(num)) {
            return copy.validationReleaseRequired;
          }
          if (num < MIN_RELEASE_YEAR || num > MAX_RELEASE_YEAR) {
            return copy.validationReleaseRange(
              MIN_RELEASE_YEAR,
              MAX_RELEASE_YEAR,
            );
          }
          return null;
        }
        case 'duration': {
          const num = Number(value);
          if (Number.isNaN(num)) {
            return copy.validationDurationRange(MIN_DURATION, MAX_DURATION);
          }
          if (num < MIN_DURATION || num > MAX_DURATION) {
            return copy.validationDurationRange(MIN_DURATION, MAX_DURATION);
          }
          return null;
        }
        case 'rating': {
          const num = Number(value);
          if (Number.isNaN(num)) {
            return copy.validationRatingRange(MIN_RATING, MAX_RATING);
          }
          if (num < MIN_RATING || num > MAX_RATING) {
            return copy.validationRatingRange(MIN_RATING, MAX_RATING);
          }
          return null;
        }
        case 'source': {
          const trimmed = asString(value).trim();
          if (!trimmed) return copy.validationSourceRequired;
          if (
            !isYouTubeUrl(trimmed) &&
            !isVimeoUrl(trimmed) &&
            !isValidUrl(trimmed)
          ) {
            return copy.validationSourceInvalid;
          }
          return null;
        }
        case 'cover':
          if (!value) return copy.validationCoverRequired;
          return null;
        default:
          return null;
      }
    },
    [touched, copy],
  );

  const coverError = useMemo<string | null>(() => {
    if (!touched.cover) return null;
    if (!cover) return copy.validationCoverRequired;
    if (
      typeof cover.width === 'number' &&
      typeof cover.height === 'number' &&
      (cover.width > COVER_MAX_W || cover.height > COVER_MAX_H)
    ) {
      return copy.validationCoverTooLarge(COVER_MAX_W, COVER_MAX_H);
    }
    return null;
  }, [touched.cover, cover, copy]);

  const sourceKind = useMemo<'youtube' | 'vimeo' | 'url' | null>(() => {
    const trimmed = source.trim();
    if (!trimmed) return null;
    if (isYouTubeUrl(trimmed)) return 'youtube';
    if (isVimeoUrl(trimmed)) return 'vimeo';
    if (isValidUrl(trimmed)) return 'url';
    return null;
  }, [source]);

  const isSubmitting = phase.type === 'submitting';
  const error = phase.type === 'error' ? phase.message : null;

  return {
    // State
    name,
    description,
    genre,
    country,
    stars,
    producer,
    release,
    duration,
    quality,
    rating,
    source,
    cover,
    phase,
    isSubmitting,
    error,
    canSubmit,
    sourceKind,
    // Mutators (call markTouched in the screen on each onBlur / onChange)
    setName,
    setDescription,
    setGenre,
    setCountry,
    setStars,
    setProducer,
    setRelease,
    setDuration,
    setQuality,
    setRating,
    setSource,
    setCover,
    markTouched,
    // Per-field error helper
    errorFor,
    coverError,
    // Localized action labels (so the screen can swap "Đăng phim" / "Đang đăng...")
    submitButton: copy.submitButton,
    submittingButton: copy.submittingButton,
    discardConfirmTitle: copy.discardConfirmTitle,
    discardConfirmMessage: copy.discardConfirmMessage,
    discardConfirmAction: copy.discardConfirmAction,
    discardCancel: copy.discardCancel,
    // Lifecycle
    submit,
    reset,
    // Constants for the UI (so the screen doesn't hardcode the same numbers)
    minNameLength: MIN_NAME_LENGTH,
    minDescriptionLength: MIN_DESCRIPTION_LENGTH,
    maxDescriptionLength: MAX_DESCRIPTION_LENGTH,
    minReleaseYear: MIN_RELEASE_YEAR,
    maxReleaseYear: MAX_RELEASE_YEAR,
    minDuration: MIN_DURATION,
    maxDuration: MAX_DURATION,
    minRating: MIN_RATING,
    maxRating: MAX_RATING,
    coverMaxW: COVER_MAX_W,
    coverMaxH: COVER_MAX_H,
  };
}

export type UseCreateMovieViewModel = ReturnType<typeof useCreateMovieViewModel>;

// Re-export a few types so the screen only imports from the ViewModel module.
export type { MovieDraft };
