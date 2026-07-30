import {
  FEED_CHROME_HIDE_MIN_Y,
  FEED_CHROME_HIDE_SCROLL_DELTA,
  FEED_CHROME_SHOW_SCROLL_DELTA,
  FEED_CHROME_SHOW_TOP_Y,
  createFeedChromeCollapseState,
  createFeedChromeCollapseStateAtScrollY,
  getNextFeedChromeCollapseState,
  resetFeedChromeScrollIntent,
} from '../feedChromeCollapse';

describe('feed chrome scroll-collapse intent', () => {
  it('hides after scrolling down past the minimum offset and delta threshold', () => {
    let state = createFeedChromeCollapseState();

    state = getNextFeedChromeCollapseState(state, FEED_CHROME_HIDE_MIN_Y + 8);
    expect(state.hidden).toBe(false);

    state = getNextFeedChromeCollapseState(
      state,
      FEED_CHROME_HIDE_MIN_Y + FEED_CHROME_HIDE_SCROLL_DELTA + 10,
    );

    expect(state.hidden).toBe(true);
    expect(state.downwardDelta).toBe(0);
  });

  it('shows again after scrolling up past the upward delta threshold', () => {
    let state = createFeedChromeCollapseState();
    state = getNextFeedChromeCollapseState(state, 130);
    state = getNextFeedChromeCollapseState(state, 170);
    expect(state.hidden).toBe(true);

    state = getNextFeedChromeCollapseState(
      state,
      170 - FEED_CHROME_SHOW_SCROLL_DELTA - 2,
    );

    expect(state.hidden).toBe(false);
    expect(state.upwardDelta).toBe(0);
  });

  it('shows again as soon as the user scrolls upward', () => {
    let state = createFeedChromeCollapseState();
    state = getNextFeedChromeCollapseState(state, 130);
    state = getNextFeedChromeCollapseState(state, 170);
    expect(state.hidden).toBe(true);

    state = getNextFeedChromeCollapseState(state, 169);

    expect(state.hidden).toBe(false);
    expect(state.upwardDelta).toBe(0);
  });

  it('always shows near the top of the feed', () => {
    let state = createFeedChromeCollapseState();
    state = getNextFeedChromeCollapseState(state, 140);
    state = getNextFeedChromeCollapseState(state, 180);
    expect(state.hidden).toBe(true);

    state = getNextFeedChromeCollapseState(state, FEED_CHROME_SHOW_TOP_Y - 1);

    expect(state.hidden).toBe(false);
    expect(state.lastY).toBe(FEED_CHROME_SHOW_TOP_Y - 1);
  });

  it('rehydrates a hidden state when Home regains focus at a deep offset', () => {
    const state = createFeedChromeCollapseStateAtScrollY(
      FEED_CHROME_HIDE_MIN_Y + FEED_CHROME_HIDE_SCROLL_DELTA + 1,
    );

    expect(state.hidden).toBe(true);
    expect(state.lastY).toBe(
      FEED_CHROME_HIDE_MIN_Y + FEED_CHROME_HIDE_SCROLL_DELTA + 1,
    );
    expect(state.downwardDelta).toBe(0);
    expect(state.upwardDelta).toBe(0);
  });

  it('normalizes invalid offsets while restoring Home chrome', () => {
    expect(createFeedChromeCollapseStateAtScrollY(Number.NaN)).toEqual(
      createFeedChromeCollapseState(),
    );
    expect(createFeedChromeCollapseStateAtScrollY(-20).lastY).toBe(0);
  });

  it('ignores negative pull-to-refresh bounce and can reset drag intent', () => {
    let state = createFeedChromeCollapseState();
    state = getNextFeedChromeCollapseState(state, -40);

    expect(state.hidden).toBe(false);
    expect(state.lastY).toBe(0);

    state = getNextFeedChromeCollapseState(state, 150);
    state = getNextFeedChromeCollapseState(
      state,
      150 + FEED_CHROME_HIDE_SCROLL_DELTA + 2,
    );
    expect(state.hidden).toBe(true);

    state = resetFeedChromeScrollIntent(state);

    expect(state.downwardDelta).toBe(0);
    expect(state.upwardDelta).toBe(0);
    expect(state.hidden).toBe(true);
  });
});
