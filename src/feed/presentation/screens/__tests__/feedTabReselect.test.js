const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Feed active navigation item reselect', () => {
  const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
  const tabs = read('src/feed/presentation/components/FeedFilterTabs.tsx');

  it('uses one scroll-or-refresh handler for the iOS Feed tab', () => {
    expect(feed).toContain('getTabReselectAction(feedScrollYRef.current)');
    expect(feed).toContain('const handleFeedTabReselect = useCallback');
    expect(feed).toContain("Platform.OS !== 'ios'");
    expect(feed).toContain("navigation.addListener('tabPress'");
    expect(feed).toContain('if (!isFeedTabFocusedRef.current) return');
    expect(feed).toContain('feedTabRefreshInFlightRef.current');
    expect(feed).toContain('handleRefresh()');
  });

  it('reselects active Home and Photos from the Android filter bar', () => {
    expect(tabs).toContain(
      'onActiveSourcePress?: (source: FeedFilterTabKey) => void',
    );
    expect(tabs).toContain('if (activeSource === source)');
    expect(tabs).toContain('onActiveSourcePress?.(source)');
    expect(feed).toContain(
      'onActiveSourcePress={handleFeedTabReselect}',
    );
  });
});
