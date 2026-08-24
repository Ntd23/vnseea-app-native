export const CAPTION_LINE_HEIGHT = 24;
export const CAPTION_MAX_LINES = 12;
export const CAPTION_MEASURE_LINES = CAPTION_MAX_LINES + 1;
export const CAPTION_VERTICAL_PADDING = 4;
export const CAPTION_MIN_HEIGHT =
  CAPTION_LINE_HEIGHT + CAPTION_VERTICAL_PADDING;
export const CAPTION_MAX_HEIGHT =
  CAPTION_LINE_HEIGHT * CAPTION_MAX_LINES + CAPTION_VERTICAL_PADDING;

export type CaptionInputLayout = {
  height: number;
  scrollEnabled: boolean;
};

export function resolveCaptionInputLayout(
  value: string,
  nativeContentHeight: number,
): CaptionInputLayout {
  if (value.length === 0) {
    return {
      height: CAPTION_MIN_HEIGHT,
      scrollEnabled: false,
    };
  }

  const measuredHeight = Number.isFinite(nativeContentHeight)
    ? Math.ceil(nativeContentHeight)
    : CAPTION_MIN_HEIGHT;

  return {
    height: Math.max(
      CAPTION_MIN_HEIGHT,
      Math.min(CAPTION_MAX_HEIGHT, measuredHeight),
    ),
    scrollEnabled: measuredHeight > CAPTION_MAX_HEIGHT,
  };
}
