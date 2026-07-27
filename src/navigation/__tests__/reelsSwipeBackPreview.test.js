const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Reels swipe-back preview', () => {
  it('mounts root Reels as a transparent custom-animated route', () => {
    const source = read('src/navigation/AppNavigator.tsx');

    expect(source).toContain('if (name === ROUTES.REELS) {');
    expect(source).toContain("presentation: 'transparentModal'");
    expect(source).toContain("animation: 'fade'");
    expect(source).toContain('animationDuration: 160');
    expect(source).toContain("contentStyle: { backgroundColor: 'transparent' }");
    expect(source).toContain('gestureEnabled: false');
  });

  it('moves the Reels screen with the left-edge gesture to reveal the previous screen', () => {
    const source = read('src/reels/presentation/screens/ReelsScreen.tsx');

    expect(source).toContain('screenDismissX.value = nextX;');
    expect(source).toContain(
      '.activeOffsetX(BACK_GESTURE_ACTIVE_OFFSET_X)',
    );
    expect(source).toContain(
      'screenDismissX.value = withTiming(0, returnConfig);',
    );
    expect(source).toContain(
      'const dismissX = Math.max(0, screenDismissX.value);',
    );
    expect(source).not.toContain('screenDismissX.value = withSpring(0');
    expect(source).toContain('borderTopLeftRadius: interpolate(progress');
    expect(source).toContain("{ flex: 1, backgroundColor: '#000', overflow: 'hidden' }");
    expect(source).toContain('!shareModalVisible');
    expect(source).toContain('!isPublisherOverlayOpen');
  });

  it('restores the Home status bar before dismissing Reels on Android', () => {
    const source = read('src/reels/presentation/screens/ReelsScreen.tsx');

    expect(source).toContain('const prepareFeedStatusBarForReturn = useCallback');
    expect(source).toContain("StatusBar.setBarStyle('light-content', false)");
    expect(source).toContain('StatusBar.setBackgroundColor(APP_BRAND_COLOR, false)');
    expect(source).toContain('StatusBar.setTranslucent(false)');
    expect(source).toContain('prepareFeedStatusBarForReturn();');
  });
});
