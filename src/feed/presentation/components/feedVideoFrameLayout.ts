export const FEED_VIDEO_MAX_HEIGHT_TO_WIDTH = 1.3;

const FEED_VIDEO_MIN_FRAME_ASPECT_RATIO =
  1 / FEED_VIDEO_MAX_HEIGHT_TO_WIDTH;

export interface FeedVideoFrameLayout {
  frameAspectRatio: number;
  contentAspectRatio: number;
  isHeightCapped: boolean;
  sideFillFraction: number;
}

export function getFeedVideoFrameLayout(
  contentAspectRatio: number,
): FeedVideoFrameLayout {
  const resolvedContentAspectRatio =
    Number.isFinite(contentAspectRatio) && contentAspectRatio > 0
      ? contentAspectRatio
      : 16 / 9;
  const isHeightCapped =
    resolvedContentAspectRatio < FEED_VIDEO_MIN_FRAME_ASPECT_RATIO;
  const frameAspectRatio = isHeightCapped
    ? FEED_VIDEO_MIN_FRAME_ASPECT_RATIO
    : resolvedContentAspectRatio;
  const sideFillFraction = isHeightCapped
    ? Math.max(
        0,
        Math.min(
          0.5,
          (1 - resolvedContentAspectRatio / frameAspectRatio) / 2,
        ),
      )
    : 0;

  return {
    frameAspectRatio,
    contentAspectRatio: resolvedContentAspectRatio,
    isHeightCapped,
    sideFillFraction,
  };
}
