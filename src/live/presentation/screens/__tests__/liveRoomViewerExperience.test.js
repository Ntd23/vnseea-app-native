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
    expect(androidSource).toContain("objectFit={isHost ? 'cover' : objectFit}");
    expect(iosNativeSource).toContain('videoView.layoutMode = .fit');
    expect(iosNativeSource).toContain(
      'videoView.layoutMode = shouldFill ? .fill : .fit',
    );
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
      "pointerEvents={areLiveOverlaysVisible ? 'box-none' : 'none'}",
    );
    expect(source).toContain('areLiveOverlaysVisible &&');
  });

  it('supports tap, long-press selection, double-tap bursts, and one Feed share entry', () => {
    const source = read('src/live/presentation/screens/LiveRoomScreen.tsx');

    expect(source).toContain('isReactionPickerVisible');
    expect(source).toContain('selectedReaction');
    expect(source).toContain('FEED_REACTION_TYPES.map');
    expect(source).toContain('await react(reaction)');
    expect(source).toContain('onPress={handlePrimaryReactionPress}');
    expect(source).toContain('onLongPress={handlePrimaryReactionLongPress}');
    expect(source).toContain('delayLongPress={350}');
    expect(source).toContain('handleLiveSurfacePress');
    expect(source).toContain('LIVE_DOUBLE_TAP_DELAY_MS');
    expect(source).toContain(
      'source={FEED_REACTION_IMAGES[selectedReaction]}',
    );
    expect(source).toContain('presentLocalReaction(reaction)');
    expect(source).toContain('<FeedShareBottomSheet');
    expect(source).toContain('onInternalShare={sharePost}');
    expect(source).toContain('setShareModalVisible(true)');
    expect(source).not.toContain('NativeShare.share');
    expect(source).not.toContain('<Share2');
    expect(source).not.toContain('styles.shareActionButton');
    expect(source).toContain(
      'commentText.trim().length > 0 ? handleSendComment : handleShare',
    );
  });

  it('runs reaction activity across the top instead of mixing it with comments', () => {
    const source = read('src/live/presentation/screens/LiveRoomScreen.tsx');

    expect(source).toContain('LIVE_REACTION_TICKER_DURATION_MS');
    expect(source).toContain('outputRange: [-210, screenWidth + 24]');
    expect(source).toContain("styles.reactionActivity");
    expect(source).toContain("{ top: Math.max(insets.top, 14) + 76 }");
    expect(source).not.toContain(
      "{ bottom: Math.max(insets.bottom, 10) + 272 }",
    );
  });

  it('keeps hide-interface and more-options as separate controls', () => {
    const source = read('src/live/presentation/screens/LiveRoomScreen.tsx');

    expect(source).toContain('accessibilityLabel="Ẩn toàn bộ giao diện live"');
    expect(source).toContain('styles.hideInterfaceButton');
    expect(source).not.toContain("text: 'Ẩn giao diện'");
    expect(source).toContain('styles.restoreInterfaceControl');
    expect(source).toContain('styles.hiddenExitControl');
  });

  it('dismisses the comment keyboard when the viewer taps the video', () => {
    const source = read('src/live/presentation/screens/LiveRoomScreen.tsx');

    expect(source).toContain('onPress={handleLiveSurfacePress}');
    expect(source).toContain('inputRef.current?.blur()');
    expect(source).toContain('Keyboard.dismiss()');
    expect(source).toContain('setIsCommentInputFocused(false)');
  });

  it('disables native swipe-back so swipe-right can restore the live overlay', () => {
    const source = read('src/navigation/AppNavigator.tsx');

    expect(source).toContain('if (name === ROUTES.LIVE_ROOM)');
    expect(source).toMatch(
      /if \(name === ROUTES\.LIVE_ROOM\)[\s\S]*options=\{\{ gestureEnabled: false \}\}/,
    );
  });
});
