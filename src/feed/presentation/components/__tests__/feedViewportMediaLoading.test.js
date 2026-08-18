const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Home feed retained media loading', () => {
  it('publishes newly visible media while a fling is still moving', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(feedScreenSource).toContain('publishFeedVisibleMediaPostIds(');
    expect(feedScreenSource).toContain('deferMediaUntilVisible');
    expect(feedScreenSource).toContain('loadMedia={mediaVisible}');
    expect(feedScreenSource).toContain('FEED_MEDIA_MOUNT_AHEAD_ITEMS');
    expect(feedScreenSource).toContain("item.post.kind === 'text'");
    expect(postCardsSource).toContain(
      'const mediaEnabled = !deferMediaUntilVisible || trackedMediaVisible;',
    );
    expect(feedScreenSource).not.toContain('FEED_SCROLL_DECELERATION_RATE');
    expect(feedScreenSource).not.toContain('decelerationRate=');
    const visibleCallbackSource = feedScreenSource.slice(
      feedScreenSource.indexOf('const onVisibleFeedItemsChanged = useCallback'),
      feedScreenSource.indexOf('const onViewableItemsChanged = useCallback'),
    );
    const mediaPublishIndex = visibleCallbackSource.indexOf(
      'publishStableFeedVisibleMediaPostIds(',
    );
    const scrollBusyGuardIndex = visibleCallbackSource.indexOf(
      'if (isScrollingRef.current) return;',
    );

    expect(mediaPublishIndex).toBeGreaterThan(-1);
    expect(scrollBusyGuardIndex).toBeGreaterThan(mediaPublishIndex);
  });

  it('warms the nearest Android video or ad media before it enters the viewport', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const visibleCallbackSource = feedScreenSource.slice(
      feedScreenSource.indexOf('const onVisibleFeedItemsChanged = useCallback'),
      feedScreenSource.indexOf('const onViewableItemsChanged = useCallback'),
    );

    expect(feedScreenSource).toContain(
      'const FEED_MEDIA_MOUNT_AHEAD_ITEMS = FEED_IS_ANDROID ? 1 : 3;',
    );
    expect(visibleCallbackSource).toContain(
      'furthestVisibleIndex + FEED_MEDIA_MOUNT_AHEAD_ITEMS + 1',
    );
    expect(visibleCallbackSource).toContain(
      'for (let index = startIndex; index < endIndex; index += 1)',
    );
    expect(visibleCallbackSource).toContain("item.post.kind === 'text'");
    expect(visibleCallbackSource).toContain("item.post.kind === 'video'");
    expect(visibleCallbackSource).toContain("item.post.kind === 'ad'");
  });

  it('keeps a loaded image mounted after it leaves the active viewport', () => {
    const mediaImageSource = read(
      'src/feed/presentation/components/FeedMediaImage.tsx',
    );

    expect(mediaImageSource).toContain(
      'const [loadedUri, setLoadedUri] = useState<string | null>(null);',
    );
    expect(mediaImageSource).toContain(
      'const shouldMountImage = enabled || loadedUri === uri;',
    );
    expect(mediaImageSource).toContain('setLoadedUri(uri);');
    expect(mediaImageSource).toContain('setLoadedUri(null);');
    expect(mediaImageSource).not.toContain('layoutReadyUri');
    expect(mediaImageSource).toContain('if (!shouldMountImage)');
    expect(mediaImageSource).not.toContain('handleLayoutReady');
    expect(mediaImageSource).not.toContain('markFeedMediaRequested(uri);');
    expect(mediaImageSource).toContain(
      "retryAttempt > 0 ? 'reload' : 'force-cache'",
    );
    expect(mediaImageSource).toContain('releaseFeedMedia(uri);');
    expect(mediaImageSource).toContain('onLoad={handleLoad}');
    expect(mediaImageSource).toContain('onError={handleLoadError}');
  });

  it('staggers cold Android photo-grid mounts without delaying single images', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );
    const photoGridStart = postCardsSource.indexOf('displayedPhotos.map');
    const photoGridEnd = postCardsSource.indexOf(
      '</FeedMediaFrame>',
      photoGridStart,
    );
    const photoGridSource = postCardsSource.slice(photoGridStart, photoGridEnd);
    const singleImageStart = postCardsSource.indexOf(
      'const SinglePostImage = React.memo',
    );
    const singleImageEnd = postCardsSource.indexOf(
      'function areScalarArraysEqual',
      singleImageStart,
    );
    const singleImageSource = postCardsSource.slice(
      singleImageStart,
      singleImageEnd,
    );

    const staggeredImageSource = read(
      'src/feed/presentation/components/StaggeredFeedMediaImage.tsx',
    );

    expect(staggeredImageSource).toContain(
      'export const PHOTO_GRID_IMAGE_STAGGER_MS = 48;',
    );
    expect(staggeredImageSource).toContain('mountOrder * staggerMs');
    expect(staggeredImageSource).toContain('clearTimeout(timer)');
    expect(photoGridSource).toContain('<StaggeredFeedMediaImage');
    expect(photoGridSource).toContain('mountOrder={index}');
    expect(photoGridSource).toContain("Platform.OS === 'android'");
    expect(photoGridSource).toContain('deferMediaUntilVisible');
    expect(singleImageSource).not.toContain('<StaggeredFeedMediaImage');
  });

  it('avoids progressive Android bitmap uploads while fast-scrolling', () => {
    const mediaImageSource = read(
      'src/feed/presentation/components/FeedMediaImage.tsx',
    );

    expect(mediaImageSource).not.toContain('progressiveRenderingEnabled');
  });

  it('downsamples every remote image rendered by the Home feed chrome', () => {
    const homeIntroSource = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );
    const composerSource = read(
      'src/feed/presentation/components/ComposerCard.tsx',
    );
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const iosHomeIntroSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(homeIntroSource).not.toContain('<Image');
    expect(homeIntroSource.match(/<FeedMediaImage/g)).toHaveLength(5);
    expect(composerSource.slice(
      composerSource.indexOf('const Avatar = React.memo'),
      composerSource.indexOf('export function ComposerCard'),
    )).toContain('<FeedMediaImage');
    expect(postCardsSource.slice(
      postCardsSource.indexOf('const Avatar = React.memo'),
      postCardsSource.indexOf('const FeedVideoBackdrop'),
    )).toContain('<FeedMediaImage');
    expect(feedScreenSource.match(/<FeedMediaImage/g)?.length).toBeGreaterThanOrEqual(6);
    expect(iosHomeIntroSource.match(/resizeMethod="resize"/g)).toHaveLength(4);
  });

  it('downsamples remote images that still use the native Image component in feed rows', () => {
    const sharedPreviewSource = read(
      'src/feed/presentation/components/SharedPostPreviewCard.tsx',
    );
    const groupIdentitySource = read(
      'src/feed/presentation/components/GroupPostIdentityHeader.tsx',
    );
    const pagePreviewSource = read(
      'src/feed/presentation/components/VnseeaPageLinkPreviewCard.tsx',
    );
    const commerceSource = read(
      'src/feed/presentation/components/FeedCommercePostCards.tsx',
    );
    const livePostSource = read(
      'src/feed/presentation/components/LiveStreamPostCard.tsx',
    );
    const pollPostSource = read(
      'src/feed/presentation/components/PollPostCard.tsx',
    );
    const productPostSource = read(
      'src/product/presentation/components/ProductPostCard.tsx',
    );
    const eventPostSource = read(
      'src/events/presentation/components/EventPostCard.tsx',
    );
    const inlineLiveSource = read(
      'src/live/presentation/components/InlineLiveStreamPlayer.tsx',
    );

    expect(sharedPreviewSource.match(/resizeMethod="resize"/g)).toHaveLength(4);
    expect(groupIdentitySource.match(/resizeMethod="resize"/g)).toHaveLength(2);
    expect(pagePreviewSource.match(/resizeMethod="resize"/g)).toHaveLength(2);
    expect(commerceSource.match(/resizeMethod="resize"/g)).toHaveLength(1);
    expect(livePostSource.match(/resizeMethod="resize"/g)).toHaveLength(1);
    expect(pollPostSource.match(/resizeMethod="resize"/g)).toHaveLength(2);
    expect(productPostSource.match(/resizeMethod="resize"/g)).toHaveLength(3);
    expect(eventPostSource.match(/resizeMethod="resize"/g)).toHaveLength(2);
    expect(inlineLiveSource.match(/resizeMethod="resize"/g)).toHaveLength(1);
  });

  it('keeps a bounded directional lookahead queue alive while scrolling', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const beginScrollStart = feedScreenSource.indexOf(
      'const beginScrollPause = useCallback',
    );
    const beginScrollEnd = feedScreenSource.indexOf(
      'const endScrollPause = useCallback',
      beginScrollStart,
    );
    const beginScrollSource = feedScreenSource.slice(
      beginScrollStart,
      beginScrollEnd,
    );

    expect(beginScrollSource).not.toContain(
      'pendingImagePrefetchUrlsRef.current = [];',
    );
    expect(beginScrollSource).not.toContain(
      'pendingVideoPosterPostsRef.current = [];',
    );
    expect(beginScrollSource).toContain(
      'clearTimeout(visibleMediaRetentionTimerRef.current);',
    );
    expect(beginScrollSource).toContain(
      'visibleMediaRetentionDeadlineAtRef.current = null;',
    );
    expect(feedScreenSource).toContain('FEED_IMAGE_PREFETCH_AHEAD_ITEMS');
    expect(feedScreenSource).toContain(
      'FEED_SCROLLING_IMAGE_PREFETCH_AHEAD_ITEMS',
    );
    expect(feedScreenSource).toContain('MAX_PENDING_IMAGE_PREFETCH_URLS');
    expect(feedScreenSource).toContain(
      'MAX_REMEMBERED_IMAGE_PREFETCH_URLS',
    );
    expect(feedScreenSource).toContain('rememberBoundedFeedCacheKey(');
    expect(feedScreenSource).toContain(
      'const IMAGE_PREFETCH_MAX_CONCURRENCY = FEED_IS_ANDROID ? 1 : 3;',
    );
    expect(feedScreenSource).not.toContain('markFeedMediaLoaded(url);');
  });

  it('debounces expensive settle work across repeated Android flings', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const dragStartSource = feedScreenSource.slice(
      feedScreenSource.indexOf('const handleScrollBeginDrag = useCallback'),
      feedScreenSource.indexOf('const handleMomentumScrollBegin = useCallback'),
    );
    const momentumEndStart = feedScreenSource.indexOf(
      'const handleMomentumScrollEnd = useCallback',
    );
    const dragEndStart = feedScreenSource.indexOf(
      'const handleScrollEndDrag = useCallback',
    );
    const dragEndSource = feedScreenSource.slice(
      dragEndStart,
      momentumEndStart,
    );
    const momentumEndSource = feedScreenSource.slice(
      momentumEndStart,
      feedScreenSource.indexOf('useEffect(() => {', momentumEndStart),
    );

    expect(feedScreenSource).toContain(
      'const FEED_SCROLL_SETTLE_DELAY_MS = FEED_IS_ANDROID ? 180 : 80;',
    );
    expect(dragStartSource).toContain(
      'clearTimeout(scrollEndTimeoutRef.current)',
    );
    expect(momentumEndSource).toContain('setTimeout(() => {');
    expect(momentumEndSource).toContain('endScrollPause();');
    expect(momentumEndSource).toContain('flushPendingLoadMoreRef.current();');
    expect(momentumEndSource).toContain('FEED_SCROLL_SETTLE_DELAY_MS');
    expect(dragEndSource).not.toContain('velocityY < 0.05');
    expect(dragEndSource).toContain('setTimeout(() => {');
    expect(dragEndSource).toContain(
      'if (isMomentumScrollingRef.current) return;',
    );
    expect(dragEndSource).toContain('endScrollPause();');
    expect(dragEndSource).toContain('flushPendingLoadMoreRef.current();');
    expect(dragEndSource).toContain('FEED_SCROLL_SETTLE_DELAY_MS');
  });

  it('discovers single-photo geometry without a scroll-idle rerender burst', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );
    const singleImageStart = postCardsSource.indexOf(
      'const SinglePostImage = React.memo',
    );
    const singleImageEnd = postCardsSource.indexOf(
      '// â”€â”€ TextPostCard',
      singleImageStart,
    );
    const singleImageSource = postCardsSource.slice(
      singleImageStart,
      singleImageEnd,
    );

    expect(feedScreenSource).toContain(
      'const FEED_MEDIA_MOUNT_AHEAD_ITEMS = FEED_IS_ANDROID ? 1 : 3;',
    );
    expect(singleImageSource).not.toContain('useFeedScrollBusy()');
    expect(singleImageSource).toContain(
      "if (Platform.OS === 'android') return undefined;",
    );
    expect(singleImageSource).toContain('Image.getSize(');
    expect(singleImageSource).not.toContain(
      'InteractionManager.runAfterInteractions',
    );
  });
});
