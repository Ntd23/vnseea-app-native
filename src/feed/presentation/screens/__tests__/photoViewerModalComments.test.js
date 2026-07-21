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

  test('keeps photo comments in the shared popup instead of navigating away', () => {
    expect(photoViewerSource).toContain('handleCommentPress');
    expect(photoViewerSource).toContain('onCommentTap(livePost.id)');
    expect(photoViewerSource).toContain('visible={Boolean(state && livePost)}');
    expect(photoViewerSource).not.toContain('pendingCommentPostIdRef');
    expect(photoViewerSource).not.toContain('pendingCommentPostRef');
    expect(photoViewerSource).not.toContain('handleModalDismiss');
    expect(photoViewerSource).not.toContain('onDismiss={handleModalDismiss}');
    expect(photoViewerSource).not.toContain('navigateToPostComments(');
    expect(photoViewerSource).not.toContain('PHOTO_VIEWER_COMMENT_SHEET_DELAY_MS');
    expect(photoViewerSource).not.toContain('commentOpenTimeoutRef');
    expect(photoViewerSource).not.toContain('onCommentTap(pendingCommentPostId)');
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
