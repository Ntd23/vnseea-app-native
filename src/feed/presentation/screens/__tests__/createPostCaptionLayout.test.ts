import {
  CAPTION_MAX_HEIGHT,
  CAPTION_MIN_HEIGHT,
  resolveCaptionInputLayout,
} from '../createPostCaptionLayout';

describe('create post caption input layout', () => {
  it('keeps an empty caption at one line even when native reports a larger height', () => {
    expect(resolveCaptionInputLayout('', 180)).toEqual({
      height: CAPTION_MIN_HEIGHT,
      scrollEnabled: false,
    });
  });

  it('uses the native content height without adding vertical padding again', () => {
    expect(resolveCaptionInputLayout('Dòng một\nDòng hai', 52)).toEqual({
      height: 52,
      scrollEnabled: false,
    });
  });

  it('caps long captions and enables internal scrolling', () => {
    expect(resolveCaptionInputLayout('Nội dung dài', 480)).toEqual({
      height: CAPTION_MAX_HEIGHT,
      scrollEnabled: true,
    });
  });
});
