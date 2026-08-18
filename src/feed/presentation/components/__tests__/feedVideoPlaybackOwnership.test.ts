import { canApplyFeedPlaybackMutation } from '../feedVideoPlaybackOwnership';

describe('feed video playback ownership', () => {
  it('lets a focused surface claim playback state', () => {
    expect(
      canApplyFeedPlaybackMutation({
        currentOwner: 'feed',
        requestOwner: 'profile',
        isClearing: false,
      }),
    ).toBe(true);
  });

  it('rejects a late clear from a surface that no longer owns playback', () => {
    expect(
      canApplyFeedPlaybackMutation({
        currentOwner: 'profile',
        requestOwner: 'feed',
        isClearing: true,
      }),
    ).toBe(false);
  });

  it('allows the current owner to release playback', () => {
    expect(
      canApplyFeedPlaybackMutation({
        currentOwner: 'profile',
        requestOwner: 'profile',
        isClearing: true,
      }),
    ).toBe(true);
  });
});
