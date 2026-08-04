import {
  resolveKeyboardHeightFromFrame,
  resolveKeyboardOverlap,
  resolveKeyboardScreenY,
} from '../keyboardMetrics';

describe('Android keyboard frame metrics', () => {
  it('derives the IME height from screenY when Android reports zero height', () => {
    expect(
      resolveKeyboardHeightFromFrame({ height: 0, screenY: 1420 }, 1920, 0),
    ).toBe(500);
  });

  it('prefers the current screen boundary over a stale reported height', () => {
    expect(
      resolveKeyboardHeightFromFrame({ height: 300, screenY: 1320 }, 1920, 300),
    ).toBe(600);
  });

  it('keeps a valid fallback when screenY is unavailable or implausible', () => {
    expect(
      resolveKeyboardHeightFromFrame({ height: 0, screenY: 0 }, 1920, 336),
    ).toBe(336);
    expect(
      resolveKeyboardHeightFromFrame({ height: 280, screenY: 40 }, 1920, 0),
    ).toBe(280);
  });

  it('never shrinks a valid height when screenY is stale near the screen bottom', () => {
    const height = resolveKeyboardHeightFromFrame(
      { height: 700, screenY: 1800 },
      1920,
      640,
    );

    expect(height).toBe(700);
    expect(resolveKeyboardScreenY({ screenY: 1800 }, 1920, height)).toBe(1220);
  });

  it('does not keep a stale taller fallback after the current IME gets shorter', () => {
    expect(
      resolveKeyboardHeightFromFrame({ height: 300, screenY: 1620 }, 1920, 700),
    ).toBe(300);
  });

  it('resolves a screen boundary for overlap measurement', () => {
    expect(resolveKeyboardScreenY({ screenY: 1420 }, 1920, 500)).toBe(1420);
    expect(resolveKeyboardScreenY(undefined, 1920, 500)).toBe(1420);
    expect(resolveKeyboardScreenY(undefined, 0, 500)).toBeNull();
  });

  it('returns only the part of the panel that still crosses the IME edge', () => {
    expect(resolveKeyboardOverlap(1780, 1420)).toBe(360);
    expect(resolveKeyboardOverlap(1400, 1420)).toBe(0);
  });
});
