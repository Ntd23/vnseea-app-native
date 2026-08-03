export type ReelVideoFitMode = 'cover' | 'blurContain';

// Native video metadata can be rounded by a few pixels. Treat ratios as the
// same only when they are effectively identical; every real mismatch uses
// contain so no edge of the source video is cropped.
export const REEL_VIDEO_ASPECT_RATIO_EPSILON = 0.001;

export function getReelVideoFitMode(
  aspectRatio: number | undefined,
  frameAspectRatio: number | undefined,
): ReelVideoFitMode {
  if (
    typeof aspectRatio !== 'number' ||
    !Number.isFinite(aspectRatio) ||
    aspectRatio <= 0 ||
    typeof frameAspectRatio !== 'number' ||
    !Number.isFinite(frameAspectRatio) ||
    frameAspectRatio <= 0
  ) {
    // `contain` is the safe loading fallback before naturalSize is known.
    return 'blurContain';
  }

  return Math.abs(aspectRatio - frameAspectRatio) <=
    REEL_VIDEO_ASPECT_RATIO_EPSILON
    ? 'cover'
    : 'blurContain';
}

export function getReelVideoNaturalAspectRatio(data: any) {
  const size = data?.naturalSize ?? data;
  const width = Number(size?.width);
  const height = Number(size?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return undefined;
  }

  if (width <= 0 || height <= 0) {
    return undefined;
  }

  return width / height;
}
