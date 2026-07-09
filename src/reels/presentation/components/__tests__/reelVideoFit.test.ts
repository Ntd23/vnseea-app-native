import {
  getReelVideoFitMode,
  getReelVideoNaturalAspectRatio,
} from '../reelVideoFit';

describe('reelVideoFit', () => {
  it('keeps unknown and vertical videos in cover mode', () => {
    expect(getReelVideoFitMode(undefined)).toBe('cover');
    expect(getReelVideoFitMode(720 / 1280)).toBe('cover');
    expect(getReelVideoFitMode(900 / 1200)).toBe('cover');
  });

  it('uses blur contain mode for square and landscape videos', () => {
    expect(getReelVideoFitMode(1)).toBe('blurContain');
    expect(getReelVideoFitMode(16 / 9)).toBe('blurContain');
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
