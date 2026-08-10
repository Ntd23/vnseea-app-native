const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Home feed video autoplay safety', () => {
  it('does not activate the first feed video before it is viewable', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );

    expect(feedScreenSource).not.toContain(
      'Autoplay the first video on mount / load',
    );
    expect(feedScreenSource).not.toContain(
      "feedPosts.find(p => p.kind === 'video')",
    );
  });

  it('waits for the tab transition before reactivating feed video playback', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const focusLifecycleSource = feedScreenSource.slice(
      feedScreenSource.indexOf('const isFocused = useIsFocused();'),
      feedScreenSource.indexOf(
        '// Subscribe to posts created by the current user',
      ),
    );

    expect(focusLifecycleSource).toContain(
      'const mediaActivationTask = InteractionManager.runAfterInteractions',
    );
    expect(focusLifecycleSource).toContain(
      'measureActiveFeedVideoOnScreen(true);',
    );
    expect(focusLifecycleSource).toContain(
      'publishStableFeedVisibleMediaPostIds(visibleMediaPostIds);',
    );
    expect(focusLifecycleSource).toContain(
      'return () => mediaActivationTask.cancel();',
    );
  });

  it('keeps the current Feed surface through a quick tab return', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain(
      'const isTransitionSurfaceGraceActive =',
    );
    expect(postCardsSource).toContain(
      '!isOpeningReels &&\n    (keepPlayerSurfaceMounted ||\n      (!isPlaybackSurfaceFocused && wasPlayerSurfaceMountedRef.current))',
    );
    expect(postCardsSource).toContain(
      'if (!isPlaybackSurfaceFocused || !keepPlayerSurfaceMounted)',
    );
    expect(postCardsSource).toContain(
      'if (shouldMountFocusedVideo) {\n      setKeepPlayerSurfaceMounted(false);',
    );
  });

  it('releases a tapped Feed video before opening the persistent Reels tab', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain(
      'const [isOpeningReels, setIsOpeningReels] = useState(false);',
    );
    expect(postCardsSource).toContain(
      'const shouldMountFocusedVideo =\n    !isOpeningReels &&',
    );
    expect(postCardsSource).toContain(
      'const isTransitionSurfaceGraceActive =\n    !isOpeningReels &&',
    );
    expect(postCardsSource).toContain(
      'openingReelsFrameRef.current = requestAnimationFrame(() => {',
    );
  });

  it('updates video focus without invalidating every visible Feed row', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );
    const listExtraDataSource = feedScreenSource.slice(
      feedScreenSource.indexOf('const feedListExtraData = useMemo('),
      feedScreenSource.indexOf('const androidListHeaderComponent = useMemo('),
    );

    expect(postCardsSource).toContain(
      'export function publishFeedScreenFocused(isFocused: boolean)',
    );
    expect(postCardsSource).toContain(
      "const feedSurfaceFocused = useFeedScreenFocused(\n    performanceSurface === 'feed',\n  );",
    );
    expect(feedScreenSource).toContain(
      'publishFeedScreenFocused(isPlaybackSurfaceFocused);',
    );
    expect(feedScreenSource).not.toContain(
      'isScreenFocused={isFeedTabFocused}',
    );
    expect(listExtraDataSource).not.toContain('isFeedTabFocused,');
  });

  it('cannot restore Feed video ownership after blur or app background', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const measurementSource = feedScreenSource.slice(
      feedScreenSource.indexOf(
        'const measureActiveFeedVideoOnScreen = useCallback',
      ),
      feedScreenSource.indexOf(
        'const handleFeedViewportLayout = useCallback',
      ),
    );
    const focusLifecycleSource = feedScreenSource.slice(
      feedScreenSource.indexOf('const isFocused = useIsFocused();'),
      feedScreenSource.indexOf(
        '// Subscribe to posts created by the current user',
      ),
    );

    expect(measurementSource).toContain(
      'if (!isFeedPlaybackSurfaceFocusedRef.current) return;',
    );
    expect(measurementSource).toContain(
      '!isFeedPlaybackSurfaceFocusedRef.current',
    );
    expect(focusLifecycleSource).toContain(
      'const isPlaybackSurfaceFocused = resolvePlaybackSurfaceFocused({',
    );
    expect(focusLifecycleSource).toContain(
      'feedMeasureRequestRef.current += 1;',
    );
    expect(focusLifecycleSource).toContain(
      'feedMeasureInFlightRef.current = false;',
    );
  });

  it('uses real route focus for reusable video cards outside Home', () => {
    const postDetailSource = read(
      'src/feed/presentation/screens/PostDetailScreen.tsx',
    );
    const eventDetailSource = read(
      'src/events/presentation/screens/EventDetailScreen.tsx',
    );
    const groupDetailSource = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );
    const popularSource = read(
      'src/popular/presentation/screens/PopularScreen.tsx',
    );

    expect(postDetailSource).toContain('isScreenFocused={isFocused}');
    expect(postDetailSource).toContain('isActive={isFocused}');
    expect(postDetailSource).not.toContain('isScreenFocused={true}');
    expect(eventDetailSource).toContain('isScreenFocused={isFocused}');
    expect(groupDetailSource).toContain('isScreenFocused={isFocused}');
    expect(popularSource).toContain('const isFocused = useIsFocused();');
    expect(popularSource).toContain('isScreenFocused={isFocused}');
  });

  it('uses media-surface measurement with a 60 percent autoplay threshold', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );

    expect(feedScreenSource).toContain(
      'const FEED_VIDEO_VIEWABLE_PERCENT = 60;',
    );
    expect(feedScreenSource).toContain('viewabilityConfigCallbackPairs={');
    expect(feedScreenSource).toContain(
      'mediaSurfaceRef={setFeedVideoRef}',
    );
    expect(feedScreenSource).toContain(
      'allEntries.length > FEED_SCROLL_VIDEO_MEASUREMENT_MAX_COUNT',
    );
  });

  it('uses shared audio state with feed videos unmuted by default', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain(
      'export let feedVideoMutedSnapshot = false',
    );
    expect(postCardsSource).toContain('function useFeedVideoMuted()');
    expect(postCardsSource).toContain('publishFeedVideoMuted(!muted)');
    expect(postCardsSource).toContain(
      'const isScrollBusy = useFeedScrollBusy();',
    );
    expect(postCardsSource).toContain('const canMountWarmVideo =');
    expect(postCardsSource).toContain('shouldMountWarmFeedVideo({');
    expect(postCardsSource).toContain(
      'optimizationEnabled: isClientUiOptimizationEnabled()',
    );
    expect(feedScreenSource).toContain(
      'FEED_VIDEO_PLAYBACK_POLICY.warmAheadItems;',
    );
    expect(feedScreenSource).toContain(
      'FEED_VIDEO_PLAYBACK_POLICY.scrollingWarmMaxCount;',
    );
    expect(postCardsSource).not.toContain('(isActive || warmPlaying)');
    expect(postCardsSource).toContain(
      'muted={muted || !isActive || !hasRenderedFrame}',
    );
    expect(postCardsSource).not.toContain(
      '(isActive ? !isScrollBusy : warmPlaying)',
    );
    expect(postCardsSource).not.toContain('setMuted(false)');
    expect(postCardsSource).not.toContain('setMuted(true)');
    expect(postCardsSource).not.toContain(
      'const [muted, setMuted] = useState(',
    );
  });

  it('keeps the poster visible until the first real video frame is ready', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain(
      'const mediaIdentity = `${post.id}:${videoUrl}`;',
    );
    expect(postCardsSource).toContain(
      'if (mediaIdentity !== mediaIdentityRef.current) return;',
    );
    expect(postCardsSource).toContain(
      'onReadyForDisplay={handleVideoReadyForDisplay}',
    );
    expect(postCardsSource).toContain(
      '!hasRenderedFrame ? { opacity: 0 } : null',
    );
    expect(postCardsSource).toContain('frameCoverOpacity.value = withTiming(');
    expect(postCardsSource).toContain(
      'runOnJS(hideFrameCoverForMedia)(mediaIdentity)',
    );
    expect(postCardsSource).toContain(
      'style={[StyleSheet.absoluteFill, frameCoverAnimatedStyle]}',
    );
  });

  it('uses one unblurred poster layer for contained Android feed videos', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );
    const feedMediaImageSource = read(
      'src/feed/presentation/components/FeedMediaImage.tsx',
    );

    expect(postCardsSource).toContain('const FeedVideoBackdrop = React.memo');
    expect(postCardsSource).toContain(
      'blurRadius={blurred ? FEED_VIDEO_BACKDROP_BLUR_RADIUS : undefined}',
    );
    expect(postCardsSource).toContain('styles.feedVideoBlurredBackdropScrim');
    expect(postCardsSource).toContain(
      "shouldMountVideo && Platform.OS !== 'android'",
    );
    expect(postCardsSource).toContain('blurred={shouldBlurVideoBackdrop}');
    expect(postCardsSource).toContain(
      "resolvedThumbnailUrl && isFrameCoverVisible && Platform.OS !== 'android'",
    );
    expect(postCardsSource).toContain('resizeMode="contain"');
    expect(feedMediaImageSource).toContain(
      "blurRadius?: ImageProps['blurRadius'];",
    );
    expect(feedMediaImageSource).toContain('blurRadius={blurRadius}');
  });

  it('uses SurfaceView for Android feed playback compatibility', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain('useTextureView={false}');
    expect(postCardsSource).toContain('shutterColor="transparent"');
  });

  it('records feed player lifecycle, first-frame, buffering, and error metrics', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain('recordVideoPlayerMounted({');
    expect(postCardsSource).toContain('recordVideoPlayerUnmounted(');
    expect(postCardsSource).toContain('recordVideoLoadStart(');
    expect(postCardsSource).toContain('recordVideoFirstFrame(');
    expect(postCardsSource).toContain('recordVideoBufferState(');
    expect(postCardsSource).toContain('recordVideoError(');
  });
});
