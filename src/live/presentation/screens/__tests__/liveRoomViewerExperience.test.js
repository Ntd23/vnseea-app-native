const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Live room viewer experience', () => {
  it('keeps the complete landscape or portrait source frame for viewers', () => {
    const androidSource = read(
      'src/live/presentation/components/LiveKitStreamView.tsx',
    );
    const iosNativeSource = read('ios/VNSEEA/VNSEEALiveKitNativeView.swift');

    expect(androidSource).toContain("objectFit = 'contain'");
    expect(androidSource).toContain(
      "objectFit={isHost ? 'cover' : objectFit}",
    );
    expect(iosNativeSource).toContain('videoView.layoutMode = .fit');
    expect(iosNativeSource).toContain('videoView.layoutMode = shouldFill ? .fill : .fit');
  });

  it('automatically follows the newest live comment after layout settles', () => {
    const source = read('src/live/presentation/screens/LiveRoomScreen.tsx');

    expect(source).toContain('commentsListRef');
    expect(source).toContain('lastAutoScrolledCommentIdRef');
    expect(source).toContain('latestCommentId');
    expect(source).toContain('scrollToEnd({ animated })');
    expect(source).toContain(
      'onContentSizeChange={handleCommentsContentSizeChange}',
    );
    expect(source).toContain('commentAutoScrollUntilRef.current');
  });

  it('supports a clear-video mode by button and horizontal swipe', () => {
    const source = read('src/live/presentation/screens/LiveRoomScreen.tsx');

    expect(source).toContain('areLiveOverlaysVisible');
    expect(source).toContain('hideLiveOverlays');
    expect(source).toContain('showLiveOverlays');
    expect(source).toContain('<EyeOff');
    expect(source).toContain('<Eye');
    expect(source).toContain('Keyboard.dismiss()');
    expect(source).toContain('PanResponder.create');
    expect(source).toContain('gestureState.dx <= -LIVE_OVERLAY_SWIPE_DISTANCE');
    expect(source).toContain('gestureState.dx >= LIVE_OVERLAY_SWIPE_DISTANCE');
    expect(source).toContain(
      "pointerEvents={areLiveOverlaysVisible ? 'auto' : 'none'}",
    );
    expect(source).toContain('isHost && areLiveOverlaysVisible &&');
  });

  it('disables native swipe-back so swipe-right can restore the live overlay', () => {
    const source = read('src/navigation/AppNavigator.tsx');

    expect(source).toContain('if (name === ROUTES.LIVE_ROOM)');
    expect(source).toMatch(
      /if \(name === ROUTES\.LIVE_ROOM\)[\s\S]*options=\{\{ gestureEnabled: false \}\}/,
    );
  });
});
