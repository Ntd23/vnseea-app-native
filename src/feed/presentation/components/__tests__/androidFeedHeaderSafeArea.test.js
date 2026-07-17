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

  it('lets the Android root safe-area own the top inset', () => {
    expect(headerSource).toContain('includeTopSafeArea = false');
    expect(feedSource).toContain('<FeedHeader />');
    expect(feedSource).not.toContain('<FeedHeader includeTopSafeArea />');
    expect(feedSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\['left', 'right'\]\s*:\s*\['top', 'left', 'right', 'bottom'\]/,
    );
    expect(feedSource).toContain('edges={FEED_ROOT_SAFE_AREA_EDGES}');
    expect(feedSource).toContain('top={0}');
    expect(feedSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\([\s\S]*?<FeedHeaderCollapseFrame hidden=\{isFeedChromeHidden\}>/,
    );
  });

  it('does not add Android top inset to list or refresh offsets', () => {
    expect(feedSource).toContain(
      'const rawTopInset = resolveFeedChromeTopInset(',
    );
    expect(feedSource).toContain('const topInset = getFeedChromeTopInset(rawTopInset)');
    expect(feedSource).toContain(
      ': FEED_HEADER_CONTENT_HEIGHT;',
    );
    expect(feedSource).toContain('paddingTop: feedHeaderOverlayHeight');
    expect(feedSource).toContain(
      'progressViewOffset={feedRefreshProgressViewOffset}',
    );
  });

  it('keeps stack headers protected independently', () => {
    expect(safeHeaderSource).toContain("edges={['top']}");
    expect(safeHeaderSource).toContain('<FeedHeader />');
    expect(safeHeaderSource).not.toContain('includeTopSafeArea');
    expect(insetSource).toContain('StatusBar.currentHeight');
  });

  it('keeps the Android status bar white with dark icons', () => {
    expect(feedSource).toContain('barStyle="dark-content"');
    expect(feedSource).toContain('backgroundColor="#FFFFFF"');
    expect(feedSource).toContain('translucent={false}');
  });
});
