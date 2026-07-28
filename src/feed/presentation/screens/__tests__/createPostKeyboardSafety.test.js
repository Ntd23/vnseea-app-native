const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('CreatePostModal keyboard safety', () => {
  it('uses the shared Android OEM fallback for the transparent modal', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const keyboardSafeView = read(
      'src/shared-kernel/presentation/components/KeyboardSafeView.tsx',
    );

    expect(source).toContain(
      "import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';",
    );
    expect(source).toContain('<KeyboardSafeView');
    expect(source).not.toContain('<KeyboardAvoidingView');
    expect(keyboardSafeView).toContain(
      "Platform.OS === 'ios' ? 'padding' : 'height'",
    );
  });

  it('lets the screen scroll own vertical gestures and dismiss the keyboard on drag', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );

    expect(source).not.toContain('TouchableWithoutFeedback');
    expect(source).toMatch(
      /keyboardDismissMode=\{\s*Platform\.OS === 'ios'\s*\? 'interactive'\s*: 'on-drag'\s*\}/,
    );
    expect(source).toContain(
      "nestedScrollEnabled={Platform.OS === 'android'}",
    );
    expect(source).toContain('onScrollBeginDrag={handleContentScrollBegin}');
    expect(source).toContain(
      'onMomentumScrollBegin={handleContentScrollBegin}',
    );
    expect(source).toContain('onMomentumScrollEnd={handleContentScrollEnd}');
    expect(source).toContain(
      'isKeyboardActive && !isContentDragging',
    );
  });

  it('keeps the video surface scrollable outside the centered playback control', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const videoPreview = source.slice(
      source.indexOf('const VideoPreviewCard'),
      source.indexOf('interface AudioPreviewCardProps'),
    );

    expect(videoPreview).not.toMatch(
      /<Pressable[\s\S]*?onPress=\{handlePlayPause\}/,
    );
    expect(videoPreview).toContain('pointerEvents="none"');
    expect(videoPreview).toContain(
      'accessibilityLabel={isPlaying ? copy.tapToPause : copy.tapToPlay}',
    );
  });

  it('only enables nested caption scrolling after its content exceeds the height cap', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );

    expect(source).toContain(
      'const [isCaptionOverflowing, setIsCaptionOverflowing] = useState(false);',
    );
    expect(source).toContain('scrollEnabled={isCaptionOverflowing}');
    expect(source).toContain(
      'setIsCaptionOverflowing(contentHeight > maxInputHeight);',
    );
  });
});
