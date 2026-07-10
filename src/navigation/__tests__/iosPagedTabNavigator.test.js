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
    expect(source).toContain('const [isIosPagerSwipeEnabled, setIsIosPagerSwipeEnabled]');
    expect(source).toContain('iosPagerSwipeLock.subscribe');
    expect(source).toContain('swipeEnabled: isIosPagerSwipeEnabled');
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
    expect(source).toContain('useSyncedCartCount');
    expect(source).toContain('const { cartCount } = useSyncedCartCount(0);');
    expect(source).toContain('cartCount,');
    expect(source).toContain('typeof options.tabBarBadge === \'number\'');
    expect(source).toContain('String(options.tabBarBadge)');
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

  it('uses iOS 26 liquid glass and the native default fallback on earlier iOS versions', () => {
    const swift = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');

    expect(swift).toContain('configurePlatformTabBarBackground()');
    expect(swift).toContain('configurePlatformAppearanceBackground(appearance, usesCompactFallbackBackground: usesCompactFallbackBackground)');
    expect(swift).toContain('if #available(iOS 26.0, *)');
    expect(swift).toContain('appearance.configureWithTransparentBackground()');
    expect(swift).toContain('appearance.backgroundEffect = nil');
    expect(swift).toContain('appearance.backgroundColor = .clear');
    expect(swift).toContain('appearance.shadowColor = .clear');
    expect(swift).toContain('appearance.configureWithDefaultBackground()');
    expect(swift).toContain('if usesCompactFallbackBackground');
    expect(swift).toContain('tabBar.backgroundImage = UIImage()');
    expect(swift).toContain('tabBar.shadowImage = UIImage()');
    expect(swift).toContain('tabBar.backgroundImage = nil');
    expect(swift).toContain('tabBar.shadowImage = nil');
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

  it('hides and shows the full-width iOS liquid tab bar without JS compact width animation', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');
    const publisher = read('src/navigation/nativeTabScrollPublisher.ts');
    const swift = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');
    const bridge = read('ios/VNSEEA/VNSEEAIosLiquidTabBarManager.m');

    expect(source).toContain("nativeTabBarPresentation.setPresentation('expanded')");
    expect(publisher).toContain("nativeTabBarPresentation.setPresentation('expanded')");
    expect(publisher).toContain("tabBarVisibility.setVisible(behavior !== 'onScrollDown')");
    expect(publisher).not.toContain("behavior === 'onScrollDown' ? 'minimized' : 'expanded'");
    expect(source).not.toContain('useNativeTabBarPresentation');
    expect(source).not.toContain("tabBarPresentation === 'minimized'");
    expect(source).not.toContain('compactProgress');
    expect(source).not.toContain('tabBarCompactTranslateX');
    expect(source).not.toContain('tabBarAnimatedWidth');
    expect(source).toContain('compactFallbackWidth?: number;');
    expect(source).not.toContain('compactFallbackWidth={compactVisualWidth}');
    expect(source).not.toContain('tabBarCompactScaleX');
    expect(source).not.toContain('tabBarCompactScaleY');
    expect(source).not.toContain('tabBarCompactTranslateY');
    expect(source).toContain('{ translateY }');
    expect(source).not.toContain('IOS_NATIVE_TAB_BAR_COMPACT_WIDTH');
    expect(source).not.toContain('tabBarAnimatedHeight');
    expect(source).not.toContain('height: tabBarAnimatedHeight');
    expect(source).not.toContain('width: tabBarAnimatedWidth');
    expect(source).toContain('width: SCREEN_WIDTH');
    expect(source).toContain('compact={false}');
    expect(swift).toContain('@objc var compact: NSNumber');
    expect(swift).toContain('private var tabBarItemTitles: [String?] = []');
    expect(swift).toContain('private var compactTabBarItems: [UITabBarItem] = []');
    expect(swift).toContain('private var lastAppliedExpandedLayoutWidth: CGFloat = 0');
    expect(swift).toContain('private lazy var expandedAppearance: UITabBarAppearance');
    expect(swift).toContain('private lazy var compactAppearance: UITabBarAppearance');
    expect(swift).toContain('makePlatformTabBarAppearance(hidesTitle: false, usesCompactFallbackBackground: false)');
    expect(swift).toContain('makePlatformTabBarAppearance(hidesTitle: true, usesCompactFallbackBackground: true)');
    expect(swift).toContain('private let compactFallbackBackgroundView = UIVisualEffectView(effect: UIBlurEffect(style: .systemChromeMaterial))');
    expect(swift).toContain('private let compactFallbackDefaultWidth: CGFloat = 88');
    expect(swift).toContain('private let compactFallbackHeight: CGFloat = 54');
    expect(swift).toContain('@objc var compactFallbackWidth: NSNumber = 88');
    expect(swift).toContain('compactFallbackBackgroundView.frame = CGRect(');
    expect(swift).toContain('width: compactFallbackResolvedWidth()');
    expect(swift).toContain('private func compactFallbackResolvedWidth() -> CGFloat');
    expect(swift).toContain('max(compactFallbackDefaultWidth, CGFloat(truncating: compactFallbackWidth))');
    expect(swift).toContain('private let compactFallbackCornerRadius: CGFloat = 27');
    expect(swift).toContain('private let compactFallbackDefaultIconCenterY: CGFloat = 25');
    expect(swift).toContain('tabBar.itemPositioning = .fill');
    expect(swift).toContain('tabBar.itemWidth = 0');
    expect(swift).toContain('tabBar.itemSpacing = 0');
    expect(swift).toContain('refreshExpandedLayoutForCurrentWidthIfNeeded()');
    expect(swift).toContain('private func refreshExpandedLayoutForCurrentWidthIfNeeded()');
    expect(swift).toContain('abs(bounds.width - lastAppliedExpandedLayoutWidth) > 0.5');
    expect(swift).toContain('private func applyExpandedItemsForCurrentLayout(forceLayout: Bool)');
    expect(swift).toContain('guard bounds.width > 0 else');
    expect(swift).toContain('lastAppliedExpandedLayoutWidth = bounds.width');
    expect(swift).toContain('compactFallbackBackgroundView.isHidden = true');
    expect(swift).toContain('compactFallbackBackgroundView.isUserInteractionEnabled = false');
    expect(swift).toContain('compactFallbackBackgroundView.layer.cornerRadius = compactFallbackCornerRadius');
    expect(swift).toContain('compactFallbackBackgroundView.clipsToBounds = true');
    expect(swift).toContain('addSubview(compactFallbackBackgroundView)');
    expect(swift).toContain('layoutCompactFallbackBackground()');
    expect(swift).toContain('let iconCenter = compactFallbackIconCenter()');
    expect(swift).toContain('let fallbackWidth = compactFallbackResolvedWidth()');
    expect(swift).toContain('let originX = iconCenter.x - fallbackWidth / 2');
    expect(swift).toContain('let originY = iconCenter.y - compactFallbackHeight / 2');
    expect(swift).toContain('private func compactFallbackIconCenter() -> CGPoint');
    expect(swift).toContain('visibleTabBarImageViews(in: tabBar)');
    expect(swift).toContain('imageView.convert(CGPoint(x: imageView.bounds.midX, y: imageView.bounds.midY), to: self)');
    expect(swift).toContain('private func visibleTabBarImageViews(in view: UIView) -> [UIImageView]');
    expect(swift).not.toContain('let topAlignedHeight = min(bounds.height, 64)');
    expect(swift).toContain('updateCompactFallbackBackgroundVisibility()');
    expect(swift).toContain('private func shouldShowCompactFallbackBackground() -> Bool');
    expect(swift).toContain('return compact.boolValue');
    expect(swift).toContain('compactFallbackBackgroundView.isHidden = !shouldShowCompactFallbackBackground()');
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
    expect(swift).toContain('if !compact.boolValue && bounds.width <= 0');
    expect(swift).toContain('item.standardAppearance = nil');
    expect(swift).toContain('item.scrollEdgeAppearance = nil');
    expect(swift).toContain('tabBar.layoutIfNeeded()');
    expect(swift).toContain('applyCompactTitleVisibility()');
    expect(swift).toContain('setTabBarLabelsHidden(compact.boolValue, in: tabBar)');
    expect(swift).toContain('if let label = view as? UILabel');
    expect(swift).toContain('label.isHidden = hidden');
    expect(swift).toContain('label.alpha = hidden ? 0 : 1');
    expect(swift).toContain('for subview in view.subviews');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(compact, NSNumber)');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(compactFallbackWidth, NSNumber)');
  });

  it('does not use JS compact width animation for the iOS liquid tab bar', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');
    const hostSource = source.slice(
      source.indexOf('function IosLiquidTabBar'),
      source.indexOf('function renderIosPagerTabBar'),
    );
    const transformBlock = hostSource.slice(
      hostSource.indexOf('transform: ['),
      hostSource.indexOf('],', hostSource.indexOf('transform: [')) + 2,
    );

    expect(source).not.toContain('const IOS_NATIVE_TAB_BAR_COMPACT_SCALE_X =');
    expect(source).not.toContain('const IOS_NATIVE_TAB_BAR_COMPACT_RIGHT =');
    expect(source).not.toContain('const IOS_NATIVE_TAB_BAR_COMPACT_ACTIVE_ITEM_WIDTH =');
    expect(hostSource).not.toContain('compactVisualWidth');
    expect(hostSource).not.toContain('compactHostCenterX');
    expect(hostSource).not.toContain('compactItemTargetRightEdge');
    expect(hostSource).not.toContain('compactItemTargetCenterX');
    expect(hostSource).not.toContain('compactTranslateX');
    expect(hostSource).not.toContain('tabBarAnimatedWidth');
    expect(hostSource).not.toContain('useNativeDriver: false');
    expect(transformBlock).not.toContain('scaleX');
    expect(transformBlock).not.toContain('scaleY');
    expect(transformBlock).not.toContain('translateX');
    expect(transformBlock.indexOf('{ translateY }')).toBeGreaterThanOrEqual(0);
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
