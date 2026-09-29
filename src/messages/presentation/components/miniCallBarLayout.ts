export const MINI_CALL_BAR_WIDTH = 220;
export const MINI_CALL_BAR_HEIGHT = 64;
export const MINI_CALL_BAR_EDGE_GAP = 12;

const MINI_CALL_BAR_BOTTOM_NAV_CLEARANCE = 72;

export type MiniCallBarVerticalBounds = {
  minY: number;
  maxY: number;
};

export function getMiniCallBarVerticalBounds({
  bottomInset,
  screenHeight,
  topInset,
}: {
  bottomInset: number;
  screenHeight: number;
  topInset: number;
}): MiniCallBarVerticalBounds {
  const minY = Math.max(0, topInset) + MINI_CALL_BAR_EDGE_GAP;
  const availableMaxY =
    screenHeight -
    Math.max(0, bottomInset) -
    MINI_CALL_BAR_BOTTOM_NAV_CLEARANCE -
    MINI_CALL_BAR_HEIGHT -
    MINI_CALL_BAR_EDGE_GAP;

  return {
    minY,
    maxY: Math.max(minY, availableMaxY),
  };
}

export function clampMiniCallBarY(
  value: number,
  bounds: MiniCallBarVerticalBounds,
) {
  return Math.max(bounds.minY, Math.min(bounds.maxY, value));
}
