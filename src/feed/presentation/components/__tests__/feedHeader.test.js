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

  it('keeps the Feed safe area transparent on iOS while preserving Android surface base', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).toContain('const FEED_SAFE_AREA_CLASS_NAME');
    expect(feedScreenSource).toContain("Platform.OS === 'ios' ? 'flex-1'");
    expect(feedScreenSource).toContain("'flex-1' : 'flex-1 surface-base'");
    expect(feedScreenSource).toContain("backgroundColor: 'transparent'");
    expect(feedScreenSource).toContain('className={FEED_SAFE_AREA_CLASS_NAME}');
    expect(feedScreenSource).toContain('style={FEED_SAFE_AREA_STYLE}');
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

    expect(mainTabNavigatorSource).toContain("tabBarMinimizeBehavior: 'onScrollDown'");
    expect(mainTabNavigatorSource).toContain("tabBarControllerMode: 'tabBar'");
    expect(mainTabNavigatorSource).toContain("tabBarBlurEffect: 'systemDefault'");
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
