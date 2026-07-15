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
    expect(source).toContain("animation: 'none'");
    expect(source).toContain("contentStyle: { backgroundColor: 'transparent' }");
    expect(source).toContain('gestureEnabled: false');
  });

  it('moves the Reels screen with the left-edge gesture to reveal the previous screen', () => {
    const source = read('src/reels/presentation/screens/ReelsScreen.tsx');

    expect(source).toContain('screenDismissX.value = nextX;');
    expect(source).toContain('screenDismissX.value = withSpring(0');
    expect(source).toContain('borderTopLeftRadius: interpolate(progress');
    expect(source).toContain("{ flex: 1, backgroundColor: '#000', overflow: 'hidden' }");
    expect(source).toContain('!shareModalVisible');
    expect(source).toContain('!isPublisherOverlayOpen');
  });
});
