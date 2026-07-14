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

  test('opens iOS comments only after the native photo modal is dismissed', () => {
    expect(photoViewerSource).not.toContain(
      'onPress={() => onCommentTap(livePost.id)}',
    );
    expect(photoViewerSource).toContain('handleCommentPress');
    expect(photoViewerSource).toContain('pendingCommentPostIdRef');
    expect(photoViewerSource).toContain('handleModalDismiss');
    expect(photoViewerSource).toContain('onDismiss={handleModalDismiss}');
    expect(photoViewerSource).toContain('visible={Boolean(state && livePost)}');
    expect(photoViewerSource).toContain("if (Platform.OS !== 'ios')");
    expect(photoViewerSource).toContain('pendingCommentPostIdRef.current = postId');
    expect(photoViewerSource).not.toContain('PHOTO_VIEWER_COMMENT_SHEET_DELAY_MS');
    expect(photoViewerSource).not.toContain('commentOpenTimeoutRef');
    expect(photoViewerSource).not.toMatch(
      /setTimeout\([\s\S]{0,200}onCommentTap\(postId\)/,
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
