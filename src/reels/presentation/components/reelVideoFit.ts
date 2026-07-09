export type ReelVideoFitMode = 'cover' | 'blurContain';

export const REEL_VERTICAL_COVER_MAX_ASPECT_RATIO = 0.75;

export function getReelVideoFitMode(
  aspectRatio: number | undefined,
): ReelVideoFitMode {
  if (
    typeof aspectRatio !== 'number' ||
    !Number.isFinite(aspectRatio) ||
    aspectRatio <= 0
  ) {
    return 'cover';
  }

  return aspectRatio > REEL_VERTICAL_COVER_MAX_ASPECT_RATIO ? 'blurContain' : 'cover';
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
