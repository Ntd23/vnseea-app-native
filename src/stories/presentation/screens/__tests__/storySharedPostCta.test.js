const fs = require('fs');
const path = require('path');
const { parseSharedPostIdFromStoryDescription } = require('../storySharedPostLink');
const {
  calculateSharedPostStoryAvailableHeight,
  calculateSharedPostStoryScale,
  calculateSharedPostStoryScaledFrame,
} = require('../../../application/sharing/sharedPostStoryLayout');

describe('shared post Story CTA', () => {
  it.each([
    ['Xem bài viết trên VNSEEA: vnseea://post/123', '123'],
    ['Ghi chú\nhttps://v2.vnseea.vn/post/456?from=story', '456'],
  ])('parses a valid post deep link from Story description', (description, postId) => {
    expect(parseSharedPostIdFromStoryDescription(description)).toBe(postId);
  });

  it('ignores ordinary Story descriptions', () => {
    expect(parseSharedPostIdFromStoryDescription('Một ngày đẹp trời')).toBeNull();
  });

  it('uniformly scales long shared cards to fit the available Story area', () => {
    expect(
      calculateSharedPostStoryScale({
        contentWidth: 360,
        contentHeight: 900,
        availableWidth: 324,
        availableHeight: 540,
      }),
    ).toBeCloseTo(0.6);
    expect(
      calculateSharedPostStoryScale({
        contentWidth: 300,
        contentHeight: 400,
        availableWidth: 324,
        availableHeight: 540,
      }),
    ).toBe(1);
  });

  it('gives the shared card a taller viewport without changing its uniform scale', () => {
    expect(typeof calculateSharedPostStoryAvailableHeight).toBe('function');
    expect(
      calculateSharedPostStoryAvailableHeight({
        viewportHeight: 844,
        headerSafeTop: 47,
        bottomInset: 34,
      }),
    ).toBe(603);
  });

  it('uses the visually scaled card bounds as its interactive hit area', () => {
    expect(
      calculateSharedPostStoryScaledFrame({
        contentWidth: 360,
        contentHeight: 900,
        scale: 0.6,
      }),
    ).toEqual({
      width: 216,
      height: 540,
      canvasOffsetX: -72,
      canvasOffsetY: -180,
    });
  });

  it('renders a dynamic shared-post card and opens Post Detail', () => {
    const source = fs.readFileSync(
      path.join(rootPath(), 'src/stories/presentation/screens/StoryViewerScreen.tsx'),
      'utf8',
    );
    const segmentSource = fs.readFileSync(
      path.join(
        rootPath(),
        'src/stories/presentation/components/SharedPostStorySegment.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('parseSharedPostIdFromStoryDescription');
    expect(source).toContain("currentSegment.type === 'shared_post'");
    expect(source).toContain('SharedPostStorySegment');
    expect(source.indexOf('style={styles.tapZones}')).toBeLessThan(
      source.indexOf('<SharedPostStorySegment'),
    );
    expect(segmentSource).toContain('SharedPostPreviewCard');
    expect(segmentSource).toContain('calculateSharedPostStoryScale');
    expect(segmentSource).toContain('calculateSharedPostStoryScaledFrame');
    expect(segmentSource).toContain('styles.previewHitArea');
    expect(segmentSource).toContain('width: scaledFrame.width');
    expect(segmentSource).toContain('height: scaledFrame.height');
    expect(segmentSource).toContain('pointerEvents="none"');
    expect(segmentSource).toContain('onLongPress={onLongPress}');
    expect(segmentSource).toContain('onPressOut={onPressOut}');
    expect(segmentSource).toContain('delayLongPress={250}');
    expect(segmentSource).toMatch(
      /<View pointerEvents="none" style=\{StyleSheet\.absoluteFill\}>[\s\S]*?<Image[\s\S]*?blurRadius=\{28\}/,
    );
    expect(segmentSource).toContain('zIndex: 10');
    expect(segmentSource).toContain('onReady');
    expect(segmentSource).not.toContain('VideoPlayer');
    expect(source).toMatch(/topOverlay:\s*\{[\s\S]*?zIndex: 40/);
    expect(source).toContain('const isSegmentProgressReady = useMemo');
    expect(source).toContain("currentSegment.type === 'shared_post'");
    expect(source).toContain('const segmentPlaybackKey = useMemo');
    expect(source).toContain(
      'return readySharedPostSegmentKey === segmentPlaybackKey;',
    );
    expect(source).toContain('key={segmentPlaybackKey}');
    expect(source).not.toContain('setSharedPostSegmentReady(false)');
    expect(source).toContain('progress.stopAnimation();');
    expect(source).toContain('if (!isSegmentProgressReady) return;');
    expect(source).toContain('if (finished) advance();');
    expect(source).toContain('onLongPress={handleLongPressStart}');
    expect(source).toContain('onPressOut={handlePressOut}');
    expect(source).toContain(
      'const targetStoryId = currentSegment.storyId || currentStory.id;',
    );
    expect(source).toContain('Xem bài viết');
    expect(source).toContain('ROUTES.POST_DETAIL');
  });
});

function rootPath() {
  return process.cwd();
}
