const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Page avatar and cover viewer flow', () => {
  it('opens the page avatar and cover from the hero media itself', () => {
    const source = read(
      'src/pages/presentation/screens/PageDetailScreen.tsx',
    );

    expect(source).toContain('onViewAvatar={handleViewAvatar}');
    expect(source).toContain('onViewCover={handleViewCover}');
    expect(source).toContain("setPageMediaViewer('avatar')");
    expect(source).toContain("setPageMediaViewer('cover')");
    expect(source).toContain('<PageMediaViewerModal');
    expect(source).toContain('onChange={handleChangePageMediaFromViewer}');
  });

  it('provides profile-style zoom, pan, safe-area and edit controls', () => {
    const viewer = read(
      'src/pages/presentation/components/PageMediaViewerModal.tsx',
    );

    expect(viewer).toContain('Gesture.Pinch()');
    expect(viewer).toContain('Gesture.Pan()');
    expect(viewer).toContain('.numberOfTaps(2)');
    expect(viewer).toContain('StatusBar.currentHeight');
    expect(viewer).toContain(
      'Math.max(insets.top, androidStatusBarHeight, 12)',
    );
    expect(viewer).toContain('navigationBarTranslucent');
    expect(viewer).toContain('{canEdit && onChange ? (');
    expect(viewer).toContain('onPress={onChange}');
  });
});
