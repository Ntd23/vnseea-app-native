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
  const feedScreenSource = fs.readFileSync(
    path.join(
      process.cwd(),
      'src/feed/presentation/screens/FeedScreen.tsx',
    ),
    'utf8',
  );
  const profileScreenSource = fs.readFileSync(
    path.join(
      process.cwd(),
      'src/profile/presentation/screens/ProfileScreen.tsx',
    ),
    'utf8',
  );
  const pageDetailSource = fs.readFileSync(
    path.join(
      process.cwd(),
      'src/pages/presentation/screens/PageDetailScreen.tsx',
    ),
    'utf8',
  );

  test('closes the photo viewer before opening post detail comments', () => {
    expect(photoViewerSource).toContain('handleCommentPress');
    expect(photoViewerSource).toContain('pendingCommentPostIdRef');
    expect(photoViewerSource).toContain(
      'pendingCommentPostIdRef.current = livePost.id',
    );
    expect(photoViewerSource).toContain('handleModalDismiss');
    expect(photoViewerSource).toContain('onDismiss={handleModalDismiss}');
    expect(photoViewerSource).toContain('animateClose();');
    expect(photoViewerSource).toContain('visible={Boolean(state && livePost)}');
    expect(photoViewerSource).not.toContain('onCommentTap(livePost.id)');
    expect(photoViewerSource).not.toContain('PHOTO_VIEWER_COMMENT_SHEET_DELAY_MS');
    expect(photoViewerSource).not.toContain('commentOpenTimeoutRef');
  });

  test('routes photo comments through the same post detail flow as feed cards', () => {
    for (const source of [
      feedScreenSource,
      profileScreenSource,
      pageDetailSource,
    ]) {
      expect(source).toContain('navigateToPostComments(');
      expect(source).toContain(
        'onCommentTap={handlePhotoViewerCommentTap}',
      );
    }
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
