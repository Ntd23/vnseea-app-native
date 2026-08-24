import {
  getFeedVideoPlaybackPolicy,
  resolveFeedVisibleMediaPostIds,
  resolveFeedVisibleMediaRetentionDeadline,
  getRetainedFeedVideoPosterKeys,
  getFeedVideoActiveUpdate,
  pickFeedVideoAutoplayCandidate,
  selectFeedVideoMeasurementIds,
  shouldClearFeedActiveVideo,
  shouldCommitFeedChromeVisibility,
  shouldMountWarmFeedVideo,
  shouldMeasureFeedVideoPosterAspectRatio,
  shouldMeasureFeedVideoDuringScroll,
  shouldPlayFeedVideo,
  resolvePlaybackSurfaceFocused,
  resolvePlaybackSurfaceVisibleMediaPostIds,
} from '../feedVideoAutoplay';

describe('feed video autoplay selection', () => {
  it('uses one shared low-decoder policy for Home and Profile surfaces', () => {
    expect(getFeedVideoPlaybackPolicy('android')).toEqual({
      warmBehindItems: 0,
      warmAheadItems: 1,
      idleWarmMaxCount: 1,
      scrollingWarmMaxCount: 1,
      posterPrefetchBehindItems: 0,
      posterPrefetchAheadItems: 1,
    });
    expect(getFeedVideoPlaybackPolicy('ios')).toEqual({
      warmBehindItems: 0,
      warmAheadItems: 1,
      idleWarmMaxCount: 1,
      scrollingWarmMaxCount: 0,
      posterPrefetchBehindItems: 0,
      posterPrefetchAheadItems: 2,
    });
  });

  it('requires both route focus and an active app for playback ownership', () => {
    expect(
      resolvePlaybackSurfaceFocused({ routeFocused: true, appActive: true }),
    ).toBe(true);
    expect(
      resolvePlaybackSurfaceFocused({ routeFocused: true, appActive: false }),
    ).toBe(false);
    expect(
      resolvePlaybackSurfaceFocused({ routeFocused: false, appActive: true }),
    ).toBe(false);
  });

  it('clears media while inactive and restores the cached viewport when active', () => {
    const latestVisiblePostIds = ['audio-post', 'video-post'];

    expect(
      resolvePlaybackSurfaceVisibleMediaPostIds({
        surfaceFocused: false,
        latestVisiblePostIds,
      }),
    ).toEqual([]);
    expect(
      resolvePlaybackSurfaceVisibleMediaPostIds({
        surfaceFocused: true,
        latestVisiblePostIds,
      }),
    ).toEqual(latestVisiblePostIds);
  });

  it('only lets the active owner advance even when a warm player is mounted', () => {
    expect(
      shouldPlayFeedVideo({
        shouldMountVideo: true,
        isActive: false,
        isWarm: true,
        manuallyPaused: false,
      }),
    ).toBe(false);
    expect(
      shouldPlayFeedVideo({
        shouldMountVideo: true,
        isActive: true,
        isWarm: true,
        manuallyPaused: false,
      }),
    ).toBe(true);
  });

  it('requires at least 60 percent of the media surface to be visible', () => {
    expect(
      pickFeedVideoAutoplayCandidate({
        viewportHeight: 800,
        candidates: [{ id: 'video-below-threshold', y: -240.4, height: 600 }],
      }),
    ).toBeNull();

    expect(
      pickFeedVideoAutoplayCandidate({
        viewportHeight: 800,
        candidates: [{ id: 'video-at-threshold', y: -240, height: 600 }],
      }),
    ).toBe('video-at-threshold');
  });

  it('selects the eligible visible video closest to viewport center', () => {
    expect(
      pickFeedVideoAutoplayCandidate({
        viewportHeight: 900,
        candidates: [
          { id: 'video-top', y: 0, height: 500 },
          { id: 'video-center', y: 250, height: 500 },
        ],
      }),
    ).toBe('video-center');
  });

  it('retains the active video while any part remains visible during scrolling', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: 'video-a',
        isScrolling: true,
        viewportHeight: 800,
        candidates: [
          { id: 'video-a', y: -241, height: 600 },
          { id: 'video-b', y: 200, height: 500 },
        ],
      }),
    ).toEqual({
      nextActiveVideoId: undefined,
      pendingActiveVideoId: 'video-b',
    });
  });

  it('clears the active video only after its media fully leaves the viewport', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: 'video-a',
        isScrolling: true,
        viewportHeight: 800,
        candidates: [
          { id: 'video-a', y: -600, height: 600 },
          { id: 'video-b', y: 200, height: 500 },
        ],
      }),
    ).toEqual({
      nextActiveVideoId: null,
      pendingActiveVideoId: 'video-b',
    });
  });

  it('retains partially visible active media after scrolling settles', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: 'video-a',
        isScrolling: false,
        viewportHeight: 800,
        candidates: [{ id: 'video-a', y: -241, height: 600 }],
      }),
    ).toEqual({
      nextActiveVideoId: 'video-a',
      pendingActiveVideoId: null,
    });
  });

  it('activates a newly visible video when feed scrolling is settled', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: null,
        isScrolling: false,
        viewportHeight: 800,
        candidates: [{ id: 'video-c', y: 100, height: 500 }],
      }),
    ).toEqual({
      nextActiveVideoId: 'video-c',
      pendingActiveVideoId: null,
    });
  });

  it('bounds native viewport measurements while scrolling', () => {
    expect(
      shouldMeasureFeedVideoDuringScroll({
        lastMeasuredAtMs: null,
        nowMs: 1_000,
        minIntervalMs: 64,
      }),
    ).toBe(true);
    expect(
      shouldMeasureFeedVideoDuringScroll({
        lastMeasuredAtMs: 1_000,
        nowMs: 1_063,
        minIntervalMs: 64,
      }),
    ).toBe(false);
    expect(
      shouldMeasureFeedVideoDuringScroll({
        lastMeasuredAtMs: 1_000,
        nowMs: 1_064,
        minIntervalMs: 64,
      }),
    ).toBe(true);
  });

  it('prioritizes active and nearby video surfaces, then fills unused capacity', () => {
    expect(
      selectFeedVideoMeasurementIds({
        mountedVideoIds: ['video-a', 'video-b', 'video-c', 'video-d'],
        priorityVideoIds: ['video-c', 'video-missing', 'video-a', 'video-c'],
        maxCount: 3,
      }),
    ).toEqual(['video-c', 'video-a', 'video-b']);
  });

  it('does not mount a warm Android video surface during a fling', () => {
    expect(
      shouldMountWarmFeedVideo({
        platform: 'android',
        optimizationEnabled: false,
        isWarm: true,
        isScrollBusy: true,
        shouldKeepPreparedVideoMounted: false,
      }),
    ).toBe(false);
    expect(
      shouldMountWarmFeedVideo({
        platform: 'android',
        optimizationEnabled: true,
        isWarm: true,
        isScrollBusy: true,
        shouldKeepPreparedVideoMounted: false,
        wasPlayerSurfaceMounted: false,
      }),
    ).toBe(false);
    expect(
      shouldMountWarmFeedVideo({
        platform: 'android',
        optimizationEnabled: true,
        isWarm: true,
        isScrollBusy: true,
        shouldKeepPreparedVideoMounted: true,
        wasPlayerSurfaceMounted: false,
      }),
    ).toBe(false);
  });

  it('retains one already-mounted Android warm surface during a fling', () => {
    expect(
      shouldMountWarmFeedVideo({
        platform: 'android',
        optimizationEnabled: true,
        isWarm: true,
        isScrollBusy: true,
        shouldKeepPreparedVideoMounted: false,
        wasPlayerSurfaceMounted: true,
      }),
    ).toBe(true);
  });

  it('retains visible media through a transient empty relayout snapshot', () => {
    expect(
      resolveFeedVisibleMediaPostIds({
        previousVisiblePostIds: ['video-tail'],
        nextVisiblePostIds: [],
        availablePostIds: new Set(['post-1', 'video-tail', 'post-2']),
        allowTransientEmptyRetention: true,
      }),
    ).toEqual(['video-tail']);

    expect(
      resolveFeedVisibleMediaPostIds({
        previousVisiblePostIds: ['video-tail'],
        nextVisiblePostIds: ['post-2'],
        availablePostIds: new Set(['post-1', 'video-tail', 'post-2']),
        allowTransientEmptyRetention: true,
      }),
    ).toEqual(['post-2', 'video-tail']);

    expect(
      resolveFeedVisibleMediaPostIds({
        previousVisiblePostIds: ['video-tail'],
        nextVisiblePostIds: ['post-2'],
        availablePostIds: new Set(['post-1', 'video-tail', 'post-2']),
        allowTransientEmptyRetention: false,
      }),
    ).toEqual(['post-2']);
  });

  it('validates only retained visible IDs against the precomputed feed ID set', () => {
    const availabilityChecks: string[] = [];
    const availablePostIds = {
      has(postId: string) {
        availabilityChecks.push(postId);
        return postId === 'video-tail';
      },
      [Symbol.iterator]() {
        throw new Error(
          'available feed IDs must not be scanned in viewability',
        );
      },
    } as unknown as ReadonlySet<string>;

    expect(
      resolveFeedVisibleMediaPostIds({
        previousVisiblePostIds: new Set(['video-tail', 'stale-video']),
        nextVisiblePostIds: new Set(['post-2']),
        availablePostIds,
        allowTransientEmptyRetention: true,
      }),
    ).toEqual(['post-2', 'video-tail']);
    expect(availabilityChecks).toEqual(['video-tail', 'stale-video']);
  });

  it('keeps one fixed relayout deadline across repeated partial snapshots', () => {
    const firstDeadline = resolveFeedVisibleMediaRetentionDeadline({
      currentDeadlineAtMs: null,
      nowMs: 1_000,
      retentionDurationMs: 140,
      allowTransientRetention: true,
      hasRetainedPostIds: true,
    });

    expect(firstDeadline).toBe(1_140);
    expect(
      resolveFeedVisibleMediaRetentionDeadline({
        currentDeadlineAtMs: firstDeadline,
        nowMs: 1_080,
        retentionDurationMs: 140,
        allowTransientRetention: true,
        hasRetainedPostIds: true,
      }),
    ).toBe(1_140);
    expect(
      resolveFeedVisibleMediaRetentionDeadline({
        currentDeadlineAtMs: firstDeadline,
        nowMs: 1_140,
        retentionDurationMs: 140,
        allowTransientRetention: true,
        hasRetainedPostIds: true,
      }),
    ).toBeNull();
    expect(
      resolveFeedVisibleMediaRetentionDeadline({
        currentDeadlineAtMs: firstDeadline,
        nowMs: 1_141,
        retentionDurationMs: 140,
        allowTransientRetention: true,
        hasRetainedPostIds: true,
      }),
    ).toBeNull();
  });

  it('clears an active video only after the stabilized visible set drops it', () => {
    const retainedIds = new Set(
      resolveFeedVisibleMediaPostIds({
        previousVisiblePostIds: new Set(['video-tail']),
        nextVisiblePostIds: new Set(),
        availablePostIds: new Set(['video-tail']),
        allowTransientEmptyRetention: true,
      }),
    );

    expect(
      shouldClearFeedActiveVideo({
        activeVideoId: 'video-tail',
        visiblePostIds: retainedIds,
      }),
    ).toBe(false);
    expect(
      shouldClearFeedActiveVideo({
        activeVideoId: 'video-tail',
        visiblePostIds: new Set(['post-2']),
      }),
    ).toBe(true);
  });

  it('clears visible media immediately for an explicit lifecycle reset', () => {
    expect(
      resolveFeedVisibleMediaPostIds({
        previousVisiblePostIds: ['video-tail'],
        nextVisiblePostIds: [],
        availablePostIds: new Set(['video-tail']),
        allowTransientEmptyRetention: false,
      }),
    ).toEqual([]);
  });

  it('drops stale poster work and keeps the most recent bounded runway', () => {
    expect(
      getRetainedFeedVideoPosterKeys({
        pendingKeys: ['old-a', 'near-b', 'near-c', 'near-d'],
        requestedKeys: ['near-b', 'near-c', 'near-d'],
        maxCount: 2,
      }),
    ).toEqual(['near-c', 'near-d']);
  });

  it('commits chrome visibility only when the optimized value changes', () => {
    expect(
      shouldCommitFeedChromeVisibility({
        optimizationEnabled: false,
        current: true,
        next: true,
      }),
    ).toBe(true);
    expect(
      shouldCommitFeedChromeVisibility({
        optimizationEnabled: true,
        current: true,
        next: true,
      }),
    ).toBe(false);
    expect(
      shouldCommitFeedChromeVisibility({
        optimizationEnabled: true,
        current: true,
        next: false,
      }),
    ).toBe(true);
  });

  it('skips poster geometry work when Android uses a fixed video frame', () => {
    expect(shouldMeasureFeedVideoPosterAspectRatio('android')).toBe(false);
    expect(shouldMeasureFeedVideoPosterAspectRatio('ios')).toBe(true);
  });
});
