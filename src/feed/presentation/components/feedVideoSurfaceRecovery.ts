export const FEED_VIDEO_SURFACE_STALL_PROGRESS_SECONDS = 1.25;
export const FEED_VIDEO_SURFACE_MAX_RECOVERY_ATTEMPTS = 1;

export function shouldRecoverFeedVideoSurface({
  isAndroid,
  isActive,
  isPlaying,
  isScrollBusy,
  hasRenderedFrame,
  recoveryInFlight,
  recoveryAttempt,
  playbackWindowStart,
  currentTime,
}: {
  isAndroid: boolean;
  isActive: boolean;
  isPlaying: boolean;
  isScrollBusy: boolean;
  hasRenderedFrame: boolean;
  recoveryInFlight: boolean;
  recoveryAttempt: number;
  playbackWindowStart: number | null;
  currentTime: number;
}) {
  if (
    !isAndroid ||
    !isActive ||
    !isPlaying ||
    isScrollBusy ||
    hasRenderedFrame ||
    recoveryInFlight ||
    recoveryAttempt >= FEED_VIDEO_SURFACE_MAX_RECOVERY_ATTEMPTS ||
    playbackWindowStart === null ||
    currentTime < playbackWindowStart
  ) {
    return false;
  }

  return (
    currentTime - playbackWindowStart >=
    FEED_VIDEO_SURFACE_STALL_PROGRESS_SECONDS
  );
}
