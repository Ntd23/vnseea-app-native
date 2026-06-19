const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('FeedHeader platform chrome', () => {
  it('keeps Liquid Glass behind the iOS-only feed header wrapper', () => {
    const defaultSource = read('src/feed/presentation/components/FeedHeader.tsx');
    const iosSource = read('src/feed/presentation/components/FeedHeader.ios.tsx');

    expect(defaultSource).not.toContain('AdaptiveGlassSurface');
    expect(defaultSource).not.toContain('@callstack/liquid-glass');
    expect(iosSource).toContain('AdaptiveGlassSurface');
    expect(iosSource).toContain('headerGlassDock');
    expect(iosSource).toContain('headerGlassAction');
  });

  it('keeps the iOS header wrapper transparent behind the glass dock', () => {
    const iosSource = read('src/feed/presentation/components/FeedHeader.ios.tsx');

    expect(iosSource).toContain("backgroundColor: 'transparent'");
    expect(iosSource).not.toContain("backgroundColor: '#F8FAFC'");
  });

  it('moves FeedHeader out of FeedScreen without importing glass into the screen', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain("from '../components/FeedHeader'");
    expect(feedScreenSource).toContain('<FeedHeader />');
    expect(feedScreenSource).not.toContain('function FeedHeader()');
    expect(feedScreenSource).not.toContain('feedHeaderIconStyle');
    expect(feedScreenSource).not.toContain('AdaptiveGlassSurface');
  });

  it('keeps the Feed safe area transparent on iOS while preserving Android white surface', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('const FEED_SAFE_AREA_CLASS_NAME');
    expect(feedScreenSource).toContain("Platform.OS === 'ios' ? 'flex-1'");
    expect(feedScreenSource).toContain("'flex-1' : 'flex-1 bg-white'");
    expect(feedScreenSource).toContain("backgroundColor: 'transparent'");
    expect(feedScreenSource).toContain('className={FEED_SAFE_AREA_CLASS_NAME}');
    expect(feedScreenSource).toContain('style={FEED_SAFE_AREA_STYLE}');
  });

  it('keeps iOS Feed top safe area inside the collapsible header frame', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const iosFrameSource = read(
      'src/feed/presentation/components/FeedHeaderCollapseFrame.ios.tsx',
    );
    const defaultFrameSource = read(
      'src/feed/presentation/components/FeedHeaderCollapseFrame.tsx',
    );

    expect(feedScreenSource).toContain('const FEED_ROOT_SAFE_AREA_EDGES');
    expect(feedScreenSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\['left', 'right'\]/,
    );
    expect(feedScreenSource).toContain('edges={FEED_ROOT_SAFE_AREA_EDGES}');
    expect(feedScreenSource).not.toContain('edges={ROOT_SAFE_AREA_EDGES}');

    expect(iosFrameSource).toContain('useSafeAreaInsets');
    expect(iosFrameSource).toContain('insets.top + FEED_HEADER_CONTENT_HEIGHT');
    expect(iosFrameSource).toContain('height: expandedHeight * progress.value');
    expect(iosFrameSource).toContain('paddingTop: insets.top * progress.value');
    expect(iosFrameSource).toContain("backgroundColor: 'rgba(248, 250, 252, 0.94)'");
    expect(defaultFrameSource).not.toContain('useSafeAreaInsets');
  });

  it('collapses the iOS feed header in layout instead of overlaying it', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const defaultFrameSource = read(
      'src/feed/presentation/components/FeedHeaderCollapseFrame.tsx',
    );
    const iosFrameSource = read(
      'src/feed/presentation/components/FeedHeaderCollapseFrame.ios.tsx',
    );

    expect(feedScreenSource).toContain("from '../components/FeedHeaderCollapseFrame'");
    expect(feedScreenSource).toContain('<FeedHeaderCollapseFrame hidden={isFeedChromeHidden}>');
    expect(feedScreenSource).toContain('<FeedHeader />');
    expect(feedScreenSource).toContain('</FeedHeaderCollapseFrame>');
    expect(feedScreenSource).toContain('onScroll={handleFeedScroll}');
    expect(feedScreenSource).toContain('scrollEventThrottle={16}');
    expect(feedScreenSource).not.toContain('FEED_HEADER_OVERLAY_STYLE');

    expect(defaultFrameSource).not.toContain('react-native-reanimated');
    expect(defaultFrameSource).not.toContain('@callstack/liquid-glass');
    expect(iosFrameSource).toContain('useSharedValue');
    expect(iosFrameSource).toContain('useAnimatedStyle');
    expect(iosFrameSource).toContain('withTiming');
    expect(iosFrameSource).toContain('pointerEvents={hidden ?');
  });

  it('keeps native iOS bottom tabs configured to minimize on scroll down', () => {
    const mainTabNavigatorSource = read('src/navigation/MainTabNavigator.tsx');
    const behaviorSource = read('src/navigation/nativeTabMinimizeBehavior.ts');

    expect(mainTabNavigatorSource).toContain('useNativeTabMinimizeBehavior');
    expect(mainTabNavigatorSource).toContain('tabBarMinimizeBehavior: nativeTabMinimizeBehavior');
    expect(mainTabNavigatorSource).toContain("tabBarControllerMode: 'tabBar'");
    expect(mainTabNavigatorSource).toContain("tabBarBlurEffect: 'systemDefault'");
    expect(behaviorSource).toContain("'onScrollDown'");
  });

  it('uses a FlatList-first iOS Feed layout so native tabs can observe scroll', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('const feedListElement = (');
    expect(feedScreenSource).toContain('const androidListHeaderComponent');
    expect(feedScreenSource).toContain("data={Platform.OS === 'ios' ? iosFeedListItems : feedListItems}");
    expect(feedScreenSource).toMatch(
      /ListHeaderComponent=\{\s*Platform\.OS === 'ios'\s*\?\s*undefined\s*:\s*androidListHeaderComponent\s*\}/,
    );
    expect(feedScreenSource).toContain('<FeedHeaderCollapseFrame hidden={isFeedChromeHidden}>');
    expect(feedScreenSource).toContain('<View className="flex-1">{feedListElement}</View>');
    expect(feedScreenSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\(\s*feedListElement\s*\)/,
    );
  });

  it('uses a sticky first Feed item for the iOS header so it can reappear immediately', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain("type: 'ios-header'");
    expect(feedScreenSource).toContain("type: 'intro'");
    expect(feedScreenSource).toContain('const FEED_IOS_STICKY_HEADER_INDICES');
    expect(feedScreenSource).toContain('stickyHeaderIndices={FEED_IOS_STICKY_HEADER_INDICES}');
    expect(feedScreenSource).toContain('const iosFeedListItems');
    expect(feedScreenSource).toContain('if (item.type === \'ios-header\')');
    expect(feedScreenSource).toContain('if (item.type === \'intro\')');
    expect(feedScreenSource).not.toContain('const iOSListHeaderComponent');
  });

  it('publishes upward scroll intent to the native tab minimize POC store', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const mainTabNavigatorSource = read('src/navigation/MainTabNavigator.tsx');

    expect(feedScreenSource).toContain('nativeTabMinimizeBehavior');
    expect(feedScreenSource).toContain("nativeTabMinimizeBehavior.setBehavior('none')");
    expect(feedScreenSource).toContain("nativeTabMinimizeBehavior.setBehavior('onScrollDown')");
    expect(mainTabNavigatorSource).toContain('useNativeTabMinimizeBehavior');
    expect(mainTabNavigatorSource).toContain('const nativeTabMinimizeBehavior = useNativeTabMinimizeBehavior()');
    expect(mainTabNavigatorSource).toContain('tabBarMinimizeBehavior: nativeTabMinimizeBehavior');
  });

  it('keeps pull-to-refresh visible below the iOS sticky header', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('const FEED_HEADER_CONTENT_HEIGHT = 73');
    expect(feedScreenSource).toContain('const feedSafeAreaInsets = useSafeAreaInsets()');
    expect(feedScreenSource).toContain('const feedRefreshProgressViewOffset');
    expect(feedScreenSource).toContain('feedSafeAreaInsets.top + FEED_HEADER_CONTENT_HEIGHT');
    expect(feedScreenSource).toContain('progressViewOffset={feedRefreshProgressViewOffset}');
  });

  it('opens the iOS header immediately during top pull-to-refresh bounce', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('if (contentOffset.y < 0)');
    expect(feedScreenSource).toContain('createFeedChromeCollapseState()');
    expect(feedScreenSource).toContain('setIsFeedChromeHidden(false)');
    expect(feedScreenSource).toContain("nativeTabMinimizeBehavior.setBehavior('none')");
  });

  it('preserves header navigation and create action behavior on both platforms', () => {
    const defaultSource = read('src/feed/presentation/components/FeedHeader.tsx');
    const iosSource = read('src/feed/presentation/components/FeedHeader.ios.tsx');

    for (const source of [defaultSource, iosSource]) {
      expect(source).toContain('CreateActionSheet');
      expect(source).toContain('ROUTES.SEARCH');
      expect(source).toContain('ROUTES.MESSAGES');
      expect(source).toContain('ROUTES.CREATE_EVENT');
      expect(source).toContain('ROUTES.CREATE_PRODUCT');
      expect(source).toContain('ROUTES.CREATE_PAGE');
      expect(source).toContain('ROUTES.CREATE_GROUP');
      expect(source).toContain('ROUTES.CREATE_REEL');
      expect(source).toContain('ROUTES.CREATE_POST');
      expect(source).toContain('ROUTES.CREATE_STORY');
      expect(source).toContain('ROUTES.CREATE_POLL');
      expect(source).toContain('ROUTES.CREATE_ALBUM');
      expect(source).toContain('ROUTES.CREATE_AD');
      expect(source).toContain("messageCount > 99 ? '99+' : messageCount");
      expect(source).toContain("setButtonRotation('45deg')");
      expect(source).toContain("setButtonRotation('0deg')");
    }
  });
});
