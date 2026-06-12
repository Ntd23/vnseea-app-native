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

type HashtagSuggestionsResponse = {
  api_status: number | string;
  hashtags?: unknown;
};

type GeneralDataResponse = {
  api_status?: number | string;
  trending_hashtag?: unknown;
  trending_hashtags?: unknown;
  hashtags?: unknown;
  data?: {
    trending_hashtag?: unknown;
    trending_hashtags?: unknown;
    hashtags?: unknown;
  };
};

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

function mapHashtag(
  rawInput: Record<string, unknown> | string,
): TrendingHashtag | null {
  const raw =
    typeof rawInput === 'string'
      ? ({ tag: rawInput } as Record<string, unknown>)
      : rawInput;

  const tag = readString(raw, 'tag', 'label', 'hashtag', 'hash', 'name')
    .replace(/^#+/, '')
    .trim();

  if (!tag) return null;

  const rawTime = readString(raw, 'last_trend_time', 'time', 'created_at');
  const lastTrendTime = rawTime.length > 0 ? rawTime : null;

  return {
    id: readString(raw, 'id', 'hash_id', 'hashtag_id') || tag,
    tag,
    url: readString(raw, 'url'),
    useCount: readNumber(
      raw,
      'trend_use_num',
      'use_count',
      'post_count',
      'posts_count',
      'posts',
      'count',
      'total',
    ),
    lastTrendTime,
  };
}

function toRawHashtagArray(input: unknown): Array<Record<string, unknown> | string> {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.filter(
      (item): item is Record<string, unknown> | string =>
        typeof item === 'string' ||
        (typeof item === 'object' && item !== null && !Array.isArray(item)),
    );
  }

  if (typeof input === 'string') return [input];

  if (typeof input === 'object') {
    const raw = input as Record<string, unknown>;
    if (
      readString(raw, 'tag', 'label', 'hashtag', 'hash', 'name').length > 0
    ) {
      return [raw];
    }

    return Object.values(raw).filter(
      (item): item is Record<string, unknown> | string =>
        typeof item === 'string' ||
        (typeof item === 'object' && item !== null && !Array.isArray(item)),
    );
  }

  return [];
}

function extractGeneralHashtags(
  response: GeneralDataResponse,
): Array<Record<string, unknown> | string> {
  return [
    response.trending_hashtag,
    response.trending_hashtags,
    response.hashtags,
    response.data?.trending_hashtag,
    response.data?.trending_hashtags,
    response.data?.hashtags,
  ].flatMap(toRawHashtagArray);
}

function dedupeHashtags(items: TrendingHashtag[]): TrendingHashtag[] {
  const byTag = new Map<string, TrendingHashtag>();

  items.forEach(item => {
    const key = item.tag.toLowerCase();
    const existing = byTag.get(key);
    if (!existing || item.useCount > existing.useCount) {
      byTag.set(key, item);
    }
  });

  return Array.from(byTag.values());
}

export function createExploreRepository(): ExploreRepository {
  return {
    async getTrendingHashtags(
      options: FetchTrendingHashtagsOptions = {},
    ): Promise<TrendingHashtagPage> {
      const limit = options.limit ?? 8;

      const generalResponse = await backendApi.post<GeneralDataResponse>(
        apiRoutes.feed.generalData,
        { fetch: 'trending_hashtag' },
      );

      const generalItems = extractGeneralHashtags(generalResponse)
        .map(mapHashtag)
        .filter((item): item is TrendingHashtag => Boolean(item));

      if (generalItems.length >= limit) {
        return { items: dedupeHashtags(generalItems).slice(0, limit) };
      }

      try {
        const fallbackResponse =
          await backendApi.post<HashtagSuggestionsResponse>(
            apiRoutes.reels.hashtagSuggestions,
            { limit },
          );

        const fallbackItems = toRawHashtagArray(fallbackResponse.hashtags)
          .map(mapHashtag)
          .filter((item): item is TrendingHashtag => Boolean(item));

        return {
          items: dedupeHashtags([...generalItems, ...fallbackItems]).slice(
            0,
            limit,
          ),
        };
      } catch {
        return { items: dedupeHashtags(generalItems).slice(0, limit) };
      }
    },
  };
}
