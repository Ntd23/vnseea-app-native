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

  it('renders the iOS VNSEEA logo inside the blue brand pill', () => {
    const iosSource = read('src/feed/presentation/components/FeedHeader.ios.tsx');

    expect(iosSource).toContain('style={styles.brandLogoTouchable}');
    expect(iosSource).toContain('<View style={styles.logoPill}>');
    expect(iosSource.indexOf('<View style={styles.logoPill}>')).toBeLessThan(
      iosSource.indexOf('<Text style={styles.brandText}>VNSEEA</Text>'),
    );
    expect(iosSource).toContain("backgroundColor: '#002fff'");
    expect(iosSource).toContain("color: '#ffffff'");
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
    expect(iosFrameSource).toContain('insets.top + FEED_HEADER_BAR_HEIGHT');
    expect(iosFrameSource).toContain('height: expandedHeight');
    expect(iosFrameSource).toContain('paddingTop: insets.top');
    expect(iosFrameSource).toContain('top: 0');
    expect(iosFrameSource).toContain("backgroundColor: 'rgba(248, 250, 252, 0.94)'");
    expect(defaultFrameSource).toContain('FEED_FILTER_HEIGHT');
  });

  it('renders the iOS feed header as an absolute overlay that does not reflow posts', () => {
    const iosFrameSource = read(
      'src/feed/presentation/components/FeedHeaderCollapseFrame.ios.tsx',
    );

    expect(iosFrameSource).toContain('const contentAnimatedStyle = useAnimatedStyle');
    expect(iosFrameSource).toContain('style={[styles.frame, frameStyle]}');
    expect(iosFrameSource).toContain('style={[styles.content, contentStyle, contentAnimatedStyle]}');
    expect(iosFrameSource).toContain("position: 'absolute'");
    expect(iosFrameSource).toContain("pointerEvents={hidden ? 'none' : 'box-none'}");
    expect(iosFrameSource).not.toContain('height: expandedHeight * progress.value');
    expect(iosFrameSource).not.toContain('paddingTop: insets.top * progress.value');
  });

  it('keeps the iOS feed header as one overlay outside FlatList instead of a sticky item', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const iosFrameSource = read(
      'src/feed/presentation/components/FeedHeaderCollapseFrame.ios.tsx',
    );

    expect(feedScreenSource).toContain("from '../components/FeedHeaderCollapseFrame'");
    expect(feedScreenSource).toContain('<FeedHeaderCollapseFrame hidden={isFeedChromeHidden}>');
    expect(feedScreenSource).toContain('<FeedHeader />');
    expect(feedScreenSource).toContain('<FeedFilterTabs');
    expect(feedScreenSource).toContain('</FeedHeaderCollapseFrame>');
    expect(feedScreenSource).toContain('onScroll={handleFeedScroll}');
    expect(feedScreenSource).toContain('scrollEventThrottle={16}');
    expect(feedScreenSource).toContain('const feedHeaderOverlayHeight = feedRefreshProgressViewOffset');
    expect(feedScreenSource).toContain('paddingTop: feedHeaderOverlayHeight');
    expect(feedScreenSource).toContain('contentContainerStyle={feedListContentStyle}');
    expect(feedScreenSource).not.toContain('FEED_IOS_STICKY_HEADER_INDICES');
    expect(feedScreenSource).not.toContain('stickyHeaderIndices=');
    expect(feedScreenSource).not.toContain("type: 'ios-header'");

    expect(iosFrameSource).toContain('useSharedValue');
    expect(iosFrameSource).toContain('useAnimatedStyle');
    expect(iosFrameSource).toContain('withTiming');
    expect(iosFrameSource).toContain('pointerEvents={hidden ?');
  });

  it('keeps iOS and Android feed header chrome separated', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\(\s*<>\s*[\s\S]*?\{feedListElement\}\s*<FeedHeaderCollapseFrame hidden=\{isFeedChromeHidden\}>\s*<FeedHeader \/>/,
    );
    expect(feedScreenSource).toMatch(
      /:\s*\(\s*<>\s*<FeedHeaderCollapseFrame\s+hidden=\{isFeedChromeHidden\}\s+height=\{FEED_HEADER_CONTENT_HEIGHT\}\s+top=\{topInset\}\s+translateDistance=\{FEED_HEADER_CONTENT_HEIGHT\}\s*>/s,
    );
    expect(feedScreenSource).toMatch(
      /translateDistance=\{FEED_HEADER_CONTENT_HEIGHT\}\s*>\s*<FeedHeader \/>\s*<FeedFilterTabs/s,
    );
    expect(feedScreenSource).not.toContain('styles.staticHeaderContainer');
  });

  it('keeps Android feed chrome from double-padding under the status bar', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('function getFeedChromeTopInset(rawTopInset: number)');
    expect(feedScreenSource).toContain("if (Platform.OS === 'android') return 0");
    expect(feedScreenSource).toContain('return rawTopInset');
    expect(feedScreenSource).toContain('const topInset = getFeedChromeTopInset(rawTopInset)');
    expect(feedScreenSource).toContain('top={topInset}');
    expect(feedScreenSource).toContain('translucent={false}');
    expect(feedScreenSource).toContain('const feedHeaderOverlayHeight = feedRefreshProgressViewOffset');
    expect(feedScreenSource).toContain('const newPostsButtonTop = feedHeaderOverlayHeight + 12');
    expect(feedScreenSource).toContain('style={{ top: newPostsButtonTop }}');
    expect(feedScreenSource).not.toContain('const topInset = rawTopInset');
    expect(feedScreenSource).not.toContain("const topInset = Platform.OS === 'android' ? 0 : rawTopInset");
  });

  it('keeps native iOS bottom tab presentation wired through the shared store', () => {
    const mainTabNavigatorSource = read('src/navigation/MainTabNavigator.tsx');
    const behaviorSource = read('src/navigation/nativeTabMinimizeBehavior.ts');

    expect(mainTabNavigatorSource).toContain('NativeIosLiquidTabBarView');
    expect(mainTabNavigatorSource).toContain('tabBarVisibility.subscribe');
    expect(mainTabNavigatorSource).toContain("nativeTabBarPresentation.setPresentation('expanded')");
    expect(mainTabNavigatorSource).toContain('tabBarPosition="bottom"');
    expect(behaviorSource).toContain("'onScrollDown'");
    expect(behaviorSource).toContain('useNativeTabMinimizeBehavior');
    expect(behaviorSource).toContain('useNativeTabBarPresentation');
  });

  it('keeps FlatList first on iOS so native tabs can observe scroll behind the overlay header', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('const feedListElement = (');
    expect(feedScreenSource).toContain('const androidListHeaderComponent');
    expect(feedScreenSource).toContain("data={Platform.OS === 'ios' ? iosFeedListItems : feedListItems}");
    expect(feedScreenSource).toMatch(
      /ListHeaderComponent=\{\s*Platform\.OS === 'ios'\s*\?\s*undefined\s*:\s*androidListHeaderComponent\s*\}/,
    );
    expect(feedScreenSource).toContain('<FeedHeaderCollapseFrame hidden={isFeedChromeHidden}>');
    expect(feedScreenSource).toMatch(
      /Platform\.OS === 'ios'\s*\?\s*\(\s*<>\s*[\s\S]*?\{feedListElement\}/,
    );
  });

  it('uses the intro as the first iOS Feed item and as the Android list header', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const renderIntroSource = feedScreenSource.slice(
      feedScreenSource.indexOf('const renderFeedIntro = useCallback'),
      feedScreenSource.indexOf('const renderItem = useCallback'),
    );

    expect(feedScreenSource).toContain("type: 'intro'");
    expect(feedScreenSource).toContain('const iosFeedListItems');
    expect(feedScreenSource).toContain('const androidListHeaderComponent');
    expect(feedScreenSource).toContain('if (item.type === \'intro\')');
    expect(renderIntroSource).toContain('<HomeFeedIntro');
    expect(renderIntroSource).not.toContain('<FeedFilterTabs');
    expect(feedScreenSource).not.toContain("type: 'ios-header'");
    expect(feedScreenSource).not.toContain('const FEED_IOS_STICKY_HEADER_INDICES');
    expect(feedScreenSource).not.toContain('stickyHeaderIndices={FEED_IOS_STICKY_HEADER_INDICES}');
    expect(feedScreenSource).not.toContain('if (item.type === \'ios-header\')');
    expect(feedScreenSource).not.toContain('const iOSListHeaderComponent');
  });

  it('publishes upward scroll intent to the native tab minimize POC store', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const publisherSource = read('src/navigation/nativeTabScrollPublisher.ts');
    const behaviorSource = read('src/navigation/nativeTabMinimizeBehavior.ts');

    expect(feedScreenSource).toContain('createNativeTabScrollPublisherState');
    expect(feedScreenSource).toContain('publishNativeTabScrollIntent');
    expect(feedScreenSource).toContain("publishNativeTabScrollBehavior('none')");
    expect(feedScreenSource).toContain("publishNativeTabScrollBehavior('onScrollDown')");
    expect(publisherSource).toContain('nativeTabMinimizeBehavior.setBehavior');
    expect(publisherSource).toContain("nativeTabBarPresentation.setPresentation('expanded')");
    expect(behaviorSource).toContain('useNativeTabMinimizeBehavior');
  });

  it('keeps pull-to-refresh visible below the iOS overlay header', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('const FEED_IOS_HEADER_OVERLAY_HEIGHT = FEED_HEADER_BAR_HEIGHT');
    expect(feedScreenSource).toContain('const feedSafeAreaInsets = useSafeAreaInsets()');
    expect(feedScreenSource).toContain('const feedRefreshProgressViewOffset');
    expect(feedScreenSource).toContain('topInset + FEED_IOS_HEADER_OVERLAY_HEIGHT');
    expect(feedScreenSource).toContain('topInset + FEED_HEADER_CONTENT_HEIGHT');
    expect(feedScreenSource).toContain('progressViewOffset={feedRefreshProgressViewOffset}');
  });

  it('opens the iOS header immediately during top pull-to-refresh bounce', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('if (contentOffset.y < 0)');
    expect(feedScreenSource).toContain('createFeedChromeCollapseState()');
    expect(feedScreenSource).toContain('setIsFeedChromeHidden(false)');
    expect(feedScreenSource).toContain("publishNativeTabScrollBehavior('none')");
  });

  it('preserves current header navigation and drawer behavior on both platforms', () => {
    const defaultSource = read('src/feed/presentation/components/FeedHeader.tsx');
    const iosSource = read('src/feed/presentation/components/FeedHeader.ios.tsx');
    const drawerSource = read('src/feed/presentation/components/HeaderProfileDrawer.tsx');

    expect(defaultSource).toContain('HeaderProfileDrawer');
    expect(defaultSource).toContain('ROUTES.NOTIFICATIONS');
    expect(defaultSource).toContain('useNotificationBadgeViewModel');
    expect(defaultSource).toContain('useCurrentUserViewModel');
    expect(drawerSource).toContain('navigateToOwnProfile');

    expect(iosSource).toContain('HeaderProfileDrawer');
    expect(iosSource).toContain('Menu');
    expect(iosSource).toContain('accessibilityLabel="Profile Menu"');
    expect(iosSource).not.toContain('Bell');
    expect(iosSource).not.toContain('CircleUser');
    expect(iosSource).not.toContain('ROUTES.PROFILE');
    expect(iosSource).not.toContain('ROUTES.NOTIFICATIONS');
    expect(iosSource).not.toContain('useCurrentUserViewModel');
    expect(iosSource).not.toContain('useNotificationBadgeViewModel');
    expect(iosSource).not.toContain('transitionAnim');
    expect(iosSource).not.toContain('avatarImage');

    for (const source of [defaultSource, iosSource]) {
      expect(source).toContain('ROUTES.SEARCH');
      expect(source).toContain('ROUTES.MESSAGES');
      expect(source).toContain("messageCount > 99 ? '99+' : messageCount");
    }
  });

  it('places the iOS profile menu action after the messages action', () => {
    const iosSource = read('src/feed/presentation/components/FeedHeader.ios.tsx');

    expect(iosSource.indexOf('accessibilityLabel="Messages"')).toBeGreaterThan(-1);
    expect(iosSource.indexOf('accessibilityLabel="Profile Menu"')).toBeGreaterThan(
      iosSource.indexOf('accessibilityLabel="Messages"'),
    );
    expect(iosSource.indexOf('<Menu size={19} color="#002fff" strokeWidth={2.55} />')).toBeGreaterThan(
      iosSource.indexOf('<MessageCircle size={19} color="#002fff" strokeWidth={2.55} />'),
    );
  });
});
