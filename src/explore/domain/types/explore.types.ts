// Description: Domain types for the explore bounded context (trending hashtags).

/**
 * A single trending hashtag returned by the backend.
 *
 * Sourced from WoWonder's `/api/hashtag-suggestions` endpoint which calls
 * `Wa_GetTrendingHashs('popular', $limit)` on the PHP side. The endpoint
 * is public (no auth required) so this can be loaded before login too.
 */
export interface TrendingHashtag {
  /** Backend row id — falls back to the tag string if id is missing */
  id: string;
  /** Hashtag text WITHOUT the leading `#` (e.g. "VNSEEA") */
  tag: string;
  /** SEO link to the web hashtag page (informational only; mobile navigates to Search) */
  url: string;
  /** Total number of posts that used this hashtag (`trend_use_num` from backend) */
  useCount: number;
  /** ISO timestamp string of last trend update, or `null` if backend returned an empty string */
  lastTrendTime: string | null;
}

/** Page shape returned from `getTrendingHashtags` — flat list, no pagination cursor. */
export interface TrendingHashtagPage {
  items: TrendingHashtag[];
}
