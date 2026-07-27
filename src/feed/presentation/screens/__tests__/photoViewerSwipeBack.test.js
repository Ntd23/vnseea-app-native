const fs = require('fs');
const path = require('path');

describe('PhotoViewer Reel-style exit affordance', () => {
  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      'src/shared-kernel/presentation/components/PhotoViewerModal.tsx',
    ),
    'utf8',
  );

  test('provides an animated left-edge swipe exit without a static hint', () => {
    expect(source).toContain('const swipeBackGesture = Gesture.Pan()');
    expect(source).toContain(
      'hitSlop({ left: 0, width: PHOTO_VIEWER_SWIPE_BACK_START_WIDTH })',
    );
    expect(source).toContain('currentIndex === 0');
    expect(source).toContain('event.velocityX > PHOTO_VIEWER_SWIPE_BACK_VELOCITY');
    expect(source).toContain('swipeBackIndicatorStyle');
    expect(source).toContain(
      'Gesture.Simultaneous(panGesture, swipeBackGesture)',
    );
    expect(source).not.toContain('Vuốt để thoát');
    expect(source).not.toContain('Swipe to exit');
  });

  test('adds a back button that preserves the viewer close animation', () => {
    expect(source).toMatch(
      /accessibilityLabel=\{\s*language === 'vi' \? 'Quay lại' : 'Go back'/,
    );
    expect(source).toContain('<ChevronLeft size={22} color="#ffffff" />');
    expect(source).toContain('onPress={handleClose}');
  });

  test('uses the non-translucent Android app window for stable geometry', () => {
    expect(source).toContain('useWindowDimensions');
    expect(source).not.toContain("Dimensions.get('window')");
    expect(source).not.toContain('statusBarTranslucent');
    expect(source).toContain('translucent={false}');
  });
});
