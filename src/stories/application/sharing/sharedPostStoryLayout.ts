export type SharedPostStoryLayout = {
  contentWidth: number;
  contentHeight: number;
  availableWidth: number;
  availableHeight: number;
};

export type SharedPostStoryViewport = {
  viewportHeight: number;
  headerSafeTop: number;
  bottomInset: number;
};

export type SharedPostStoryScaledFrameInput = {
  contentWidth: number;
  contentHeight: number;
  scale: number;
};

export type SharedPostStoryScaledFrame = {
  width: number;
  height: number;
  canvasOffsetX: number;
  canvasOffsetY: number;
};

const SHARED_POST_STORY_CHROME_RESERVE = 160;

export function calculateSharedPostStoryAvailableHeight({
  viewportHeight,
  headerSafeTop,
  bottomInset,
}: SharedPostStoryViewport): number {
  return Math.max(
    240,
    viewportHeight -
      headerSafeTop -
      Math.max(bottomInset, 12) -
      SHARED_POST_STORY_CHROME_RESERVE,
  );
}

export function calculateSharedPostStoryScaledFrame({
  contentWidth,
  contentHeight,
  scale,
}: SharedPostStoryScaledFrameInput): SharedPostStoryScaledFrame {
  if (contentWidth <= 0 || contentHeight <= 0 || scale <= 0) {
    return {
      width: 0,
      height: 0,
      canvasOffsetX: 0,
      canvasOffsetY: 0,
    };
  }

  const width = contentWidth * scale;
  const height = contentHeight * scale;
  return {
    width,
    height,
    canvasOffsetX: (width - contentWidth) / 2,
    canvasOffsetY: (height - contentHeight) / 2,
  };
}

export function calculateSharedPostStoryScale({
  contentWidth,
  contentHeight,
  availableWidth,
  availableHeight,
}: SharedPostStoryLayout): number {
  if (
    contentWidth <= 0 ||
    contentHeight <= 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return 0;
  }
  return Math.min(
    1,
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  );
}
