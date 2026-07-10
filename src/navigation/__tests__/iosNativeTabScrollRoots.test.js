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

    expect(reelsSource).toContain('tabBarVisibility.setVisible(false)');
    expect(reelsSource).toContain('tabBarVisibility.setVisible(true)');
    expect(reelsSource).not.toContain('runOnJS(publishNativeTabScrollBehaviorFromWorklet)');
    expect(reelsSource).not.toContain('nativeTabScrollLastBehavior');
  });

  it('keeps Reels full-screen on AnimatedFlatList without bottom-tab inset padding', () => {
    const source = read('src/reels/presentation/screens/ReelsScreen.tsx');
    const reelItemSource = read('src/reels/presentation/components/ReelItem.tsx');

    expect(source).toContain('const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)');
    expect(source).not.toContain('useMainTabContentInsets');
    expect(source).not.toContain('bottomOverlayInset={bottomContentPadding}');
    expect(source).not.toContain('bottomContentPadding');
    expect(reelItemSource).toContain('bottomOverlayInset?: number');
    expect(reelItemSource).toContain('bottomOverlayInset = 0');
    expect(reelItemSource).toContain('Math.max(bottomOverlayInset, insets.bottom)');
    expect(reelItemSource).toContain('resizeMode="cover"');
    expect(reelItemSource).not.toContain('resizeMode="contain"');
    expect(source).toContain('<AnimatedFlatList');
    expect(source).toContain('onScroll={handleScroll}');
    expect(source).toContain('pagingEnabled');
    expect(source).toContain('snapToInterval={itemHeight}');
    expect(source).toContain('getItemLayout={getItemLayout}');
    expect(source).toContain('onViewableItemsChanged={onViewableItemsChanged}');
    expect(source).not.toContain('SafeAreaView');
    expect(source).not.toContain('<ScrollView');
  });

  it('uses icon-only header controls for Reels auto-scroll and sound toggles', () => {
    const source = read('src/reels/presentation/screens/ReelsScreen.tsx');

    expect(source).toContain('onPressIn={toggleAutoScroll}');
    expect(source).toContain('<ChevronsDown size={20} color="#fff" />');
    expect(source).not.toContain('copy.autoOn');
    expect(source).not.toContain('copy.autoOff');
    expect(source).not.toContain('styles.headerCapsuleButton');
    expect(source).not.toContain('styles.headerButtonText');
  });

  it('keeps Reels progress scrubbing from triggering iOS horizontal tab swipe', () => {
    const reelItemSource = read('src/reels/presentation/components/ReelItem.tsx');

    expect(reelItemSource).toContain("import { iosPagerSwipeLock } from '../../../navigation/iosPagerSwipeLock'");
    expect(reelItemSource).toContain('iosPagerSwipeLock.setLocked(true)');
    expect(reelItemSource).toContain('iosPagerSwipeLock.setLocked(false)');
    expect(reelItemSource).toContain('onStartShouldSetResponder={() => true}');
    expect(reelItemSource).toContain('onMoveShouldSetResponder={() => true}');
    expect(reelItemSource).toContain('onResponderGrant={handleTouchStart}');
    expect(reelItemSource).toContain('onResponderMove={handleTouchMove}');
    expect(reelItemSource).toContain('onResponderRelease={handleTouchEnd}');
    expect(reelItemSource).toContain('onResponderTerminate={handleTouchCancel}');
  });

  it('uses blur plus contain for non-vertical Reels video while keeping one video player', () => {
    const reelItemSource = read('src/reels/presentation/components/ReelItem.tsx');
    const fitSource = read('src/reels/presentation/components/reelVideoFit.ts');

    expect(fitSource).toContain('REEL_VERTICAL_COVER_MAX_ASPECT_RATIO = 0.75');
    expect(fitSource).toContain("return aspectRatio > REEL_VERTICAL_COVER_MAX_ASPECT_RATIO ? 'blurContain' : 'cover'");
    expect(reelItemSource).toContain('getReelVideoNaturalAspectRatio(data)');
    expect(reelItemSource).toContain('const videoResizeMode = videoFitMode === \'blurContain\' ? \'contain\' : \'cover\';');
    expect(reelItemSource).toContain('styles.blurredVideoBackground');
    expect(reelItemSource).toContain('blurRadius={28}');
    expect(reelItemSource).toContain('resizeMode={videoResizeMode}');
    expect(reelItemSource).toContain('resizeMode={posterResizeMode}');
    expect((reelItemSource.match(/<VideoPlayer/g) ?? []).length).toBe(1);
  });

  it('suppresses stale native onEnd after an auto-advanced reel is reset', () => {
    const reelItemSource = read('src/reels/presentation/components/ReelItem.tsx');

    expect(reelItemSource).toContain('const suppressNextEndRef = useRef(false)');
    expect(reelItemSource).toContain('const startEndSuppression = useCallback(() => {');
    expect(reelItemSource).toContain('if (suppressNextEndRef.current) {');
    expect(reelItemSource).toContain('suppressNextEndRef.current = false;');
    expect(reelItemSource).toContain('resetPlaybackToStart(true);');
    expect(reelItemSource).toContain('startEndSuppression();');
    expect(reelItemSource).toContain('clearEndSuppression();');
    expect(reelItemSource).toContain('if (nextTime > 0.25) {');
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
    expect(source).toContain("const renderHeaderOutsideList = Platform.OS === 'android'");
    expect(source).toContain('const marketplaceListHeaderComponent = renderHeaderOutsideList');
    expect(source).toContain(': marketplaceHeader');
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

  it('uses a FlashList root for Profile posts with bottom tab insets', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('Platform,');
    expect(source).toContain('const profileContentHeader = (');
    expect(source).toContain('const renderProfilePostItem');
    expect(source).toContain('const profilePostsListElement = (');
    expect(source).toContain('<FlashList');
    expect(source).toContain('ListHeaderComponent={profileContentHeader}');
    expect(source).toContain('ListEmptyComponent={profilePostsEmptyComponent}');
    expect(source).toContain('ListFooterComponent={profilePostsFooterComponent}');
    expect(source).toContain('useMainTabContentInsets');
    expect(source).toContain('bottomContentPadding');
    expect(source).toContain('scrollIndicatorInsets');
    expect(source).toContain('scrollIndicatorBottomInset');
  });
});
