const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Feed and profile list performance contracts', () => {
  const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
  const feedViewModelSource = read(
    'src/feed/application/view-models/useFeedViewModel.ts',
  );
  const profileSource = read(
    'src/profile/presentation/screens/ProfileScreen.tsx',
  );
  const deferredVisibleIdsSource = read(
    'src/feed/application/realtime/useDeferredVisiblePostIds.ts',
  );
  const fundingCarouselSource = read(
    'src/funding/presentation/components/FeedFundingCarousel.tsx',
  );

  it('keeps rich cards in a bounded render window without unsafe Android clipping', () => {
    expect(feedSource).toContain('FEED_SCREEN_HEIGHT * 1.0');
    expect(feedSource).toContain('Math.max(900');
    expect(feedSource).toContain('FEED_SCREEN_HEIGHT * 3.2');
    expect(feedSource).toContain(
      'const FEED_LIST_RECYCLE_POOL_SIZE = FEED_IS_ANDROID ? 10 : 28',
    );
    expect(feedSource).toContain('drawDistance={FEED_LIST_DRAW_DISTANCE}');
    expect(feedSource).toContain(
      'maxItemsInRecyclePool={FEED_LIST_RECYCLE_POOL_SIZE}',
    );
    expect(feedSource).toContain(
      'const FEED_LOAD_MORE_LOOKAHEAD_ITEMS = FEED_IS_ANDROID ? 8 : 10',
    );
    expect(feedSource).toContain('onEndReachedThreshold={0.6}');
    expect(feedSource).toContain('removeClippedSubviews={false}');
    expect(feedSource).not.toContain('FEED_SCREEN_HEIGHT * 6');

    expect(profileSource).toContain('SCREEN_HEIGHT * 1.8');
    expect(profileSource).toContain('SCREEN_HEIGHT * 3.2');
    expect(profileSource).toContain(
      'const PROFILE_POST_RECYCLE_POOL_SIZE = PROFILE_IS_ANDROID ? 10 : 22',
    );
    expect(profileSource).toContain('removeClippedSubviews={false}');
    expect(profileSource).not.toContain('SCREEN_HEIGHT * 5.5');
  });

  it('keeps the funding rail resident and staggers its Android card mounts', () => {
    expect(fundingCarouselSource).toContain(
      "const FUNDING_CAROUSEL_INITIAL_RENDER_COUNT = Platform.OS === 'android' ? 2 : 3;",
    );
    expect(fundingCarouselSource).toContain(
      "const FUNDING_CAROUSEL_BATCH_SIZE = Platform.OS === 'android' ? 1 : 3;",
    );
    expect(fundingCarouselSource).toContain(
      'initialNumToRender={FUNDING_CAROUSEL_INITIAL_RENDER_COUNT}',
    );
    expect(fundingCarouselSource).toContain(
      'maxToRenderPerBatch={FUNDING_CAROUSEL_BATCH_SIZE}',
    );
    expect(fundingCarouselSource).toContain("cache: 'force-cache'");
    expect(fundingCarouselSource).toContain('resizeMethod="resize"');
  });

  it('keeps native fling physics and loads profile posts before the tail is visible', () => {
    expect(feedSource).not.toContain('FEED_SCROLL_DECELERATION_RATE');
    expect(feedSource).not.toContain('decelerationRate=');
    expect(profileSource).not.toContain('PROFILE_SCROLL_DECELERATION_RATE');
    expect(profileSource).not.toContain('decelerationRate=');
    expect(profileSource).toContain(
      'PROFILE_POST_EARLY_LOAD_DISTANCE_MULTIPLIER',
    );
    expect(profileSource).toContain('PROFILE_POST_EARLY_LOAD_MIN_DISTANCE');
    expect(profileSource).toContain('onEndReachedThreshold={0.6}');
    expect(profileSource).not.toContain('onEndReachedThreshold={0.35}');
  });

  it('defers pagination work until momentum settles and limits each gesture', () => {
    expect(feedSource).toContain('feedLoadMoreDemandRef');
    expect(feedSource).toContain('loadMoreConsumedForGestureRef');
    expect(feedSource).toContain('flushPendingLoadMoreRef.current()');
    expect(feedSource).toContain('const LOAD_MORE_THROTTLE_MS = 1200');
    expect(feedViewModelSource).toContain('if (isScrollBusyRef.current) {');
    expect(feedSource).toContain(
      'feedLoadMoreDemand.latch(isFeedAllLoaded);',
    );
    expect(feedSource).toContain(
      'feedLoadMoreDemandRef.current?.resetGesture();',
    );
    expect(profileSource).toContain('pendingProfileLoadMoreRef');
    expect(profileSource).toContain('profileLoadMoreConsumedForGestureRef');
    expect(profileSource).toContain(
      'const PROFILE_LOAD_MORE_THROTTLE_MS = 1200',
    );
  });

  it('retries a deferred Home load-more signal when its first settled attempt is guarded', () => {
    const loadMoreStart = feedSource.indexOf(
      'const handleLoadMore = useCallback',
    );
    const loadMoreEnd = feedSource.indexOf(
      'flushPendingLoadMoreRef.current = flushPendingLoadMore',
      loadMoreStart,
    );
    const loadMoreSource = feedSource.slice(loadMoreStart, loadMoreEnd);

    expect(loadMoreStart).toBeGreaterThan(-1);
    expect(loadMoreEnd).toBeGreaterThan(loadMoreStart);
    expect(feedSource).toContain('createFeedLoadMoreDemandController');
    expect(loadMoreSource).toContain(
      '!feedLoadMoreDemand.isConsumed()',
    );
    expect(loadMoreSource).toContain(
      '!loadMoreConsumedForGestureRef.current',
    );
    expect(loadMoreSource).toContain('schedulePendingFeedLoadMoreRetry(');
    expect(loadMoreSource).toContain(
      'feedLoadMoreDemand.clearIfTerminal(isFeedAllLoaded)',
    );
    expect(loadMoreSource).toContain(
      '!feedLoadMoreDemand.isRequestInFlight()',
    );
    expect(loadMoreSource).toContain(
      'const feedRequestToken = feedLoadMoreDemand.beginRequest();',
    );
    expect(loadMoreSource).toContain('const feedRequestAccepted =');
    expect(loadMoreSource).toContain('requestLoadMorePosts(');
    expect(loadMoreSource).toContain('if (feedRequestAccepted) {');
    expect(loadMoreSource).toContain(
      "feedLoadMoreOutcome === 'appended' ||",
    );
    expect(loadMoreSource).toContain(
      "feedLoadMoreOutcome === 'terminal'",
    );
    expect(loadMoreSource).toContain(
      'latestDemand.completeRequest(feedRequestToken);',
    );
    expect(loadMoreSource).toContain(
      'latestDemand.retryRequest(feedRequestToken)',
    );
    expect(feedSource).toContain('feedViewportNearTailRef');
    expect(feedSource).toContain(
      'feedLoadMoreDemandRef.current?.leaveTail();',
    );
    expect(loadMoreSource).toContain(
      '!feedViewportNearTailRef.current',
    );
    expect(loadMoreSource).toContain(
      'latestDemand.getRetryDelay(',
    );
    expect(feedSource).toContain(
      'const FEED_LOAD_MORE_MAX_RETRY_DELAY_MS = 1920',
    );
  });

  it('pauses hidden retries and resumes pending Home demand on focus', () => {
    const focusStart = feedSource.indexOf('useFocusEffect(');
    const focusEnd = feedSource.indexOf('const isFocused = useIsFocused()', focusStart);
    const focusSource = feedSource.slice(focusStart, focusEnd);
    const loadMoreStart = feedSource.indexOf(
      'const handleLoadMore = useCallback',
    );
    const loadMoreEnd = feedSource.indexOf(
      'const flushPendingLoadMore = useCallback',
      loadMoreStart,
    );
    const loadMoreSource = feedSource.slice(loadMoreStart, loadMoreEnd);

    expect(focusStart).toBeGreaterThan(-1);
    expect(focusEnd).toBeGreaterThan(focusStart);
    expect(focusSource).toContain('feedLoadMoreDemandRef.current?.suspend();');
    expect(focusSource).toContain('isScrollingRef.current = false;');
    expect(focusSource).toContain('isMomentumScrollingRef.current = false;');
    expect(focusSource).toContain('resetFeedScrollBusy();');
    expect(focusSource).toContain(
      'schedulePendingFeedLoadMoreRetry(FEED_FOCUS_LOAD_MORE_RETRY_DELAY_MS);',
    );
    expect(loadMoreSource).toContain(
      '!isFeedTabFocusedRef.current || !isFeedAppActiveRef.current',
    );
  });

  it('resets Home tail demand before a new feed generation starts', () => {
    const reloadStart = feedSource.indexOf(
      'const reloadFeedPosts = useCallback',
    );
    const reloadEnd = feedSource.indexOf(
      'const peekLatestFeedPosts',
      reloadStart,
    );
    const sourceStart = feedSource.indexOf(
      'const setActiveFeedSource = useCallback',
    );
    const sourceEnd = feedSource.indexOf(
      'useEffect(() => {',
      sourceStart,
    );
    const scopeStart = feedSource.indexOf(
      'const scopedOffset =',
    );
    const scopeEffectStart = feedSource.lastIndexOf(
      'useEffect(() => {',
      scopeStart,
    );
    const scopeEnd = feedSource.indexOf(
      'const targetOffset = pendingFeedScrollRestoreOffsetRef.current;',
      scopeStart,
    );

    expect(reloadStart).toBeGreaterThan(-1);
    expect(reloadEnd).toBeGreaterThan(reloadStart);
    expect(feedSource.slice(reloadStart, reloadEnd)).toMatch(
      /resetFeedLoadMoreDemandForGeneration\(\);[\s\S]*reloadFeedPostsRequest\(isPullToRefresh\)/,
    );
    expect(sourceStart).toBeGreaterThan(-1);
    expect(sourceEnd).toBeGreaterThan(sourceStart);
    expect(feedSource.slice(sourceStart, sourceEnd)).toMatch(
      /currentApiSource !== nextApiSource[\s\S]*resetFeedLoadMoreDemandForGeneration\(\);[\s\S]*setFeedSourceRequest\(nextSource\)/,
    );
    expect(scopeStart).toBeGreaterThan(-1);
    expect(scopeEffectStart).toBeGreaterThan(-1);
    expect(scopeEnd).toBeGreaterThan(scopeStart);
    expect(feedSource.slice(scopeEffectStart, scopeEnd)).toContain(
      'resetFeedLoadMoreDemandForGeneration();',
    );
  });

  it('settles visible post ids before rebuilding realtime scopes while scrolling', () => {
    expect(feedSource).toContain('useDeferredVisiblePostIds()');
    expect(profileSource).toContain('useDeferredVisiblePostIds()');
    expect(feedSource).toContain(
      'scheduleRealtimeVisiblePostIds(visiblePostIds)',
    );
    expect(profileSource).toContain(
      'scheduleRealtimeVisiblePostIds(visiblePostIds)',
    );
    expect(deferredVisibleIdsSource).toContain(
      'DEFAULT_VISIBLE_POST_SETTLE_MS = 180',
    );
    expect(deferredVisibleIdsSource).toContain('MAX_VISIBLE_POST_IDS = 8');
    expect(deferredVisibleIdsSource).toContain(
      'clearTimeout(settleTimerRef.current)',
    );
  });

  it('uses constant-time post index lookup for profile viewability work', () => {
    expect(profileSource).toContain('profilePostIndexByIdRef');
    expect(profileSource).toContain(
      'profilePostIndexByIdRef.current.get(String(viewedPost.id))',
    );
    expect(profileSource).not.toContain(
      'currentPosts.findIndex(post => post.id === viewedPost.id)',
    );
  });

  it('lets the profile prefetch queue own the prefetched marker', () => {
    const initialPrefetchStart = profileSource.indexOf(
      'const urlsToPrefetch: string[] = [];',
      profileSource.indexOf('if (filteredProfilePosts.length === 0) return;'),
    );
    const initialPrefetchEnd = profileSource.indexOf(
      'queueProfileMediaPrefetch(urlsToPrefetch);',
      initialPrefetchStart,
    );
    const initialPrefetchSource = profileSource.slice(
      initialPrefetchStart,
      initialPrefetchEnd,
    );

    expect(initialPrefetchStart).toBeGreaterThan(-1);
    expect(initialPrefetchEnd).toBeGreaterThan(initialPrefetchStart);
    expect(initialPrefetchSource).not.toContain(
      'profilePrefetchedMediaUrlsRef.current.add(url);',
    );
  });

  it('keeps frequently passed list elements and configuration references stable', () => {
    expect(feedSource).toContain('const feedRefreshControl = useMemo(');
    expect(feedSource).toContain('const feedListEmptyComponent = useMemo(');
    expect(profileSource).toContain(
      'const profilePostsEmptyComponent = useMemo(',
    );
    expect(profileSource).toContain(
      'PROFILE_POST_MAINTAIN_VISIBLE_CONTENT_POSITION',
    );
    expect(profileSource).toContain('reuseStableItemsById(');
    expect(profileSource).toContain('deferMediaUntilVisible');
  });

  it('does not let background tail updates move the visible Home feed row', () => {
    expect(feedSource).toContain(
      'const FEED_LIST_MAINTAIN_VISIBLE_CONTENT_POSITION = {',
    );
    expect(feedSource).toContain('disabled: true,');
    expect(feedSource).toContain('preserveExistingOrder: preserveDeepFeedOrder');
    expect(feedSource).toContain('const preserveDeepFeedOrder =');
  });

  it('scopes and reapplies the retained Feed offset with the persisted session identity', () => {
    expect(feedSource).toContain(
      'userVm.user?.userId ?? sessionStorage.getSession()?.userId',
    );
    expect(feedSource).toContain('retainedFeedScrollState?.scopeKey === feedScrollScopeKey');
    expect(feedSource).toContain('pendingFeedScrollRestoreOffsetRef.current = restoredScrollY');
    expect(feedSource).toContain('mainFeedListRef.current.scrollToOffset({');
    expect(feedSource).toContain(
      'const markFeedScrolledSinceLoad = vm.markFeedScrolledSinceLoad',
    );
    expect(feedSource).toContain('markFeedScrolledSinceLoad();');
    expect(feedViewModelSource).toContain('markFeedScrolledSinceLoad,');
  });

  it('commits one ready page per fling update and keeps the tail runway stable', () => {
    expect(feedViewModelSource).not.toContain('SCROLL_REVEAL_BATCH_SIZE');
    expect(feedViewModelSource).toContain('policy.revealBatchSize,');

    const footerStart = feedSource.indexOf(
      'const ListFooterComponent = useMemo',
    );
    const footerEnd = feedSource.indexOf(
      '// â”€â”€ Photo viewer state',
      footerStart,
    );
    const footerSource = feedSource.slice(footerStart, footerEnd);

    expect(footerSource).toContain('FEED_LOAD_MORE_FOOTER_STYLE');
    expect(footerSource).toContain('isFeedLoadingMore ?');
    expect(footerSource).toContain('<ActivityIndicator');
    expect(footerSource).not.toContain('<PostSkeleton');
    expect(footerSource).toContain('hasFeedContent,');
    expect(footerSource).toContain('isFeedAllLoaded,');
    expect(footerSource).toContain('isFeedLoadingMore,');
    expect(footerSource).toContain('vm.error,');
  });
});
