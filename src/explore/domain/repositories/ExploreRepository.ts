// Description: Repository interface for the explore bounded context (trending hashtags).
import type { TrendingHashtagPage } from '../types/explore.types';

export interface FetchTrendingHashtagsOptions {
  /** Page size — backend hard-caps between 1 and 20, default 8 */
  limit?: number;
}

export interface ExploreRepository {
  /**
   * Fetch the list of trending hashtags for the Explore / Hashtags tab.
   *
   * Calls the public `hashtag-suggestions` endpoint with an empty `query`
   * so the server returns its `Wa_GetTrendingHashs('popular')` set.
   */
  getTrendingHashtags(
    options?: FetchTrendingHashtagsOptions,
  ): Promise<TrendingHashtagPage>;
}
