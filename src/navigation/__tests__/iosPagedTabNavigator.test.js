const fs = require('fs');
const path = require('path');
const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('iOS paged bottom tab navigator', () => {
  it('uses Material Top Tabs as the iOS pager-backed content shell', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');

    expect(source).toContain('createMaterialTopTabNavigator');
    expect(source).toContain('const IosPagerTab = createMaterialTopTabNavigator<MainTabParamList>()');
    expect(source).toContain('function IosHybridPagedTabNavigator()');
    expect(source).toContain("tabBarPosition=\"bottom\"");
    expect(source).toContain('swipeEnabled: true');
    expect(source).toContain('keyboardDismissMode="on-drag"');
    expect(source).toContain('lazy: true');
    expect(source).toContain('lazyPreloadDistance: 1');
    expect(source).toContain('initialLayout={{ width: SCREEN_WIDTH }}');
  });

  it('renders a native iOS liquid tab bar instead of JS blur chrome', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');
    const iosTabBarSource = source.slice(
      source.indexOf('function IosLiquidTabBar'),
      source.indexOf('function renderIosPagerTabBar'),
    );

    expect(source).toContain("requireNativeComponent<NativeIosLiquidTabBarProps>('VNSEEAIosLiquidTabBar')");
    expect(source).toContain('function IosLiquidTabBar');
    expect(iosTabBarSource).toContain('IOS_NATIVE_TAB_ROUTES.map');
    expect(source).toContain('tabBarVisibility.subscribe');
    expect(iosTabBarSource).not.toContain('BlurView');
    expect(iosTabBarSource).not.toContain('AdaptiveGlassSurface');
    expect(iosTabBarSource).not.toContain('glassBackground');
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('notificationBadgeCount');
    expect(source).toContain('navigation.navigate(route.name)');
  });

  it('backs the iOS tab bar with native UITabBar', () => {
    const swift = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');
    const bridge = read('ios/VNSEEA/VNSEEAIosLiquidTabBarManager.m');
    const project = read('ios/VNSEEA.xcodeproj/project.pbxproj');

    expect(swift).toContain('class VNSEEAIosLiquidTabBar: UIView, UITabBarDelegate');
    expect(swift).toContain('private let tabBar = UITabBar()');
    expect(swift).toContain('UIImage(systemName: systemImageName)');
    expect(swift).toContain('onTabPress?([');
    expect(bridge).toContain('RCT_EXTERN_MODULE(VNSEEAIosLiquidTabBarManager, RCTViewManager)');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(items, NSArray)');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSNumber)');
    expect(project).toContain('VNSEEAIosLiquidTabBar.swift in Sources');
    expect(project).toContain('VNSEEAIosLiquidTabBarManager.m in Sources');
  });

  it('keeps the original iOS bottom tab height while avoiding separate safe-area props', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');
    const swift = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');
    const bridge = read('ios/VNSEEA/VNSEEAIosLiquidTabBarManager.m');

    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain('const tabBarHeight = IOS_NATIVE_TAB_BAR_BASE_HEIGHT + insets.bottom;');
    expect(source).not.toContain('bottomInset={insets.bottom}');
    expect(bridge).not.toContain('RCT_EXPORT_VIEW_PROPERTY(bottomInset, NSNumber)');
    expect(swift).not.toContain('@objc var bottomInset: NSNumber');
    expect(swift).not.toContain('safeAreaInset');
    expect(swift).toContain('tabBar.frame = bounds');
  });

  it('keeps the native iOS UITabBar background transparent', () => {
    const swift = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');

    expect(swift).toContain('appearance.configureWithTransparentBackground()');
    expect(swift).toContain('appearance.backgroundEffect = nil');
    expect(swift).toContain('appearance.backgroundColor = .clear');
    expect(swift).toContain('appearance.shadowColor = .clear');
    expect(swift).toContain('tabBar.backgroundImage = UIImage()');
    expect(swift).toContain('tabBar.shadowImage = UIImage()');
    expect(swift).not.toContain('configureWithDefaultBackground()');
  });

  it('overlays the iOS liquid tab bar above transparent pager content', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');
    const hostStyle = source.slice(
      source.indexOf('iosLiquidTabBarHost: {'),
      source.indexOf('},', source.indexOf('iosLiquidTabBarHost: {')) + 2,
    );

    expect(source).toContain('style={styles.iosPagerRoot}');
    expect(source).toContain('sceneStyle: styles.iosPagerScene');
    expect(source).toContain('iosPagerRoot: {');
    expect(source).toContain('iosPagerScene: {');
    expect(hostStyle).toContain("position: 'absolute'");
    expect(hostStyle).toContain('zIndex: 20');
    expect(hostStyle).toContain('elevation: 20');
    expect(source).toContain('width: SCREEN_WIDTH');
    expect(source).toContain('height: tabBarHeight');
    expect(source).toContain('right: 0');
    expect(source).toContain('bottom: 0');
  });

  it('restores scroll-down minimize behavior for the bridged iOS liquid tab bar', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');
    const swift = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');
    const bridge = read('ios/VNSEEA/VNSEEAIosLiquidTabBarManager.m');

    expect(source).toContain('useNativeTabBarPresentation');
    expect(source).toContain("nativeTabBarPresentation.setPresentation('expanded')");
    expect(source).toContain("tabBarPresentation === 'minimized'");
    expect(source).toContain('compactProgress');
    expect(source).toContain('tabBarCompactTranslateX');
    expect(source).toContain('tabBarCompactScaleX');
    expect(source).toContain('tabBarCompactScaleY');
    expect(source).toContain('Animated.add(translateY, tabBarCompactTranslateY)');
    expect(source).not.toContain('IOS_NATIVE_TAB_BAR_COMPACT_WIDTH');
    expect(source).not.toContain('tabBarAnimatedHeight');
    expect(source).not.toContain('width: tabBarWidth');
    expect(source).not.toContain('height: tabBarAnimatedHeight');
    expect(source).toContain('compact={tabBarPresentation === \'minimized\'}');
    expect(swift).toContain('@objc var compact: NSNumber');
    expect(swift).toContain('private var tabBarItemTitles: [String?] = []');
    expect(swift).toContain('private var compactTabBarItems: [UITabBarItem] = []');
    expect(swift).toContain('private lazy var expandedAppearance: UITabBarAppearance');
    expect(swift).toContain('private lazy var compactAppearance: UITabBarAppearance');
    expect(swift).toContain('makeTransparentTabBarAppearance(hidesTitle: true)');
    expect(swift).toContain('configureHiddenTitleAppearance(appearance.stackedLayoutAppearance)');
    expect(swift).toContain('configureHiddenTitleAppearance(appearance.inlineLayoutAppearance)');
    expect(swift).toContain('configureHiddenTitleAppearance(appearance.compactInlineLayoutAppearance)');
    expect(swift).toContain('configureHiddenTitleState(itemAppearance.normal)');
    expect(swift).toContain('configureHiddenTitleState(itemAppearance.selected)');
    expect(swift).toContain('configureHiddenTitleState(itemAppearance.disabled)');
    expect(swift).toContain('configureHiddenTitleState(itemAppearance.focused)');
    expect(swift).toContain(
      'stateAppearance.titleTextAttributes = [.foregroundColor: UIColor.clear, .font: UIFont.systemFont(ofSize: 0.1)]',
    );
    expect(swift).toContain('stateAppearance.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 1000)');
    expect(swift).toContain('updateDisplayedItems()');
    expect(swift).toContain('restoreExpandedItemTitles()');
    expect(swift).toContain('let compactItem = UITabBarItem(title: "", image: image, selectedImage: image)');
    expect(swift).toContain('let selectedCompactItem = compactTabBarItems[index]');
    expect(swift).toContain('hideCompactItemTitle(selectedCompactItem)');
    expect(swift).toContain('item.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 100)');
    expect(swift).toContain('item.setTitleTextAttributes([.foregroundColor: UIColor.clear], for: .selected)');
    expect(swift).toContain('tabBar.items = [selectedCompactItem]');
    expect(swift).toContain('tabBar.selectedItem = selectedCompactItem');
    expect(swift).toContain('tabBar.standardAppearance = compactAppearance');
    expect(swift).toContain('tabBar.scrollEdgeAppearance = compactAppearance');
    expect(swift).toContain('selectedCompactItem.standardAppearance = compactAppearance');
    expect(swift).toContain('selectedCompactItem.scrollEdgeAppearance = compactAppearance');
    expect(swift).toContain('tabBar.standardAppearance = expandedAppearance');
    expect(swift).toContain('tabBar.scrollEdgeAppearance = expandedAppearance');
    expect(swift).toContain('item.standardAppearance = nil');
    expect(swift).toContain('item.scrollEdgeAppearance = nil');
    expect(swift).toContain('applyCompactTitleVisibility()');
    expect(swift).toContain('setTabBarLabelsHidden(compact.boolValue, in: tabBar)');
    expect(swift).toContain('if let label = view as? UILabel');
    expect(swift).toContain('label.isHidden = hidden');
    expect(swift).toContain('label.alpha = hidden ? 0 : 1');
    expect(swift).toContain('for subview in view.subviews');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(compact, NSNumber)');
  });

  it('anchors the compact iOS liquid tab bar by the active item target right edge', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');
    const hostSource = source.slice(
      source.indexOf('function IosLiquidTabBar'),
      source.indexOf('function renderIosPagerTabBar'),
    );
    const transformBlock = hostSource.slice(
      hostSource.indexOf('transform: ['),
      hostSource.indexOf('],', hostSource.indexOf('transform: [')) + 2,
    );

    expect(source).toContain('const IOS_NATIVE_TAB_BAR_COMPACT_SCALE_X = 0.70;');
    expect(source).toContain('const IOS_NATIVE_TAB_BAR_COMPACT_RIGHT = 0;');
    expect(source).toContain('const IOS_NATIVE_TAB_BAR_COMPACT_ACTIVE_ITEM_WIDTH = 0;');
    expect(hostSource).toContain(
      'const compactVisualWidth = SCREEN_WIDTH * IOS_NATIVE_TAB_BAR_COMPACT_SCALE_X;',
    );
    expect(hostSource).toContain(
      'const compactItemTargetRightEdge = SCREEN_WIDTH - IOS_NATIVE_TAB_BAR_COMPACT_RIGHT;',
    );
    expect(hostSource).toContain(
      'const compactItemTargetCenterX = compactItemTargetRightEdge - IOS_NATIVE_TAB_BAR_COMPACT_ACTIVE_ITEM_WIDTH / 2;',
    );
    expect(hostSource).toContain(
      'const compactTranslateX = compactItemTargetCenterX - SCREEN_WIDTH / 2;',
    );
    expect(hostSource).toContain('outputRange: [0, compactTranslateX]');
    expect(transformBlock.indexOf('{ scaleX: tabBarCompactScaleX }')).toBeGreaterThanOrEqual(0);
    expect(transformBlock.indexOf('{ translateX: tabBarCompactTranslateX }')).toBeGreaterThanOrEqual(0);
    expect(transformBlock.indexOf('{ scaleX: tabBarCompactScaleX }')).toBeLessThan(
      transformBlock.indexOf('{ translateX: tabBarCompactTranslateX }'),
    );
  });

  it('does not keep the old manual iOS pan wrapper in MainTabNavigator', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');

    expect(source).not.toContain('Gesture.Pan()');
    expect(source).not.toContain('GestureDetector');
    expect(source).not.toContain('swipeTranslateX');
    expect(source).not.toContain('withTiming');
    expect(source).not.toContain('iosTabSwipe');
  });

  it('declares pager tab dependencies', () => {
    const packageJson = JSON.parse(read('package.json'));

    expect(packageJson.dependencies).toHaveProperty(
      '@react-navigation/material-top-tabs',
    );
    expect(packageJson.dependencies).toHaveProperty('react-native-tab-view');
    expect(packageJson.dependencies).toHaveProperty('react-native-pager-view');
  });
});
