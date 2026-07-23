import {
  getVideoPlaybackTime,
  isNavigationRouteSelected,
  isReelItemActive,
  resolveReelsViewportHeight,
  setVideoPlaybackTime,
  shouldMountReelVideoPlayer,
  shouldPrefetchMoreReels,
  videoPlaybackTimes,
} from '../reelsPlayback';

describe('reels playback state', () => {
  beforeEach(() => {
    videoPlaybackTimes.clear();
  });

  it('keeps reels paused when the Video tab is mounted but not focused', () => {
    expect(
      isReelItemActive({
        isScreenFocused: false,
        index: 0,
        activeIndex: 0,
      }),
    ).toBe(false);
  });

  it('keeps the active reel playing while comments are open', () => {
    expect(
      isReelItemActive({
        isScreenFocused: true,
        index: 0,
        activeIndex: 0,
      }),
    ).toBe(true);
  });

  it('keeps the Reel pager height stable while the comment keyboard resizes Android', () => {
    expect(
      resolveReelsViewportHeight({
        currentHeight: 900,
        nextHeight: 520,
        commentsOpen: true,
      }),
    ).toBe(900);

    expect(
      resolveReelsViewportHeight({
        currentHeight: 900,
        nextHeight: 820,
        commentsOpen: false,
      }),
    ).toBe(820);
  });

  it('does not mount reel video players while the native iOS Video tab is background-mounted', () => {
    const tabState = {
      index: 0,
      routes: [
        { key: 'feed-tab', name: 'Feed' },
        { key: 'reels-tab', name: 'Reels' },
      ],
    };

    const isRouteSelected = isNavigationRouteSelected(
      tabState,
      'reels-tab',
      'Reels',
    );

    expect(isRouteSelected).toBe(false);
    expect(
      shouldMountReelVideoPlayer({
        isPlaybackRouteFocused: isRouteSelected,
        index: 0,
        activeIndex: 0,
        preloadRadius: 1,
      }),
    ).toBe(false);
  });

  it('mounts the current reel video only after the Video route is selected', () => {
    const tabState = {
      index: 1,
      routes: [
        { key: 'feed-tab', name: 'Feed' },
        { key: 'reels-tab', name: 'Reels' },
      ],
    };

    const isRouteSelected = isNavigationRouteSelected(
      tabState,
      'reels-tab',
      'Reels',
    );

    expect(isRouteSelected).toBe(true);
    expect(
      shouldMountReelVideoPlayer({
        isPlaybackRouteFocused: isRouteSelected,
        index: 0,
        activeIndex: 0,
        preloadRadius: 1,
      }),
    ).toBe(true);
  });

  it('prefetches before the viewer reaches the final reel', () => {
    expect(
      shouldPrefetchMoreReels({
        visibleIndex: 17,
        itemCount: 20,
        hasMore: true,
        isLoadingMore: false,
      }),
    ).toBe(true);
  });

  it('does not start a duplicate reel prefetch', () => {
    expect(
      shouldPrefetchMoreReels({
        visibleIndex: 19,
        itemCount: 20,
        hasMore: true,
        isLoadingMore: true,
      }),
    ).toBe(false);
  });

  it('bounds remembered playback positions during long Reel sessions', () => {
    for (let index = 0; index < 205; index += 1) {
      setVideoPlaybackTime(`reel-${index}`, index);
    }

    expect(videoPlaybackTimes.size).toBe(200);
    expect(getVideoPlaybackTime('reel-0', 999)).toBe(999);
    expect(getVideoPlaybackTime('reel-204')).toBe(204);
  });
});
