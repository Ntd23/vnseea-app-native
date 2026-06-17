import { isReelItemActive } from '../reelsPlayback';

describe('reels playback state', () => {
  it('keeps reels paused when the Video tab is mounted but not focused', () => {
    expect(
      isReelItemActive({
        isScreenFocused: false,
        isCommentsOpen: false,
        index: 0,
        activeIndex: 0,
      }),
    ).toBe(false);
  });
});
