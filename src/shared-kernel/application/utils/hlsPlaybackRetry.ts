// Description: Decides when a video player retries a Bunny Stream (HLS) playlist that failed to load.

/**
 * Just-in-time encoded Bunny videos can answer 404 for their segments for a
 * short while after they appear, and the CDN can hiccup, so players retry an
 * HLS playlist a few times before showing an error. Other videos keep their
 * own behaviour.
 */
export const HLS_PLAYBACK_RETRY_DELAYS_MS: readonly number[] = [2000, 4000, 8000];

const HLS_PLAYLIST_PATTERN = /\.m3u8(?:[?#]|$)/i;

export function isHlsPlaylistUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && HLS_PLAYLIST_PATTERN.test(url);
}

/** Delay before retry number `attempt` (0-based) of `url`, or null to give up. */
export function getHlsPlaybackRetryDelay(
  url: string | null | undefined,
  attempt: number,
): number | null {
  if (!isHlsPlaylistUrl(url)) return null;
  return HLS_PLAYBACK_RETRY_DELAYS_MS[attempt] ?? null;
}
