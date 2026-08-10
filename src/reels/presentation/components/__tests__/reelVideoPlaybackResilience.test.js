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
  const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
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

  it('pauses the current Reel behind every modal without unmounting the role window', () => {
    expect(reelItemSource).toContain('paused={!playing}');
    expect(reelsScreenSource).toContain(
      'const shouldPlayActiveReel = shouldPlayCurrentReel({',
    );
    expect(reelsScreenSource).toContain('commentsOpen: vm.isCommentsOpen');
    expect(reelsScreenSource).toContain(
      'shareOpen: shareModalVisible || isShareSheetClosing',
    );
    expect(reelsScreenSource).toContain(
      'const REELS_SHARE_CLOSE_GRACE_MS = 300;',
    );
    expect(reelsScreenSource).toContain('setIsShareSheetClosing(true)');
    expect(reelsScreenSource).toContain('editOpen: editingReel !== null');
    expect(reelsScreenSource).toContain(
      'publisherOpen: isPublisherOverlayOpen',
    );
    expect(reelsScreenSource).toContain(
      'const playerRole = resolveReelPlayerRole({',
    );
    expect(reelsScreenSource).toContain('isPlaybackRouteFocused,');
    expect(reelsScreenSource).not.toContain(
      'shouldKeepPlayersMounted && !isPublisherOverlayOpen',
    );
  });

  it('shrinks the playing Reel into a contained preview above comments', () => {
    expect(reelsScreenSource).toContain(
      'commentsPreviewVisible={isCommentsPreviewVisible && isCurrent}',
    );
    expect(reelsScreenSource).toContain('REELS_COMMENTS_PREVIEW_RATIO = 0.36');
    expect(reelItemSource).toContain('mediaStageAnimatedStyle');
    expect(reelItemSource).toContain('videoFrameAnimatedStyle');
    expect(reelItemSource).toContain('previewVideoRect');
    expect(reelItemSource).toContain(
      'commentsPreviewProgress.value = withTiming',
    );
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
    expect(reelItemSource).toContain(
      'const playbackProgress = useSharedValue(0)',
    );
    expect(reelItemSource).toContain(
      'const dragSeekProgress = useSharedValue(0)',
    );
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
    expect(reelsScreenSource).toContain('setIsNextPreloadSuppressed(true)');
    expect(reelsScreenSource).toContain('setIsNextPreloadSuppressed(false)');
    expect(reelsScreenSource).toContain(
      'const allowNextPreload = shouldAllowNextReelPreload({',
    );
    expect(reelsScreenSource).toContain(
      'suppressionAnchorIndex: nextPreloadSuppressionAnchorRef.current',
    );
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
    expect(reelsScreenSource).toContain(
      'dragX.value = withTiming(0, returnConfig)',
    );
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
      'const [hasRenderedFirstFrame, setHasRenderedFirstFrame]',
    );
    expect(reelItemSource).toContain('renderLoader={renderVideoLoader}');
    expect(reelItemSource).toContain('setHasRenderedFirstFrame(true)');
    expect(reelItemSource).toContain(
      'onBuffer={({ isBuffering: nextIsBuffering }) => {',
    );
    expect(reelItemSource).toContain('key={`${item.id}:${playerAttempt}`}');
  });

  it('never crops foreground video or its loading poster', () => {
    expect(reelItemSource).toContain(
      'const fullVideoRect = getContainedReelVideoRect(',
    );
    expect(reelItemSource).toContain(
      'const previewVideoRect = getContainedReelVideoRect(',
    );
    expect(reelItemSource).toContain('resizeMode="contain"');
    expect(reelItemSource).toContain('shutterColor="transparent"');
    expect(reelItemSource).toContain('Image.getSize(');
    expect(reelItemSource).not.toContain('getReelVideoFitMode');
  });

  it('pauses and unmounts reel players while the app is backgrounded', () => {
    expect(reelsScreenSource).toContain(
      "() => AppState.currentState === 'active'",
    );
    expect(reelsScreenSource).toContain(
      "const nextIsAppActive = nextState === 'active'",
    );
    expect(reelsScreenSource).toContain('setIsAppActive(nextIsAppActive)');
    expect(reelsScreenSource).toContain(
      'isFocusedScreen && isSelectedRoute && isAppActive',
    );
  });

  it('keeps the periodic latest-Reel probe stable across screen renders', () => {
    const probeSource = reelsScreenSource.slice(
      reelsScreenSource.indexOf('const checkForRemoteNewReels'),
      reelsScreenSource.indexOf(
        "return postCreatedEvents.subscribe(post => {",
      ),
    );

    expect(reelsScreenSource).toContain(
      'const peekLatestReels = vm.peekLatestReels;',
    );
    expect(probeSource).toContain('await peekLatestReels(');
    expect(probeSource).toContain(
      '[enqueueNewReelCandidates, peekLatestReels]',
    );
    expect(probeSource).not.toContain('await vm.peekLatestReels(');
    expect(probeSource).not.toContain('[enqueueNewReelCandidates, vm]');
  });

  it('bounds the pending new-Reels queue during long viewing sessions', () => {
    expect(reelsScreenSource).toContain(
      'const REELS_PENDING_NEW_ITEMS_LIMIT = 24;',
    );
    expect(reelsScreenSource).toContain(
      '.slice(0, REELS_PENDING_NEW_ITEMS_LIMIT);',
    );
    expect(reelsScreenSource).not.toContain(
      'pendingNewReelsRef.current.push(...nextItems);',
    );
  });

  it('keeps only the current tab player warm and paused on route blur', () => {
    expect(reelsScreenSource).not.toContain(
      'REELS_ACTIVE_PLAYER_MOUNT_DELAY_MS',
    );
    expect(reelsScreenSource).toContain('REELS_NEIGHBOR_PLAYER_MOUNT_DELAY_MS');
    expect(reelsScreenSource).toContain("Platform.OS === 'android' ? 1200 : 60");
    expect(reelsScreenSource).toContain('resolveReelPlayerRole({');
    expect(reelsScreenSource).toContain('playerRole={playerRole}');
    expect(reelsScreenSource).toContain(
      'const [hasActivatedPlayback, setHasActivatedPlayback] = useState(',
    );
    expect(reelsScreenSource).toContain('setHasActivatedPlayback(true)');
    expect(reelsScreenSource).toContain(
      'const keepCurrentPlayerMounted =',
    );
    expect(reelsScreenSource).toContain(
      'const hasPendingInitialTarget =',
    );
    expect(reelsScreenSource).toContain(
      'const isPlaybackTargetReady =\n    isPlaybackRouteFocused && !hasPendingInitialTarget;',
    );
    expect(reelsScreenSource).toContain(
      'const keepCurrentPlayerMounted =\n    !hasPendingInitialTarget &&',
    );
    expect(reelsScreenSource).toContain(
      'if (!isPlaybackTargetReady) {',
    );
    expect(reelsScreenSource).toContain('shouldRetainCurrentReelPlayer({');
    expect(reelsScreenSource).toContain('isMainTabsRootSelected,');
    expect(reelsScreenSource).toContain("addListener?.('state', syncRootSelection)");
    expect(reelsScreenSource).toContain('setHasActivatedPlayback(false)');
    expect(reelsScreenSource).toContain('keepCurrentPlayerMounted,');
    expect(reelsScreenSource).toContain(
      'allowPreviousPreload: isNeighborPreloadReady',
    );
    expect(reelsScreenSource).toContain('setIsNeighborPreloadReady(true)');
    expect(reelsScreenSource).toContain('setIsNeighborPreloadReady(false)');
    expect(reelsScreenSource).not.toContain('(isTabRoute || isPlaybackRouteFocused || isDismissing)');
    expect(feedScreenSource).toContain('startReelsPreload');
    expect(feedScreenSource).not.toContain('Image.prefetch(item.thumbnailUrl)');
    expect(reelsScreenSource).not.toContain('launchCoverUri');
    expect(reelItemSource).toContain('item.thumbnailUrl ? (');
    expect(reelItemSource).toContain('styles.videoLoadingCover');
    expect(homeVideoSource).toContain('FEED_VIDEO_BLUR_SURFACE_GRACE_MS');
    expect(homeVideoSource).toContain('isTransitionSurfaceGraceActive');
  });

  it('pauses before returning Home without tearing down the player mid-transition', () => {
    expect(reelsScreenSource).toContain('setIsDismissing(true)');
    expect(reelsScreenSource).toContain(
      'dismissNavigationFrameRef.current = requestAnimationFrame',
    );
    expect(reelsScreenSource).toContain(
      "BackHandler.addEventListener(\n        'hardwareBackPress'",
    );
    expect(reelsScreenSource).toContain('runOnJS(beginDismissTransition)()');
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
    expect(reelItemSource).toContain(
      'REEL_ANDROID_NEXT_PRELOAD_BUFFER_CONFIG',
    );
    expect(reelItemSource).toContain('bufferForPlaybackMs: 400');
    expect(reelItemSource).toContain('maxBufferMs: 3500');
    expect(reelItemSource).toContain('bufferForPlaybackMs: 250');
    expect(reelItemSource).toContain('cacheSizeMB: 64');
    expect(reelItemSource).toContain('minLoadRetryCount: 2');
    expect(reelItemSource).toContain(
      'resolveReelBufferModeForMount(playerRole)',
    );
    expect(reelItemSource).toContain(
      "const shouldMount = playerRole !== 'none'",
    );
    expect(reelItemSource).toContain('prev.playerRole === next.playerRole');
    expect(reelItemSource).toContain(
      'prev.initialSeekTime === next.initialSeekTime',
    );
  });

  it('does not rebuild the native player for reaction-only UI updates', () => {
    expect(reelItemSource).toContain('const videoPlayer = useMemo(() => {');
    expect(reelItemSource).toContain('const stableVideoFrame = useMemo(');
    expect(reelItemSource).toContain('{stableVideoFrame}');

    const playerMemoSource = reelItemSource.slice(
      reelItemSource.indexOf('const videoPlayer = useMemo(() => {'),
      reelItemSource.indexOf('// Each reel needs a unique SVG gradient ID'),
    );

    expect(playerMemoSource).toContain('paused={!playing}');
    expect(playerMemoSource).toContain('item.id,');
    expect(playerMemoSource).not.toContain('item.myReaction');
    expect(playerMemoSource).not.toContain('item.likeCount');
    expect(playerMemoSource).not.toContain('isPickerOpen');
  });

  it('records Reel player lifecycle, first-frame, buffering, and error metrics', () => {
    expect(reelItemSource).toContain('recordVideoPlayerMounted({');
    expect(reelItemSource).toContain('recordVideoPlayerUnmounted(');
    expect(reelItemSource).toContain('recordVideoLoadStart(');
    expect(reelItemSource).toContain('recordVideoFirstFrame(');
    expect(reelItemSource).toContain('recordVideoBufferState(');
    expect(reelItemSource).toContain('recordVideoError(');
  });
});
