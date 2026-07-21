import {
  getIosLiveKeyboardTranslation,
  getStableLivePreviewDimensions,
} from '../livePreviewLayout';

describe('live preview layout', () => {
  it('keeps preview dimensions tied to the physical screen', () => {
    expect(getStableLivePreviewDimensions({ width: 390, height: 844 })).toEqual(
      { width: 390, height: 844 },
    );
  });

  it('places the bottom controls eight points above the iOS keyboard', () => {
    expect(
      getIosLiveKeyboardTranslation({
        screenHeight: 844,
        keyboardScreenY: 500,
        bottomInset: 34,
      }),
    ).toBe(-310);
  });

  it('does not move controls when the keyboard is hidden', () => {
    expect(
      getIosLiveKeyboardTranslation({
        screenHeight: 844,
        keyboardScreenY: 844,
        bottomInset: 34,
      }),
    ).toBe(0);
  });
});
