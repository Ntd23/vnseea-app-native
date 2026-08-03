export const REEL_VIDEO_FALLBACK_ASPECT_RATIO = 9 / 16;

export interface ContainedReelVideoRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

function isUsableDimension(value: number) {
  return Number.isFinite(value) && value > 0;
}

/** Fits the natural video frame inside the stage without cropping it. */
export function getContainedReelVideoRect(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number | undefined,
): ContainedReelVideoRect {
  if (
    !isUsableDimension(containerWidth) ||
    !isUsableDimension(containerHeight)
  ) {
    return { width: 0, height: 0, left: 0, top: 0 };
  }

  const resolvedAspectRatio = isUsableDimension(Number(aspectRatio))
    ? Number(aspectRatio)
    : REEL_VIDEO_FALLBACK_ASPECT_RATIO;
  const containerAspectRatio = containerWidth / containerHeight;

  if (resolvedAspectRatio >= containerAspectRatio) {
    const width = containerWidth;
    const height = width / resolvedAspectRatio;
    return {
      width,
      height,
      left: 0,
      top: (containerHeight - height) / 2,
    };
  }

  const height = containerHeight;
  const width = height * resolvedAspectRatio;
  return {
    width,
    height,
    left: (containerWidth - width) / 2,
    top: 0,
  };
}

export function getReelVideoNaturalAspectRatio(data: any) {
  const size = data?.naturalSize ?? data;
  const width = Number(size?.width);
  const height = Number(size?.height);
  const orientation = String(size?.orientation ?? '').toLowerCase();

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return undefined;
  }

  if (width <= 0 || height <= 0) {
    return undefined;
  }

  if (orientation === 'portrait' && width > height) {
    return height / width;
  }

  if (orientation === 'landscape' && height > width) {
    return height / width;
  }

  return width / height;
}
