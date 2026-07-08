import {
  isNavigationRouteSelected,
  isReelItemActive,
  shouldMountReelVideoPlayer,
} from '../reelsPlayback';

describe('reels playback state', () => {
  it('keeps reels paused when the Video tab is mounted but not focused', () => {
    expect(
      isReelItemActive({
        isScreenFocused: false,
        isCommentsOpen: false,
        index: 0,
        activeIndex: 0,
      }),
    ).toBe(false);
  });

  it('keeps the active reel playing while comments are open', () => {
    expect(
      isReelItemActive({
        isScreenFocused: true,
        isCommentsOpen: true,
        index: 0,
        activeIndex: 0,
      }),
    ).toBe(true);
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
});
