import {
  configureClientUiPerformanceMetrics,
  finishProfileOpenMeasurement,
  getClientUiPerformanceActiveSurface,
  getClientUiPerformanceSnapshot,
  isClientUiOptimizationEnabled,
  recordClientFrameInterval,
  recordClientLongTask,
  recordClientMediaLoad,
  recordActiveSurfaceMediaLoad,
  recordPostItemRender,
  recordVisiblePostIds,
  resetClientUiPerformanceMetrics,
  setClientUiPerformanceActiveSurface,
  startProfileOpenMeasurement,
} from '../clientUiPerformanceMetrics';

describe('clientUiPerformanceMetrics', () => {
  beforeEach(() => {
    configureClientUiPerformanceMetrics({
      enabled: true,
      frameBudgetMs: 16.67,
    });
    resetClientUiPerformanceMetrics();
  });

  it('tracks per-post renders and visible post coverage by surface', () => {
    recordPostItemRender('feed', 'post-1');
    recordPostItemRender('feed', 'post-1');
    recordPostItemRender('feed', 'post-2');
    recordVisiblePostIds('feed', ['post-1', 'post-2']);

    expect(getClientUiPerformanceSnapshot().surfaces.feed).toMatchObject({
      uniqueVisiblePostCount: 2,
      postItemRenderCount: 3,
      postItemRerenderCount: 1,
      maxRendersPerPost: 2,
      renderCounts: {
        'post-1': 2,
        'post-2': 1,
      },
    });
  });

  it('counts long frames, dropped frames, and media loaded offscreen', () => {
    recordClientFrameInterval('feed', 16.67);
    recordClientFrameInterval('feed', 34);
    recordClientFrameInterval('feed', 60);
    recordClientLongTask('feed', 72);
    recordClientMediaLoad('feed', 'image', false);
    recordClientMediaLoad('feed', 'video', true);

    expect(getClientUiPerformanceSnapshot().surfaces.feed).toMatchObject({
      frameSampleCount: 3,
      droppedFrameCount: 4,
      longFrameOver50MsCount: 1,
      longTaskOver50MsCount: 1,
      longTaskDurationTotalMs: 72,
      longTaskAverageDurationMs: 72,
      longTaskMaxDurationMs: 72,
      longTaskP95DurationMs: 72,
      maxFrameIntervalMs: 60,
      imageLoadCount: 1,
      videoLoadCount: 1,
      offscreenImageLoadCount: 1,
      offscreenVideoLoadCount: 0,
    });
  });

  it('attributes shared media components to the currently focused surface', () => {
    setClientUiPerformanceActiveSurface('profile');
    expect(getClientUiPerformanceActiveSurface()).toBe('profile');
    recordActiveSurfaceMediaLoad('image', false);

    expect(
      getClientUiPerformanceSnapshot().surfaces.profile,
    ).toMatchObject({
      imageLoadCount: 1,
      offscreenImageLoadCount: 1,
    });
  });

  it('preserves the active surface across reset and ignores neutral screens', () => {
    setClientUiPerformanceActiveSurface('profile');
    resetClientUiPerformanceMetrics();
    expect(getClientUiPerformanceActiveSurface()).toBe('profile');

    setClientUiPerformanceActiveSurface(null);
    recordActiveSurfaceMediaLoad('image', false);

    expect(getClientUiPerformanceSnapshot().surfaces.feed.imageLoadCount).toBe(
      0,
    );
    expect(
      getClientUiPerformanceSnapshot().surfaces.profile.imageLoadCount,
    ).toBe(0);
  });

  it('measures profile opening from the Feed handoff to the first rendered shell', () => {
    startProfileOpenMeasurement('user-7', 1_000);
    finishProfileOpenMeasurement('user-7', 1_145);

    expect(getClientUiPerformanceSnapshot().profileOpen).toMatchObject({
      sampleCount: 1,
      lastMs: 145,
      averageMs: 145,
      maxMs: 145,
    });
  });

  it('becomes a no-op when collection is disabled', () => {
    configureClientUiPerformanceMetrics({ enabled: false });
    recordPostItemRender('profile', 'post-1');
    recordClientMediaLoad('profile', 'image', false);

    expect(getClientUiPerformanceSnapshot().surfaces.profile).toMatchObject({
      uniqueVisiblePostCount: 0,
      postItemRenderCount: 0,
      imageLoadCount: 0,
    });
  });

  it('switches the development-only baseline path without disabling metrics', () => {
    configureClientUiPerformanceMetrics({ optimizationMode: 'baseline' });
    expect(isClientUiOptimizationEnabled()).toBe(false);
    expect(getClientUiPerformanceSnapshot().optimizationMode).toBe(
      'baseline',
    );

    configureClientUiPerformanceMetrics({ optimizationMode: 'optimized' });
    expect(isClientUiOptimizationEnabled()).toBe(true);
  });
});
