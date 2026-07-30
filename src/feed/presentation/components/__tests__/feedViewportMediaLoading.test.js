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
    expect(postCardsSource).toContain(
      'const mediaEnabled = !deferMediaUntilVisible || trackedMediaVisible;',
    );
    expect(feedScreenSource).toContain('decelerationRate="normal"');
  });

  it('keeps both completed and in-flight images mounted across recycling', () => {
    const mediaImageSource = read(
      'src/feed/presentation/components/FeedMediaImage.tsx',
    );

    expect(mediaImageSource).toContain('const retained = useFeedMediaRetained(uri);');
    expect(mediaImageSource).toContain(
      'const shouldMountImage = enabled || retained;',
    );
    expect(mediaImageSource).toContain('markFeedMediaRequested(uri);');
    expect(mediaImageSource).toContain("cache: 'force-cache'");
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
    expect(feedScreenSource).toContain('markFeedMediaLoaded(url);');
  });
});
