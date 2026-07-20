import {
  FEED_VIDEO_SURFACE_MAX_RECOVERY_ATTEMPTS,
  shouldRecoverFeedVideoSurface,
} from '../feedVideoSurfaceRecovery';

const baseInput = {
  isAndroid: true,
  isActive: true,
  isPlaying: true,
  isScrollBusy: false,
  hasRenderedFrame: false,
  recoveryInFlight: false,
  recoveryAttempt: 0,
  playbackWindowStart: 10,
  currentTime: 11.3,
};

describe('feed video surface recovery', () => {
  it('recovers when Android playback advances without a rendered frame', () => {
    expect(shouldRecoverFeedVideoSurface(baseInput)).toBe(true);
  });

  it('does not recover a video that rendered its first frame', () => {
    expect(
      shouldRecoverFeedVideoSurface({
        ...baseInput,
        hasRenderedFrame: true,
      }),
    ).toBe(false);
  });

  it('does not recover while scrolling or on non-Android platforms', () => {
    expect(
      shouldRecoverFeedVideoSurface({ ...baseInput, isScrollBusy: true }),
    ).toBe(false);
    expect(
      shouldRecoverFeedVideoSurface({ ...baseInput, isAndroid: false }),
    ).toBe(false);
  });

  it('caps recovery attempts to avoid a remount loop', () => {
    expect(
      shouldRecoverFeedVideoSurface({
        ...baseInput,
        recoveryAttempt: FEED_VIDEO_SURFACE_MAX_RECOVERY_ATTEMPTS,
      }),
    ).toBe(false);
  });
});
