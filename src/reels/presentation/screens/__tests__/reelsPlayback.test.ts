import { isReelItemActive } from '../reelsPlayback';

describe('reels playback state', () => {
  it('keeps reels paused when the Video tab is mounted but not focused', () => {
    expect(
      isReelItemActive({
        isScreenFocused: false,
        index: 0,
        activeIndex: 0,
      }),
    ).toBe(false);
  });

  it('keeps the active reel playing while comments are open', () => {
    expect(
      isReelItemActive({
        isScreenFocused: true,
        index: 0,
        activeIndex: 0,
      }),
    ).toBe(true);
  });
});
