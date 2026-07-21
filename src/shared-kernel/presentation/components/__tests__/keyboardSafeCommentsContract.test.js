const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const commentSurfaces = [
  'src/reels/presentation/components/ReelCommentsSheet.tsx',
  'src/explore/presentation/screens/ExploreScreen.tsx',
  'src/feed/presentation/screens/PostDetailScreen.tsx',
  'src/blogs/presentation/screens/BlogDetailScreen.tsx',
  'src/movies/presentation/screens/MovieDetailScreen.tsx',
  'src/live/presentation/screens/LiveRoomScreen.tsx',
];

describe('comment keyboard safety contract', () => {
  it('uses height avoidance as the Android OEM and modal fallback', () => {
    const source = read(
      'src/shared-kernel/presentation/components/KeyboardSafeView.tsx',
    );

    expect(source).toContain("Platform.OS === 'ios' ? 'padding' : 'height'");
    expect(source).toContain('<KeyboardAvoidingView');
  });

  it('covers every screen that owns a comment composer', () => {
    const directComposerSurfaces = commentSurfaces.filter(
      file => !file.endsWith('PostDetailScreen.tsx'),
    );

    directComposerSurfaces.forEach(file => {
      const source = read(file);
      expect(source).toContain('KeyboardSafeView');
      expect(source).not.toContain(
        "behavior={Platform.OS === 'ios' ? 'padding' : undefined}",
      );
    });

    const postDetail = read(
      'src/feed/presentation/screens/PostDetailScreen.tsx',
    );
    expect(postDetail).toContain('<ReelCommentsSheet');
    expect(postDetail).toContain('presentation="inline"');
  });

  it('keeps the Android activity resize contract enabled', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('android:windowSoftInputMode="adjustResize"');
  });

  it('measures and lifts the composer only when an OEM keyboard still overlaps it', () => {
    const sharedSheet = read(commentSurfaces[0]);

    expect(sharedSheet).toContain('Keyboard.metrics?.()');
    expect(sharedSheet).toContain('INLINE_ANDROID_KEYBOARD_ACCESSORY_CLEARANCE');
    expect(sharedSheet).toContain('effectiveKeyboardTop');
    expect(sharedSheet).toContain('measureInWindow');
    expect(sharedSheet).toContain('unshiftedBottom');
    expect(sharedSheet).toContain('keyboardLiftRef.current');
    expect(sharedSheet).toContain('collapsable={false}');
    expect(sharedSheet).toContain('style={composerLiftStyle}');
    expect(sharedSheet).toContain('commitKeyboardLift(0)');
  });

  it('bounds multiline comment composers so typed text scrolls in place', () => {
    const sharedSheet = read(commentSurfaces[0]);
    const explore = read(commentSurfaces[1]);
    const postDetail = read(commentSurfaces[2]);

    expect(sharedSheet).toContain('maxHeight: 90');
    expect(explore).toContain('className="max-h-24 flex-1');
    expect(sharedSheet).toContain('multiline');
    expect(postDetail).toContain('presentation="inline"');
  });

  it('actively reveals inline blog and movie comment fields on focus', () => {
    const blog = read(commentSurfaces[3]);
    const movie = read(commentSurfaces[4]);

    [blog, movie].forEach(source => {
      expect(source).toContain('scrollResponderScrollNativeHandleToKeyboard');
      expect(source).toContain('onFocus={revealCommentInput}');
    });
  });
});
