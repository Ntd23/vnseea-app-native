const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Home feed retained media loading', () => {
  it('loads visible cards during a fling without enabling every recycled row', () => {
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
    expect(feedScreenSource).toContain(
      'decelerationRate={FEED_SCROLL_DECELERATION_RATE}',
    );
  });

  it('keeps only completed images mounted across short recycling loops', () => {
    const mediaImageSource = read(
      'src/feed/presentation/components/FeedMediaImage.tsx',
    );

    expect(mediaImageSource).toContain('const loaded = useFeedMediaLoaded(uri);');
    expect(mediaImageSource).toContain(
      'const shouldMountImage = enabled || loaded;',
    );
    expect(mediaImageSource).not.toContain('markFeedMediaRequested(uri);');
    expect(mediaImageSource).toContain(
      "retryAttempt > 0 ? 'reload' : 'force-cache'",
    );
    expect(mediaImageSource).toContain('releaseFeedMedia(uri);');
    expect(mediaImageSource).toContain('onError={handleLoadError}');
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
    expect(feedScreenSource).toContain('markFeedMediaLoaded(url);');
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
    expect(singleImageSource).toContain('Image.getSize(');
    expect(singleImageSource).not.toContain(
      'InteractionManager.runAfterInteractions',
    );
  });
});
