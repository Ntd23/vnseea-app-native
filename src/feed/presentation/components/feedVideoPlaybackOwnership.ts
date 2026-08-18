export type FeedPlaybackSurface = 'feed' | 'profile';

export function canApplyFeedPlaybackMutation({
  currentOwner,
  requestOwner,
  isClearing,
}: {
  currentOwner: FeedPlaybackSurface | null;
  requestOwner: FeedPlaybackSurface;
  isClearing: boolean;
}): boolean {
  return !isClearing || currentOwner === null || currentOwner === requestOwner;
}
