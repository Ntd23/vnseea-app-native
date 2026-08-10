export function resolveFeedVideoPageCursor({
  currentCursor,
  nextCursor,
}: {
  currentCursor?: string;
  nextCursor?: string;
  reachedEnd: boolean;
}) {
  const hasAdvancingCursor = Boolean(
    nextCursor && nextCursor !== currentCursor,
  );

  // Some feed responses set reachedEnd while still supplying a valid older
  // cursor. Advancing is the stronger signal and keeps sparse video windows
  // from being treated as the end of the lane.
  if (!hasAdvancingCursor) {
    return { nextCursor: undefined, reachedEnd: true } as const;
  }

  return { nextCursor, reachedEnd: false } as const;
}
