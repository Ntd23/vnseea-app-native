import {
  getHlsPlaybackRetryDelay,
  HLS_PLAYBACK_RETRY_DELAYS_MS,
  isHlsPlaylistUrl,
} from '../hlsPlaybackRetry';

describe('hlsPlaybackRetry', () => {
  it('recognises public and signed Bunny playlists only', () => {
    expect(isHlsPlaylistUrl('https://vz-public.b-cdn.net/abc/playlist.m3u8')).toBe(true);
    expect(
      isHlsPlaylistUrl(
        'https://vz-chat.b-cdn.net/bcdn_token=HS256-x&token_path=%2Fabc%2F&expires=1/abc/playlist.m3u8',
      ),
    ).toBe(true);
    expect(isHlsPlaylistUrl('https://media.vnseea.vn/upload/videos/a.mp4')).toBe(false);
    expect(isHlsPlaylistUrl(undefined)).toBe(false);
  });

  it('retries a playlist three times with growing delays, other videos never', () => {
    const url = 'https://vz-public.b-cdn.net/abc/playlist.m3u8';
    expect([0, 1, 2, 3].map(attempt => getHlsPlaybackRetryDelay(url, attempt))).toEqual([
      ...HLS_PLAYBACK_RETRY_DELAYS_MS,
      null,
    ]);
    expect(getHlsPlaybackRetryDelay('https://media.vnseea.vn/a.mp4', 0)).toBeNull();
  });
});
