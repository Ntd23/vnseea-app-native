import {
  getVideoPlaybackTime,
  isNavigationRouteSelected,
  isReelPlayerRoleActive,
  resolveReelBufferModeForMount,
  resolveReelPlayerRole,
  resolveReelsViewportHeight,
  setVideoPlaybackTime,
  shouldAllowNextReelPreload,
  shouldDeferReelsPlaybackForPendingTarget,
  shouldPlayCurrentReel,
  shouldPrefetchMoreReels,
  shouldRetainCurrentReelPlayer,
  videoPlaybackTimes,
} from '../reelsPlayback';

describe('reels playback state', () => {
  beforeEach(() => {
    videoPlaybackTimes.clear();
  });

  it('plays the current reel when the route is focused and no modal is open', () => {
    expect(
      shouldPlayCurrentReel({
        isPlaybackRouteFocused: true,
        isDismissing: false,
        commentsOpen: false,
        shareOpen: false,
        editOpen: false,
        publisherOpen: false,
      }),
    ).toBe(true);
  });

  it('keeps the current reel playing while comments are open', () => {
    expect(
      shouldPlayCurrentReel({
        isPlaybackRouteFocused: true,
        isDismissing: false,
        commentsOpen: true,
        shareOpen: false,
        editOpen: false,
        publisherOpen: false,
      }),
    ).toBe(true);
  });

  it.each([
    ['share', { shareOpen: true }],
    ['edit', { editOpen: true }],
    ['publisher', { publisherOpen: true }],
  ])(
    'pauses the current reel while the %s overlay is open',
    (_name, overlay) => {
      expect(
        shouldPlayCurrentReel({
          isPlaybackRouteFocused: true,
          isDismissing: false,
          commentsOpen: false,
          shareOpen: false,
          editOpen: false,
          publisherOpen: false,
          ...overlay,
        }),
      ).toBe(false);
    },
  );

  it('plays only the current role when playback is allowed', () => {
    expect(
      isReelPlayerRoleActive({ role: 'current', playbackAllowed: true }),
    ).toBe(true);
    expect(
      isReelPlayerRoleActive({ role: 'previous', playbackAllowed: true }),
    ).toBe(false);
    expect(
      isReelPlayerRoleActive({ role: 'next', playbackAllowed: true }),
    ).toBe(false);
    expect(
      isReelPlayerRoleActive({ role: 'current', playbackAllowed: false }),
    ).toBe(false);
  });

  it('assigns only previous, current, and next roles in steady state', () => {
    const roleAt = (index: number) =>
      resolveReelPlayerRole({
        isPlaybackRouteFocused: true,
        index,
        activeIndex: 4,
        allowNextPreload: true,
      });

    expect(roleAt(2)).toBe('none');
    expect(roleAt(3)).toBe('previous');
    expect(roleAt(4)).toBe('current');
    expect(roleAt(5)).toBe('next');
    expect(roleAt(6)).toBe('none');
  });

  it('waits for neighbor warmup before mounting the previous Reel', () => {
    expect(
      resolveReelPlayerRole({
        isPlaybackRouteFocused: true,
        index: 3,
        activeIndex: 4,
        allowPreviousPreload: false,
        allowNextPreload: false,
      }),
    ).toBe('none');

    expect(
      resolveReelPlayerRole({
        isPlaybackRouteFocused: true,
        index: 3,
        activeIndex: 4,
        allowPreviousPreload: true,
        allowNextPreload: false,
      }),
    ).toBe('previous');
  });

  it('unmounts the stale next preload during momentum but keeps previous and current', () => {
    const roleAt = (index: number) =>
      resolveReelPlayerRole({
        isPlaybackRouteFocused: true,
        index,
        activeIndex: 4,
        allowNextPreload: false,
      });

    expect(roleAt(3)).toBe('previous');
    expect(roleAt(4)).toBe('current');
    expect(roleAt(5)).toBe('none');
  });

  it('keeps the incoming next Reel mounted until it becomes current, then suppresses the new next preload', () => {
    expect(
      shouldAllowNextReelPreload({
        isNeighborPreloadReady: true,
        isNextPreloadSuppressed: true,
        activeIndex: 4,
        suppressionAnchorIndex: 4,
      }),
    ).toBe(true);

    expect(
      shouldAllowNextReelPreload({
        isNeighborPreloadReady: true,
        isNextPreloadSuppressed: true,
        activeIndex: 5,
        suppressionAnchorIndex: 4,
      }),
    ).toBe(false);
  });

  it('releases every player when the route is not focused', () => {
    for (const index of [3, 4, 5]) {
      expect(
        resolveReelPlayerRole({
          isPlaybackRouteFocused: false,
          keepCurrentPlayerMounted: false,
          index,
          activeIndex: 4,
          allowNextPreload: true,
        }),
      ).toBe('none');
    }
  });

  it('keeps only the current tab player mounted and paused for a fast return', () => {
    const roleAt = (index: number) =>
      resolveReelPlayerRole({
        isPlaybackRouteFocused: false,
        keepCurrentPlayerMounted: true,
        index,
        activeIndex: 4,
        allowNextPreload: true,
      });

    expect(roleAt(3)).toBe('none');
    expect(roleAt(4)).toBe('current');
    expect(roleAt(5)).toBe('none');
    expect(
      isReelPlayerRoleActive({
        role: roleAt(4),
        playbackAllowed: false,
      }),
    ).toBe(false);
  });

  it('retains the current tab player only while MainTabs owns the root surface', () => {
    const baseInput = {
      hasActivatedPlayback: true,
      isTabRoute: true,
      isMainTabsRootSelected: true,
      isAppActive: true,
      isDismissing: false,
    };

    expect(shouldRetainCurrentReelPlayer(baseInput)).toBe(true);
    expect(
      shouldRetainCurrentReelPlayer({
        ...baseInput,
        isMainTabsRootSelected: false,
      }),
    ).toBe(false);
    expect(
      shouldRetainCurrentReelPlayer({
        ...baseInput,
        isAppActive: false,
      }),
    ).toBe(false);
  });

  it('defers a retained Reel while a different Feed target is pending', () => {
    expect(
      shouldDeferReelsPlaybackForPendingTarget({
        initialVideoId: 'target-reel',
        hasInitialPost: true,
        activeReelId: 'retained-reel',
        consumedInitialVideoId: null,
      }),
    ).toBe(true);

    expect(
      shouldDeferReelsPlaybackForPendingTarget({
        initialVideoId: 'target-reel',
        hasInitialPost: true,
        activeReelId: 'target-reel',
        consumedInitialVideoId: null,
      }),
    ).toBe(false);

    expect(
      shouldDeferReelsPlaybackForPendingTarget({
        initialVideoId: 'target-reel',
        hasInitialPost: true,
        activeReelId: 'retained-reel',
        consumedInitialVideoId: 'target-reel',
      }),
    ).toBe(false);

    expect(
      shouldDeferReelsPlaybackForPendingTarget({
        initialVideoId: 'target-reel',
        hasInitialPost: false,
        activeReelId: 'retained-reel',
        consumedInitialVideoId: null,
      }),
    ).toBe(false);
  });

  it('uses the light buffer mode only when a player first mounts as next', () => {
    expect(resolveReelBufferModeForMount('next')).toBe('next-preload');
    expect(resolveReelBufferModeForMount('current')).toBe('standard');
    expect(resolveReelBufferModeForMount('previous')).toBe('standard');
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
      resolveReelPlayerRole({
        isPlaybackRouteFocused: isRouteSelected,
        index: 0,
        activeIndex: 0,
        allowNextPreload: true,
      }),
    ).toBe('none');
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
      resolveReelPlayerRole({
        isPlaybackRouteFocused: isRouteSelected,
        index: 0,
        activeIndex: 0,
        allowNextPreload: false,
      }),
    ).toBe('current');
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
