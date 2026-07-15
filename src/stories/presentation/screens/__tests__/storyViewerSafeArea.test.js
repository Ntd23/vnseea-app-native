const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('StoryViewer iOS header safe area', () => {
  it('positions the top overlay below the device safe-area inset', () => {
    const source = read('src/stories/presentation/screens/StoryViewerScreen.tsx');

    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('const storySafeAreaInsets = useSafeAreaInsets();');
    expect(source).toContain('const storyHeaderSafeTop = Math.max(storySafeAreaInsets.top, 8);');
    expect(source).toContain('[styles.topOverlay, { top: storyHeaderSafeTop }]');
    expect(source).not.toMatch(/<View style=\{styles\.topOverlay\} pointerEvents="box-none">/);
    expect(source).toMatch(/topOverlay:\s*{[\s\S]*position:\s*'absolute'[\s\S]*top:\s*0/);
  });

  it('keeps the viewer route transparent so swipe-down reveals the previous screen', () => {
    const source = read('src/navigation/AppNavigator.tsx');

    expect(source).toMatch(
      /const TRANSPARENT_MODAL_ROUTES:[\s\S]*new Set\(\[[\s\S]*ROUTES\.CREATE_POST,[\s\S]*ROUTES\.STORY_VIEWER,[\s\S]*\]\)/,
    );
    expect(source).toContain("presentation: 'transparentModal'");
    expect(source).toContain("contentStyle: { backgroundColor: 'transparent' }");
  });
});
