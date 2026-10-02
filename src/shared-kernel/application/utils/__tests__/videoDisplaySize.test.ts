import { orientVideoSize } from '../videoDisplaySize';

describe('orientVideoSize', () => {
  it('turns a portrait recording the iOS picker reports landscape upright', () => {
    expect(orientVideoSize({ width: 1920, height: 1080 }, { width: 166, height: 295 })).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it('keeps sizes that already match the frame', () => {
    expect(orientVideoSize({ width: 1920, height: 1080 }, { width: 525, height: 295 })).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(orientVideoSize({ width: 1080, height: 1920 }, { width: 166, height: 295 })).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it('falls back to whichever size is usable', () => {
    expect(orientVideoSize({ width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 });
    expect(orientVideoSize({}, { width: 166, height: 295 })).toEqual({ width: 166, height: 295 });
    expect(orientVideoSize({ width: 0 }, { width: 200, height: 200 })).toEqual({ width: 0 });
  });
});
