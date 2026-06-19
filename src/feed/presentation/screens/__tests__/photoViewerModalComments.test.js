const fs = require('fs');
const path = require('path');

describe('PhotoViewerModal comment transition', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/feed/presentation/screens/FeedScreen.tsx'),
    'utf8',
  );
  const photoViewerStart = source.indexOf('export function PhotoViewerModal');
  const photoViewerEnd = source.indexOf('const VideoReactionSummary');
  const photoViewerSource = source.slice(photoViewerStart, photoViewerEnd);

  test('closes the native photo modal before opening the comments sheet', () => {
    expect(photoViewerSource).not.toContain(
      'onPress={() => onCommentTap(livePost.id)}',
    );
    expect(photoViewerSource).toContain('handleCommentPress');
    expect(photoViewerSource).toMatch(
      /handleCommentPress[\s\S]*onClose\(\)[\s\S]*setTimeout[\s\S]*onCommentTap\(postId\)/,
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
