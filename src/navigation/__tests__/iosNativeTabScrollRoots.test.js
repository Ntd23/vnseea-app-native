const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('iOS native tab scroll roots', () => {
  it('defines shared iOS bottom tab content insets without throwing outside tab context', () => {
    const source = read('src/navigation/useMainTabContentInsets.ts');

    expect(source).toContain('BottomTabBarHeightContext');
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('bottomContentPadding');
    expect(source).toContain('scrollIndicatorBottomInset');
    expect(source).toContain("if (Platform.OS !== 'ios')");
    expect(source).toContain('const tabBarHeight = tabBarHeightFromContext ?? 0');
    expect(source).toContain('Math.max(tabBarHeight + 16, insets.bottom + 72)');
    expect(source).not.toContain('isInsideBottomTab');
  });

  it('keeps Feed FlatList as the primary iOS scroll root behind the overlay header', () => {
    const source = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(source).toContain('const feedListElement = (');
    expect(source).toContain('<FlatList');
    expect(source).toContain("data={Platform.OS === 'ios' ? iosFeedListItems : feedListItems}");
    expect(source).toContain('ListHeaderComponent={');
    expect(source).toContain("Platform.OS === 'ios' ? undefined : androidListHeaderComponent");
    expect(source).toContain("Platform.OS === 'ios' ? (");
    expect(source).toContain('{feedListElement}');
    expect(source).toContain('<FeedHeaderCollapseFrame hidden={isFeedChromeHidden}>');
    expect(source).toContain('useMainTabContentInsets');
    expect(source).toContain('bottomContentPadding');
    expect(source).toContain('paddingBottom: bottomContentPadding');
    expect(source).not.toContain('stickyHeaderIndices=');
    expect(source).not.toContain("type: 'ios-header'");
  });

  it('publishes native tab scroll intent from all iOS tab screens', () => {
    const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const reelsSource = read('src/reels/presentation/screens/ReelsScreen.tsx');
    const marketplaceSource = read('src/product/presentation/screens/MarketplaceScreen.tsx');
    const notificationsSource = read('src/notifications/presentation/screens/NotificationsScreen.tsx');
    const profileSource = read('src/profile/presentation/screens/ProfileScreen.tsx');

    for (const source of [
      feedSource,
      marketplaceSource,
      notificationsSource,
      profileSource,
    ]) {
      expect(source).toContain('createNativeTabScrollPublisherState');
      expect(source).toContain('publishNativeTabScrollIntent');
      expect(source).toContain('publishNativeTabScrollBehavior');
    }

    expect(reelsSource).toContain('publishNativeTabScrollBehavior');
    expect(reelsSource).toContain('runOnJS(publishNativeTabScrollBehaviorFromWorklet)');
    expect(reelsSource).toContain('nativeTabScrollLastBehavior');
  });

  it('keeps Reels on AnimatedFlatList without adding safe-area or scroll wrappers before it', () => {
    const source = read('src/reels/presentation/screens/ReelsScreen.tsx');
    const reelItemSource = read('src/reels/presentation/components/ReelItem.tsx');

    expect(source).toContain('const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)');
    expect(source).toContain('useMainTabContentInsets');
    expect(source).toContain('bottomOverlayInset');
    expect(source).toContain('bottomOverlayInset={bottomContentPadding}');
    expect(reelItemSource).toContain('bottomOverlayInset?: number');
    expect(reelItemSource).toContain('bottomOverlayInset = 0');
    expect(reelItemSource).toContain('Math.max(bottomOverlayInset, insets.bottom)');
    expect(source).toContain('<AnimatedFlatList');
    expect(source).toContain('onScroll={handleScroll}');
    expect(source).not.toContain('SafeAreaView');
    expect(source).not.toContain('<ScrollView');
  });

  it('uses an iOS Marketplace FlatList header instead of header siblings before the list', () => {
    const source = read('src/product/presentation/screens/MarketplaceScreen.tsx');

    expect(source).toContain('Platform,');
    expect(source).toContain('const marketplaceHeader = (');
    expect(source).toContain('const marketplaceListHeaderComponent');
    expect(source).toContain('ListHeaderComponent={marketplaceListHeaderComponent}');
    expect(source).toContain(
      "Platform.OS === 'ios' ? ['left', 'right'] : ['top']",
    );
    expect(source).toContain('const marketplaceListHeaderComponent = marketplaceHeader');
    expect(source).toContain('useMainTabContentInsets');
    expect(source).toContain('bottomContentPadding');
    expect(source).toContain('scrollIndicatorInsets');
    expect(source).toContain('scrollIndicatorBottomInset');
  });

  it('uses a FlatList root for the iOS notifications tab data state', () => {
    const source = read('src/notifications/presentation/screens/NotificationsScreen.tsx');

    expect(source).toContain('Platform,');
    expect(source).toContain('FlatList');
    expect(source).toContain('const notificationsListHeaderComponent');
    expect(source).toContain('const renderNotificationItem');
    expect(source).toContain('const iosNotificationsListElement = (');
    expect(source).toContain('ListHeaderComponent={notificationsListHeaderComponent}');
    expect(source).toContain('ListEmptyComponent={notificationsListEmptyComponent}');
    expect(source).toContain('ListFooterComponent={notificationsListFooterComponent}');
    expect(source).toContain(
      "Platform.OS === 'ios' ? iosNotificationsListElement : notificationsBody",
    );
    expect(source).toContain('useMainTabContentInsets');
    expect(source).toContain('bottomContentPadding');
    expect(source).toContain('scrollIndicatorInsets');
    expect(source).toContain('scrollIndicatorBottomInset');
  });

  it('uses a FlatList root for iOS Profile posts while preserving the Android ScrollView branch', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('Platform,');
    expect(source).toContain('const profileContentHeader = (');
    expect(source).toContain('const renderProfilePostItem');
    expect(source).toContain('const profilePostsListElement = (');
    expect(source).toContain('ListHeaderComponent={profileContentHeader}');
    expect(source).toContain('ListEmptyComponent={profilePostsEmptyComponent}');
    expect(source).toContain('ListFooterComponent={profilePostsFooterComponent}');
    expect(source).toContain(
      "Platform.OS === 'ios' ? profilePostsListElement : profileScrollElement",
    );
    expect(source).toContain('const profileScrollElement = (');
    expect(source).toContain('<ScrollView');
    expect(source).toContain('useMainTabContentInsets');
    expect(source).toContain('bottomContentPadding');
    expect(source).toContain('scrollIndicatorInsets');
    expect(source).toContain('scrollIndicatorBottomInset');
  });
});
