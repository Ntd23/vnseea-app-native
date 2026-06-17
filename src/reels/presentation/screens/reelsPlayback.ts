export function isReelItemActive({
  isScreenFocused,
  isCommentsOpen,
  index,
  activeIndex,
}: {
  isScreenFocused: boolean;
  isCommentsOpen: boolean;
  index: number;
  activeIndex: number;
}) {
  return isScreenFocused && !isCommentsOpen && index === activeIndex;
}
