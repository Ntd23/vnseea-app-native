import {
  FEED_VIDEO_MAX_HEIGHT_TO_WIDTH,
  getFeedVideoFrameLayout,
} from '../feedVideoFrameLayout';

describe('feed video frame layout', () => {
  it('caps a 9:16 video frame at 1.3 times its width without changing content ratio', () => {
    const layout = getFeedVideoFrameLayout(9 / 16);

    expect(FEED_VIDEO_MAX_HEIGHT_TO_WIDTH).toBe(1.3);
    expect(layout.frameAspectRatio).toBeCloseTo(1 / 1.3);
    expect(layout.contentAspectRatio).toBeCloseTo(9 / 16);
    expect(layout.isHeightCapped).toBe(true);
    expect(layout.sideFillFraction).toBeCloseTo(
      (1 - (9 / 16) / (1 / 1.3)) / 2,
    );
  });

  it('also caps a 3:4 video because its natural height exceeds 1.3 times its width', () => {
    expect(getFeedVideoFrameLayout(3 / 4)).toEqual({
      frameAspectRatio: 1 / 1.3,
      contentAspectRatio: 3 / 4,
      isHeightCapped: true,
      sideFillFraction: (1 - (3 / 4) / (1 / 1.3)) / 2,
    });
  });

  it.each([4 / 5, 1, 16 / 9])(
    'keeps an uncapped %s video at its natural frame ratio',
    aspectRatio => {
      expect(getFeedVideoFrameLayout(aspectRatio)).toEqual({
        frameAspectRatio: aspectRatio,
        contentAspectRatio: aspectRatio,
        isHeightCapped: false,
        sideFillFraction: 0,
      });
    },
  );
});
