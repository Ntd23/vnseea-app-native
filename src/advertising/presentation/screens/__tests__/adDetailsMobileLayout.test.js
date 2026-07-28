const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const screenPath = path.join(
  projectRoot,
  'src/advertising/presentation/screens/AdDetailsScreen.tsx',
);

function readScreen() {
  return fs.readFileSync(screenPath, 'utf8');
}

describe('AdDetailsScreen mobile layout', () => {
  it('uses the same platform-aware Home header chrome', () => {
    const source = readScreen();

    expect(source).toContain("Platform.OS === 'android'");
    expect(source).toContain(
      "barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}",
    );
    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />',
    );
  });

  it('keeps back and edit actions outside the scroll content so cards cannot cover them', () => {
    const source = readScreen();
    const screenSource = source.slice(
      source.indexOf('function AdDetailsScreen()'),
    );
    const toolbarIndex = screenSource.indexOf(
      '<View style={styles.screenToolbar}>',
    );
    const scrollIndex = screenSource.indexOf('<ScrollView');

    expect(toolbarIndex).toBeGreaterThanOrEqual(0);
    expect(toolbarIndex).toBeLessThan(scrollIndex);
    expect(source).toContain('toolbarBackButton');
    expect(source).toContain('toolbarEditButton');
    expect(source).toContain('height: 44');
    expect(source).not.toContain('heroBackButton');
    expect(source).not.toContain('heroEditButton');
  });

  it('renders performance metrics in a wrapping grid', () => {
    const source = readScreen();

    expect(source).toContain('metricGrid');
    expect(source).toContain("flexWrap: 'wrap'");
    expect(source.match(/<MetricTile/g)).toHaveLength(4);
  });

  it('keeps campaign statistics updated while the focused app is active', () => {
    const source = readScreen();

    expect(source).toContain('isLoading={isLoadingStats}');
    expect(source).toContain('useFocusEffect(');
    expect(source).toContain('.getAdStatsSnapshot(routeAd.id)');
    expect(source).toContain('AD_STATS_REFRESH_INTERVAL_MS = 5_000');
    expect(source).toContain('AppState.addEventListener(');
    expect(source).toContain("refreshStats('background').catch");
    expect(source).toContain('<RefreshControl');
    expect(source).toContain('accessibilityLiveRegion="polite"');
  });
});
