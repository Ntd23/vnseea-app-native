export const FEED_CHROME_HIDE_MIN_Y = 96;
export const FEED_CHROME_HIDE_SCROLL_DELTA = 28;
export const FEED_CHROME_SHOW_SCROLL_DELTA = 14;
export const FEED_CHROME_SHOW_TOP_Y = 32;

export type FeedChromeCollapseState = {
  hidden: boolean;
  lastY: number;
  downwardDelta: number;
  upwardDelta: number;
};

export function createFeedChromeCollapseState(): FeedChromeCollapseState {
  return {
    hidden: false,
    lastY: 0,
    downwardDelta: 0,
    upwardDelta: 0,
  };
}

export function resetFeedChromeScrollIntent(
  state: FeedChromeCollapseState,
): FeedChromeCollapseState {
  return {
    ...state,
    downwardDelta: 0,
    upwardDelta: 0,
  };
}

export function getNextFeedChromeCollapseState(
  state: FeedChromeCollapseState,
  rawY: number,
): FeedChromeCollapseState {
  const y = Math.max(0, rawY);

  if (y < FEED_CHROME_SHOW_TOP_Y) {
    return {
      hidden: false,
      lastY: y,
      downwardDelta: 0,
      upwardDelta: 0,
    };
  }

  const delta = y - state.lastY;

  if (delta > 0) {
    const crossesHideZone =
      y > FEED_CHROME_HIDE_MIN_Y && state.lastY >= FEED_CHROME_HIDE_MIN_Y;
    const downwardDelta = crossesHideZone ? state.downwardDelta + delta : 0;
    const shouldHide =
      y > FEED_CHROME_HIDE_MIN_Y &&
      downwardDelta >= FEED_CHROME_HIDE_SCROLL_DELTA;

    return {
      hidden: shouldHide ? true : state.hidden,
      lastY: y,
      downwardDelta: shouldHide ? 0 : downwardDelta,
      upwardDelta: 0,
    };
  }

  if (delta < 0) {
    const upwardDelta = state.upwardDelta + Math.abs(delta);
    const shouldShow = upwardDelta >= FEED_CHROME_SHOW_SCROLL_DELTA;

    return {
      hidden: shouldShow ? false : state.hidden,
      lastY: y,
      downwardDelta: 0,
      upwardDelta: shouldShow ? 0 : upwardDelta,
    };
  }

  return {
    ...state,
    lastY: y,
  };
}
