const fs = require('fs');
const path = require('path');

describe('PhotoViewerModal comment transition', () => {
  const photoViewerSource = fs.readFileSync(
    path.join(
      process.cwd(),
      'src/shared-kernel/presentation/components/PhotoViewerModal.tsx',
    ),
    'utf8',
  );

  test('closes the native photo modal before opening the comments sheet', () => {
    expect(photoViewerSource).not.toContain(
      'onPress={() => onCommentTap(livePost.id)}',
    );
    expect(photoViewerSource).toContain('handleCommentPress');
    expect(photoViewerSource).toMatch(
      /handleCommentPress[\s\S]*onClose\(\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*onCommentTap\(postId\)/,
    );
    expect(photoViewerSource).not.toContain(
      '// Open the comment sheet on top of the viewer',
    );
  });

  test('sizes photos within the visible viewport instead of behind the bottom panel', () => {
    expect(photoViewerSource).toContain('topBarHeight');
    expect(photoViewerSource).toContain('bottomPanelHeight');
    expect(photoViewerSource).toContain('onLayout={handleTopBarLayout}');
    expect(photoViewerSource).toContain('onLayout={handleBottomPanelLayout}');
    expect(photoViewerSource).toContain('PHOTO_VIEWER_IMAGE_HEIGHT_RATIO');
    expect(photoViewerSource).toContain('photoViewportHeight');
    expect(photoViewerSource).toContain('height={photoViewportHeight}');
    expect(photoViewerSource).not.toContain('height={SCREEN_H}');
  });
});
