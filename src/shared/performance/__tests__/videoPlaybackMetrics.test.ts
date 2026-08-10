import {
  configureVideoPlaybackMetrics,
  getVideoPlaybackMetricsSnapshot,
  isVideoPlaybackMetricsEnabled,
  recordVideoBufferState,
  recordVideoError,
  recordVideoFirstFrame,
  recordVideoLoadStart,
  recordVideoPlayerMounted,
  recordVideoPlayerUnmounted,
  resetVideoPlaybackMetrics,
  updateVideoPlayerRole,
} from '../videoPlaybackMetrics';

describe('videoPlaybackMetrics', () => {
  beforeEach(() => {
    configureVideoPlaybackMetrics({
      enabled: true,
      loggingEnabled: false,
      maxTrackedPlayers: 64,
    });
    resetVideoPlaybackMetrics();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks mounted gauges and peaks by surface and role', () => {
    recordVideoPlayerMounted({
      playerId: 'reel-1',
      surface: 'reels',
      role: 'active',
    });
    recordVideoPlayerMounted({
      playerId: 'reel-2',
      surface: 'reels',
      role: 'neighbor',
    });
    updateVideoPlayerRole('reel-2', 'active');

    let snapshot = getVideoPlaybackMetricsSnapshot();
    expect(snapshot.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: 'reels',
          role: 'active',
          mountedPlayers: 2,
          peakMountedPlayers: 2,
        }),
        expect.objectContaining({
          surface: 'reels',
          role: 'neighbor',
          mountedPlayers: 0,
          peakMountedPlayers: 1,
        }),
      ]),
    );

    recordVideoPlayerUnmounted('reel-1');
    recordVideoPlayerUnmounted('reel-2');
    snapshot = getVideoPlaybackMetricsSnapshot();
    expect(
      snapshot.groups.find(group => group.role === 'active')?.mountedPlayers,
    ).toBe(0);
  });

  it('records one load-start to first-frame TTFF sample per load', () => {
    recordVideoPlayerMounted({
      playerId: 'feed-1',
      surface: 'feed',
      role: 'active',
    });
    recordVideoLoadStart('feed-1', 1_000);
    recordVideoFirstFrame('feed-1', 1_275);
    recordVideoFirstFrame('feed-1', 1_500);

    const group = getVideoPlaybackMetricsSnapshot().groups[0];
    expect(group).toMatchObject({
      loadStartCount: 1,
      firstFrameCount: 1,
      ttffCount: 1,
      ttffTotalMs: 275,
      ttffAverageMs: 275,
      ttffMaxMs: 275,
      ttffLastMs: 275,
    });
  });

  it('counts and times buffering only after the first frame', () => {
    recordVideoPlayerMounted({
      playerId: 'reel-1',
      surface: 'reels',
      role: 'active',
    });
    recordVideoLoadStart('reel-1', 0);
    recordVideoBufferState('reel-1', true, 10);
    recordVideoBufferState('reel-1', false, 100);
    recordVideoFirstFrame('reel-1', 200);
    recordVideoBufferState('reel-1', true, 1_000);
    recordVideoBufferState('reel-1', true, 1_050);
    recordVideoBufferState('reel-1', false, 1_240);

    const group = getVideoPlaybackMetricsSnapshot().groups[0];
    expect(group).toMatchObject({
      bufferCount: 1,
      bufferDurationMs: 240,
      bufferMaxDurationMs: 240,
    });
  });

  it('closes an open post-first-frame buffer when the player unmounts', () => {
    recordVideoPlayerMounted({
      playerId: 'reel-1',
      surface: 'reels',
      role: 'active',
    });
    recordVideoLoadStart('reel-1', 0);
    recordVideoFirstFrame('reel-1', 20);
    recordVideoBufferState('reel-1', true, 100);
    recordVideoPlayerUnmounted('reel-1', 175);

    expect(getVideoPlaybackMetricsSnapshot().groups[0]).toMatchObject({
      mountedPlayers: 0,
      bufferCount: 1,
      bufferDurationMs: 75,
    });
  });

  it('records player errors in the current surface and role', () => {
    recordVideoPlayerMounted({
      playerId: 'feed-1',
      surface: 'feed',
      role: 'warm',
    });
    recordVideoError('feed-1');
    recordVideoError('feed-1');

    expect(getVideoPlaybackMetricsSnapshot().groups[0].errorCount).toBe(2);
  });

  it('bounds per-player state and reports evictions', () => {
    configureVideoPlaybackMetrics({ maxTrackedPlayers: 2 });
    recordVideoPlayerMounted({
      playerId: 'reel-1',
      surface: 'reels',
      role: 'neighbor',
    });
    recordVideoPlayerMounted({
      playerId: 'reel-2',
      surface: 'reels',
      role: 'neighbor',
    });
    recordVideoPlayerMounted({
      playerId: 'reel-3',
      surface: 'reels',
      role: 'neighbor',
    });

    const snapshot = getVideoPlaybackMetricsSnapshot();
    expect(snapshot.trackedPlayerCount).toBe(2);
    expect(snapshot.evictedPlayerCount).toBe(1);
    expect(snapshot.players.map(player => player.playerId)).toEqual([
      'reel-2',
      'reel-3',
    ]);
    expect(snapshot.groups[0].mountedPlayers).toBe(2);
  });

  it('resets counters and player state without changing configuration', () => {
    configureVideoPlaybackMetrics({ maxTrackedPlayers: 3 });
    recordVideoPlayerMounted({
      playerId: 'reel-1',
      surface: 'reels',
      role: 'active',
    });

    resetVideoPlaybackMetrics();

    expect(getVideoPlaybackMetricsSnapshot()).toMatchObject({
      enabled: true,
      loggingEnabled: false,
      maxTrackedPlayers: 3,
      trackedPlayerCount: 0,
      evictedPlayerCount: 0,
      groups: [],
      players: [],
    });
  });

  it('does not log by default and logs only after explicit opt-in', () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});

    recordVideoPlayerMounted({
      playerId: 'reel-1',
      surface: 'reels',
      role: 'active',
    });
    expect(debug).not.toHaveBeenCalled();

    configureVideoPlaybackMetrics({ loggingEnabled: true });
    recordVideoLoadStart('reel-1', 100);
    expect(debug).toHaveBeenCalledWith(
      '[video-playback-metrics]',
      'load-start',
      expect.objectContaining({ playerId: 'reel-1' }),
    );
  });

  it('becomes a no-op when collection is disabled', () => {
    configureVideoPlaybackMetrics({ enabled: false });
    expect(isVideoPlaybackMetricsEnabled()).toBe(false);
    recordVideoPlayerMounted({
      playerId: 'reel-1',
      surface: 'reels',
      role: 'active',
    });

    expect(getVideoPlaybackMetricsSnapshot()).toMatchObject({
      enabled: false,
      groups: [],
      players: [],
    });
  });
});
