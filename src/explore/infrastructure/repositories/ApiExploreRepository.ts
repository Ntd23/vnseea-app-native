// Description: Implements the explore repository using the shared backend API.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import type {
  ExploreRepository,
  FetchTrendingHashtagsOptions,
} from '../../domain/repositories/ExploreRepository';
import type {
  TrendingHashtag,
  TrendingHashtagPage,
} from '../../domain/types/explore.types';

// ────────────────────────────────────────────────────────────────────────
// Wire format
// ────────────────────────────────────────────────────────────────────────
//
// `POST /api/hashtag-suggestions` (PHP at phtml/api/v2/endpoints/hashtag-suggestions.php):
//   request  : { query?: string, limit?: number }   — query empty → trending set
//   response : { api_status: 200, hashtags: [
//                 { id, tag, url, trend_use_num, last_trend_time }, …
//               ] }
//
// The endpoint is PUBLIC — it does NOT require an `access_token`. No
// sessionStorage guard needed at the call site.

type HashtagSuggestionsResponse = {
  api_status: number | string;
  hashtags?: Array<Record<string, unknown>>;
};

// ────────────────────────────────────────────────────────────────────────
// Mapping helpers — turn raw WoWonder JSON into clean domain objects.
// (Pattern mirrored from ApiReelsRepository.ts:59-88.)
// ────────────────────────────────────────────────────────────────────────

function readString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function mapHashtag(raw: Record<string, unknown>): TrendingHashtag | null {
  // WoWonder's PHP returns `tag` already without the leading `#` (see
  // `hashtag-suggestions.php` line 9: `str_replace('#', '', …)`). We
  // defensively strip it again so consumers can always assume no `#`.
  const tag = readString(raw, 'tag', 'label').replace(/^#+/, '').trim();
  if (!tag) {
    return null;
  }

  // `last_trend_time` from PHP is either an ISO-ish string or an empty
  // string. We normalize empty → null so the UI can hide that text line.
  const rawTime = readString(raw, 'last_trend_time');
  const lastTrendTime = rawTime.length > 0 ? rawTime : null;

  return {
    id: readString(raw, 'id') || tag,
    tag,
    url: readString(raw, 'url'),
    useCount: readNumber(raw, 'trend_use_num', 'use_count'),
    lastTrendTime,
  };
}

export function createExploreRepository(): ExploreRepository {
  return {
    async getTrendingHashtags(
      options: FetchTrendingHashtagsOptions = {},
    ): Promise<TrendingHashtagPage> {
      // Backend clamps to [1, 20]. Default 8 mirrors the PHP default so
      // we don't ask for a payload size we won't get anyway.
      const limit = options.limit ?? 8;

      const response = await backendApi.post<HashtagSuggestionsResponse>(
        apiRoutes.reels.hashtagSuggestions,
        { limit },
      );

      const items = (response.hashtags ?? [])
        .map(mapHashtag)
        .filter((item): item is TrendingHashtag => Boolean(item));

      return { items };
    },
  };
}
