export type TabReselectAction = 'scroll-to-top' | 'refresh';

export const TAB_RESELECT_TOP_THRESHOLD = 12;

export function getTabReselectAction(
  contentOffsetY: number,
  topThreshold = TAB_RESELECT_TOP_THRESHOLD,
): TabReselectAction {
  const normalizedOffset = Number.isFinite(contentOffsetY)
    ? Math.max(0, contentOffsetY)
    : 0;
  const normalizedThreshold = Number.isFinite(topThreshold)
    ? Math.max(0, topThreshold)
    : TAB_RESELECT_TOP_THRESHOLD;

  return normalizedOffset > normalizedThreshold
    ? 'scroll-to-top'
    : 'refresh';
}
