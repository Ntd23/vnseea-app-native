import {
  isInlineLivePostIdViewable,
  pickInlineLivePostId,
} from '../inlineLiveAutoplay';

describe('inline live autoplay selection', () => {
  const liveToken = (postId: number, state = 'live') => ({
    isViewable: true,
    item: {
      type: 'live',
      item: { postId, state },
    },
  });

  it('selects only a viewable active live card', () => {
    expect(
      pickInlineLivePostId([
        { isViewable: true, item: { type: 'post' } },
        liveToken(7, 'stale'),
        liveToken(8),
      ]),
    ).toBe(8);
  });

  it('detects when the active live card leaves the viewport', () => {
    expect(isInlineLivePostIdViewable([liveToken(8)], 8)).toBe(true);
    expect(isInlineLivePostIdViewable([liveToken(9)], 8)).toBe(false);
    expect(
      isInlineLivePostIdViewable(
        [{ ...liveToken(8), isViewable: false }],
        8,
      ),
    ).toBe(false);
  });
});
