const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Android Feed header top safe-area ownership', () => {
  const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
  const headerSource = read('src/feed/presentation/components/FeedHeader.tsx');
  const safeHeaderSource = read(
    'src/feed/presentation/components/SafeAreaFeedHeader.tsx',
  );
  const insetSource = read(
    'src/feed/presentation/components/feedHeaderInsets.ts',
  );

  it('positions Android Feed chrome below the status bar with the runtime inset', () => {
    expect(insetSource).not.toContain('StatusBar.currentHeight');
    expect(insetSource).toContain("if (Platform.OS === 'android')");
    expect(insetSource).toContain('return runtimeTopInset');
    expect(insetSource).not.toContain(
      "if (Platform.OS === 'android') {\n    return 0;",
    );
    expect(headerSource).toContain('includeTopSafeArea = false');
    expect(headerSource).toMatch(
      /const topInset = includeTopSafeArea\s*\?\s*resolveFeedChromeTopInset\(/,
    );
    expect(headerSource).toContain(
      '{ height: topInset + HEADER_BAR_HEIGHT, paddingTop: topInset }',
    );
    expect(feedSource).not.toContain(
      'function getFeedChromeTopInset(rawTopInset: number)',
    );
    expect(feedSource).not.toContain('return FEED_IS_ANDROID ? 0 : rawTopInset');
    expect(feedSource).toContain('const topInset = rawTopInset');
    expect(feedSource).toContain('<FeedHeader />');
    expect(feedSource).not.toContain('<FeedHeader includeTopSafeArea />');
  });

  it('does not apply the inset twice on stack screens', () => {
    expect(safeHeaderSource).toContain("edges={['top']}");
    expect(safeHeaderSource).toContain('<FeedHeader />');
    expect(safeHeaderSource).not.toContain('includeTopSafeArea');
  });

  it('lets the Android Feed overlay own the top inset exactly once', () => {
    expect(feedSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\['left', 'right'\]\s*:\s*\['left', 'right', 'bottom'\]/,
    );
    expect(feedSource).toContain('edges={FEED_ROOT_SAFE_AREA_EDGES}');
    expect(feedSource).toContain('top={topInset}');
  });

  it('paints the Android status-bar inset with the Feed brand background', () => {
    expect(feedSource).toContain(
      'testID="android-feed-status-bar-background"',
    );
    expect(feedSource).toContain(
      'const androidStatusBarBackgroundStyle = useMemo(',
    );
    expect(feedSource).toContain('height: topInset');
    expect(feedSource).toContain('backgroundColor: APP_BRAND_COLOR');
  });

  it('uses the normalized inset for overlay and refresh positioning', () => {
    expect(feedSource).toContain(
      'const rawTopInset = resolveFeedChromeTopInset(',
    );
    expect(feedSource).toContain('const topInset = rawTopInset');
    expect(feedSource).toContain(
      ': topInset + FEED_HEADER_CONTENT_HEIGHT;',
    );
    expect(feedSource).toContain('paddingTop: feedHeaderOverlayHeight');
    expect(feedSource).toContain(
      'progressViewOffset={feedRefreshProgressViewOffset}',
    );
  });

  it('keeps the Android status bar aligned with the red feed chrome', () => {
    expect(feedSource).toMatch(
      /barStyle=\{\s*Platform\.OS === 'android'\s*\? 'light-content'\s*: 'dark-content'\s*\}/,
    );
    expect(feedSource).toMatch(
      /backgroundColor=\{\s*Platform\.OS === 'android'\s*\? APP_BRAND_COLOR\s*: '#FFFFFF'\s*\}/,
    );
    expect(feedSource).toContain('translucent={false}');
    expect(feedSource).toContain("StatusBar.setBarStyle('light-content', false)");
    expect(feedSource).toContain('StatusBar.setBackgroundColor(APP_BRAND_COLOR, false)');
    expect(feedSource).toContain('StatusBar.setTranslucent(false)');
  });
});
