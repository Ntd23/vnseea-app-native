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

  it('positions Android Feed chrome below the status bar without double-padding', () => {
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
    expect(feedSource).toContain('function getFeedChromeTopInset(rawTopInset: number)');
    expect(feedSource).toContain('return FEED_IS_ANDROID ? 0 : rawTopInset');
    expect(feedSource).toContain('const topInset = getFeedChromeTopInset(rawTopInset)');
    expect(feedSource).toContain('<FeedHeader />');
    expect(feedSource).not.toContain('<FeedHeader includeTopSafeArea />');
  });

  it('does not apply the inset twice on stack screens', () => {
    expect(safeHeaderSource).toContain("edges={['top']}");
    expect(safeHeaderSource).toContain('<FeedHeader />');
    expect(safeHeaderSource).not.toContain('includeTopSafeArea');
  });

  it('removes only the Android top edge from the Feed root', () => {
    expect(feedSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\['left', 'right'\]\s*:\s*\['left', 'right', 'bottom'\]/,
    );
    expect(feedSource).toContain('edges={FEED_ROOT_SAFE_AREA_EDGES}');
  });

  it('uses the normalized inset for overlay and refresh positioning', () => {
    expect(feedSource).toContain(
      'const rawTopInset = resolveFeedChromeTopInset(',
    );
    expect(feedSource).toContain('const topInset = getFeedChromeTopInset(rawTopInset)');
    expect(feedSource).toContain(
      ': topInset + FEED_HEADER_CONTENT_HEIGHT;',
    );
    expect(feedSource).toContain('paddingTop: feedHeaderOverlayHeight');
    expect(feedSource).toContain(
      'progressViewOffset={feedRefreshProgressViewOffset}',
    );
  });

  it('keeps the Android status bar aligned with the red feed chrome', () => {
    expect(feedSource).toContain("barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}");
    expect(feedSource).toContain("backgroundColor={Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'}");
    expect(feedSource).toContain('translucent={false}');
    expect(feedSource).toContain("StatusBar.setBarStyle('light-content', false)");
    expect(feedSource).toContain('StatusBar.setBackgroundColor(APP_BRAND_COLOR, false)');
    expect(feedSource).toContain('StatusBar.setTranslucent(false)');
  });
});
