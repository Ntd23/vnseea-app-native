const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Reel video playback resilience', () => {
  const reelItemSource = read('src/reels/presentation/components/ReelItem.tsx');
  const reelsScreenSource = read(
    'src/reels/presentation/screens/ReelsScreen.tsx',
  );
  const feedScreenSource = read(
    'src/feed/presentation/screens/FeedScreen.tsx',
  );
  const homeVideoSource = read(
    'src/feed/presentation/components/PostCards.tsx',
  );

  it('uses an Android TextureView and avoids clipped player detach churn', () => {
    expect(reelItemSource).toContain(
      "useTextureView={Platform.OS === 'android'}",
    );
    expect(reelsScreenSource).toContain(
      "removeClippedSubviews={Platform.OS !== 'android'}",
    );
  });

  it('keeps the current Reel playing and looping behind the comments sheet', () => {
    expect(reelItemSource).toContain('paused={!playing}');
    expect(reelsScreenSource).toContain('isCommentsOpenRef.current');
    expect(reelsScreenSource).toContain('isShareSheetOpenRef.current');
    expect(reelsScreenSource).toContain('isPublisherOverlayOpenRef.current');
    expect(reelsScreenSource).toContain('isUserDraggingRef.current');
    expect(reelItemSource).toContain('resetPlaybackToStart(true)');
  });

  it('shrinks the playing Reel into a contained preview above comments', () => {
    expect(reelsScreenSource).toContain(
      'commentsPreviewVisible={isCommentsPreviewVisible && isCurrent}',
    );
    expect(reelsScreenSource).toContain('REELS_COMMENTS_PREVIEW_RATIO = 0.36');
    expect(reelItemSource).toContain('mediaStageAnimatedStyle');
    expect(reelItemSource).toContain('videoFrameAnimatedStyle');
    expect(reelItemSource).toContain('previewVideoAspectRatio');
    expect(reelItemSource).toContain('commentsPreviewProgress.value = withTiming');
    expect(reelItemSource).toContain('reelChromeAnimatedStyle');
    expect(reelItemSource).toContain('paused={!playing}');
    expect(reelsScreenSource).toContain(
      'onOpenStart={handleCommentsOpenStart}',
    );
    const openHandlerSource = reelsScreenSource.slice(
      reelsScreenSource.indexOf('const handleOpenComments'),
      reelsScreenSource.indexOf('const handleCommentsOpenStart'),
    );
    expect(openHandlerSource).toContain('openReelComments(postId)');
    expect(openHandlerSource).not.toContain(
      'setIsCommentsPreviewVisible(true)',
    );
  });

  it('blocks auto-advance immediately and throughout the comments lifecycle', () => {
    expect(reelsScreenSource).toContain('isCommentsOpenRef.current = true');
    expect(reelsScreenSource).toContain(
      'cancelAnimationFrame(autoAdvanceFrameRef.current)',
    );
    expect(reelsScreenSource).toContain(
      'if (isCommentsOpenRef.current) return;',
    );
    expect(reelsScreenSource).toMatch(
      /autoAdvanceFrameRef\.current = requestAnimationFrame\(\(\) => \{[\s\S]*isCommentsOpenRef\.current/,
    );
    expect(reelsScreenSource).toContain(
      'onCloseStart={handleCommentsCloseStart}',
    );
  });

  it('keeps playback progress and scrubbing off the React render hot path', () => {
    expect(reelItemSource).toContain('const playbackProgress = useSharedValue(0)');
    expect(reelItemSource).toContain('const dragSeekProgress = useSharedValue(0)');
    expect(reelItemSource).toContain('SEEK_PREVIEW_THROTTLE_MS = 80');
    expect(reelItemSource).toContain('progressFillAnimatedStyle');
    expect(reelItemSource).not.toContain('setCurrentTime(');
    expect(reelItemSource).toContain(
      'now - lastNativeSeekAtRef.current >= SEEK_PREVIEW_THROTTLE_MS',
    );
  });

  it('avoids redundant animated-list work and cancels auto-next on manual swipes', () => {
    expect(reelsScreenSource).toContain('<FlatList');
    expect(reelsScreenSource).not.toContain('AnimatedFlatList');
    expect(reelsScreenSource).not.toContain('extraData={{');
    expect(reelsScreenSource).toContain(
      'onScrollBeginDrag={handleReelScrollBeginDrag}',
    );
    expect(reelsScreenSource).toContain('isUserDraggingRef.current');
    expect(reelsScreenSource).toContain('initialNumToRender={2}');
    expect(reelsScreenSource).toContain('updateCellsBatchingPeriod={32}');
    expect(reelsScreenSource).toContain('itemVisiblePercentThreshold: 70');
    expect(reelsScreenSource).toContain('minimumViewTime: 40');
    expect(reelsScreenSource).not.toContain('onPressIn=');
    expect(reelsScreenSource).toContain('hitSlop={HEADER_ACTION_HIT_SLOP}');
  });

  it('returns an incomplete edge swipe without spring overshoot', () => {
    expect(reelsScreenSource).toContain(
      'BACK_GESTURE_RETURN_MIN_DURATION_MS = 90',
    );
    expect(reelsScreenSource).toContain(
      'BACK_GESTURE_RETURN_MAX_DURATION_MS = 180',
    );
    expect(reelsScreenSource).toContain(
      '.activeOffsetX(BACK_GESTURE_ACTIVE_OFFSET_X)',
    );
    expect(reelsScreenSource).not.toContain(
      '.activeOffsetX([BACK_GESTURE_ACTIVE_OFFSET_X, 999])',
    );
    expect(reelsScreenSource).toContain('dragX.value = withTiming(0, returnConfig)');
    expect(reelsScreenSource).toContain(
      'screenDismissX.value = withTiming(0, returnConfig)',
    );
    expect(reelsScreenSource).toContain(
      'const dismissX = Math.max(0, screenDismissX.value)',
    );
    expect(reelsScreenSource).toContain('{ translateX: dismissX }');
    expect(reelsScreenSource).not.toContain('withSpring');
  });

  it('retries a transient player error before marking the current reel unavailable', () => {
    expect(reelItemSource).toContain('REEL_VIDEO_RETRY_LIMIT = 1');
    expect(reelItemSource).toContain(
      'setPlayerAttempt(previous => previous + 1)',
    );
    expect(reelItemSource).toContain('if (!isCurrent) return;');
  });

  it('resets and reports native player readiness across remounts', () => {
    expect(reelItemSource).toContain('onLoadStart={() => {');
    expect(reelItemSource).toContain('onReadyForDisplay={markVideoDisplayed}');
    expect(reelItemSource).toContain(
      'onBuffer={({ isBuffering: nextIsBuffering }) => {',
    );
    expect(reelItemSource).toContain('key={`${item.id}:${playerAttempt}`}');
  });

  it('pauses and unmounts reel players while the app is backgrounded', () => {
    expect(reelsScreenSource).toContain(
      "() => AppState.currentState === 'active'",
    );
    expect(reelsScreenSource).toContain(
      "setIsAppActive(nextState === 'active')",
    );
    expect(reelsScreenSource).toContain(
      'isFocusedScreen && isSelectedRoute && isAppActive',
    );
  });

  it('mounts the active player immediately and keeps the tab player warm', () => {
    expect(reelsScreenSource).not.toContain(
      'REELS_ACTIVE_PLAYER_MOUNT_DELAY_MS',
    );
    expect(reelsScreenSource).toContain(
      'REELS_NEIGHBOR_PLAYER_MOUNT_DELAY_MS',
    );
    expect(reelsScreenSource).toContain(
      'const shouldKeepPlayersMounted =',
    );
    expect(reelsScreenSource).toContain(
      'const activePreloadRadius = isNeighborPreloadReady ? preloadRadius : 0',
    );
    expect(reelsScreenSource).toContain('setIsPlaybackMountReady(true)');
    expect(reelsScreenSource).toContain('setIsNeighborPreloadReady(true)');
    expect(reelsScreenSource).toContain(
      '(isTabRoute || isPlaybackRouteFocused || isDismissing)',
    );
    expect(reelsScreenSource).not.toContain('setIsPlaybackMountReady(false)');
    expect(feedScreenSource).toContain('startReelsPreload');
    expect(feedScreenSource).not.toContain('Image.prefetch(item.thumbnailUrl)');
    expect(reelsScreenSource).not.toContain('launchCoverUri');
    expect(reelItemSource).not.toContain(
      'item.thumbnailUrl && shouldMount && !isReady',
    );
    expect(homeVideoSource).toContain('FEED_VIDEO_BLUR_SURFACE_GRACE_MS');
    expect(homeVideoSource).toContain('isBlurSurfaceGraceActive');
  });

  it('pauses before returning Home without tearing down the player mid-transition', () => {
    expect(reelsScreenSource).toContain('setIsDismissing(true)');
    expect(reelsScreenSource).toContain(
      'dismissNavigationFrameRef.current = requestAnimationFrame',
    );
    expect(reelsScreenSource).toContain(
      "BackHandler.addEventListener(\n        'hardwareBackPress'",
    );
    expect(reelsScreenSource).toContain(
      'runOnJS(beginDismissTransition)()',
    );
    expect(reelsScreenSource).toContain('onPress={goBackToFeed}');
    expect(reelsScreenSource).toContain('navigation.navigate(ROUTES.FEED)');
    expect(reelsScreenSource).not.toContain('{!isTabRoute ? (');
    expect(reelsScreenSource).not.toContain(
      "Platform.OS !== 'android' || isTabRoute",
    );
  });

  it('keeps video source identity and seek-time memo inputs stable', () => {
    expect(reelItemSource).toContain('const videoSource = useMemo(');
    expect(reelItemSource).toContain('REEL_ANDROID_BUFFER_CONFIG');
    expect(reelItemSource).toContain('bufferForPlaybackMs: 400');
    expect(reelItemSource).toContain('cacheSizeMB: 64');
    expect(reelItemSource).toContain('minLoadRetryCount: 2');
    expect(reelItemSource).toContain(
      'prev.initialSeekTime === next.initialSeekTime',
    );
  });
});
