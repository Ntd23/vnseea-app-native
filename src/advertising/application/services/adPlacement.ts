// Description: Keeps client-side ad placement rules consistent across surfaces.

function normalizePlacement(appears?: string) {
  return appears?.trim().toLowerCase() ?? '';
}

/**
 * Legacy ads can arrive without an `appears` value. Keep those compatible
 * with the existing delivery behavior while honoring explicit placements.
 */
export function canAdAppearInStoryViewer(appears?: string) {
  const placement = normalizePlacement(appears);
  return placement === '' || placement === 'story' || placement === 'entire';
}

export function canAdAppearInHomeFeed(appears?: string) {
  const placement = normalizePlacement(appears);
  return (
    placement === '' ||
    placement === 'post' ||
    placement === 'timeline' ||
    placement === 'entire'
  );
}
