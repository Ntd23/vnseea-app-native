import {
  FEED_STARTUP_BACKGROUND_IDLE_MS,
  shouldRunFeedStartupBackgroundWork,
} from '../feedStartupBackgroundWork';

describe('feed startup background work', () => {
  const nowMs = 10_000;

  it('waits through drag and momentum scrolling', () => {
    expect(
      shouldRunFeedStartupBackgroundWork({
        isScrolling: true,
        isMomentumScrolling: false,
        lastScrollActivityAtMs: 0,
        nowMs,
      }),
    ).toBe(false);
    expect(
      shouldRunFeedStartupBackgroundWork({
        isScrolling: false,
        isMomentumScrolling: true,
        lastScrollActivityAtMs: 0,
        nowMs,
      }),
    ).toBe(false);
  });

  it('requires a sustained quiet window after the last scroll', () => {
    expect(
      shouldRunFeedStartupBackgroundWork({
        isScrolling: false,
        isMomentumScrolling: false,
        lastScrollActivityAtMs:
          nowMs - FEED_STARTUP_BACKGROUND_IDLE_MS + 1,
        nowMs,
      }),
    ).toBe(false);
    expect(
      shouldRunFeedStartupBackgroundWork({
        isScrolling: false,
        isMomentumScrolling: false,
        lastScrollActivityAtMs:
          nowMs - FEED_STARTUP_BACKGROUND_IDLE_MS,
        nowMs,
      }),
    ).toBe(true);
  });

  it('allows delayed warmup when the user has not scrolled yet', () => {
    expect(
      shouldRunFeedStartupBackgroundWork({
        isScrolling: false,
        isMomentumScrolling: false,
        lastScrollActivityAtMs: 0,
        nowMs,
      }),
    ).toBe(true);
  });
});
