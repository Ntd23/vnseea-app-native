export const FEED_STARTUP_BACKGROUND_IDLE_MS = 1200;

export function shouldRunFeedStartupBackgroundWork({
  isScrolling,
  isMomentumScrolling,
  lastScrollActivityAtMs,
  nowMs = Date.now(),
}: {
  isScrolling: boolean;
  isMomentumScrolling: boolean;
  lastScrollActivityAtMs: number;
  nowMs?: number;
}) {
  if (isScrolling || isMomentumScrolling) return false;
  if (lastScrollActivityAtMs <= 0) return true;
  return (
    nowMs - lastScrollActivityAtMs >= FEED_STARTUP_BACKGROUND_IDLE_MS
  );
}
