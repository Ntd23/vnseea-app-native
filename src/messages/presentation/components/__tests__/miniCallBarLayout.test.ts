import {
  clampMiniCallBarY,
  getMiniCallBarVerticalBounds,
  MINI_CALL_BAR_HEIGHT,
  MINI_CALL_BAR_WIDTH,
} from '../miniCallBarLayout';

describe('mini call bar layout', () => {
  it('uses the compact floating-card dimensions', () => {
    expect(MINI_CALL_BAR_WIDTH).toBe(220);
    expect(MINI_CALL_BAR_HEIGHT).toBe(64);
  });

  it('keeps vertical dragging between the safe header and bottom navigation', () => {
    const bounds = getMiniCallBarVerticalBounds({
      bottomInset: 34,
      screenHeight: 844,
      topInset: 47,
    });

    expect(bounds).toEqual({ minY: 59, maxY: 662 });
    expect(clampMiniCallBarY(12, bounds)).toBe(59);
    expect(clampMiniCallBarY(340, bounds)).toBe(340);
    expect(clampMiniCallBarY(800, bounds)).toBe(662);
  });

  it('collapses to a single valid position on short screens', () => {
    const bounds = getMiniCallBarVerticalBounds({
      bottomInset: 24,
      screenHeight: 150,
      topInset: 44,
    });

    expect(bounds.maxY).toBe(bounds.minY);
  });
});
