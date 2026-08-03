import {
  getReelVideoFitMode,
  getReelVideoNaturalAspectRatio,
} from '../reelVideoFit';

describe('reelVideoFit', () => {
  it('uses contain while dimensions are unknown so loading never crops', () => {
    expect(getReelVideoFitMode(undefined, 9 / 19.5)).toBe('blurContain');
    expect(getReelVideoFitMode(9 / 16, undefined)).toBe('blurContain');
  });

  it('uses contain for videos wider or taller than the reel frame', () => {
    expect(getReelVideoFitMode(9 / 16, 9 / 19.5)).toBe('blurContain');
    expect(getReelVideoFitMode(9 / 21, 9 / 19.5)).toBe('blurContain');
    expect(getReelVideoFitMode(1, 9 / 19.5)).toBe('blurContain');
    expect(getReelVideoFitMode(16 / 9, 9 / 19.5)).toBe('blurContain');
  });

  it('only uses cover when source and frame ratios match', () => {
    expect(getReelVideoFitMode(9 / 16, 9 / 16)).toBe('cover');
  });

  it('extracts natural aspect ratio from react-native-video load data', () => {
    expect(
      getReelVideoNaturalAspectRatio({
        naturalSize: { width: 1920, height: 1080 },
      }),
    ).toBeCloseTo(16 / 9);
    expect(
      getReelVideoNaturalAspectRatio({
        width: 720,
        height: 1280,
      }),
    ).toBeCloseTo(720 / 1280);
    expect(getReelVideoNaturalAspectRatio({ naturalSize: {} })).toBeUndefined();
  });
});
