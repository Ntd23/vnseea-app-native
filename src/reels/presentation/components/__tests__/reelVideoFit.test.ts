import {
  getContainedReelVideoRect,
  getReelVideoNaturalAspectRatio,
} from '../reelVideoFit';

describe('reelVideoFit', () => {
  it.each([
    ['9:16', 9 / 16],
    ['2:3', 2 / 3],
    ['3:4', 3 / 4],
    ['1:1', 1],
    ['16:9', 16 / 9],
  ])('contains %s video without cropping', (_label, aspectRatio) => {
    const rect = getContainedReelVideoRect(390, 844, aspectRatio);

    expect(rect.width).toBeLessThanOrEqual(390);
    expect(rect.height).toBeLessThanOrEqual(844);
    expect(rect.width / rect.height).toBeCloseTo(aspectRatio);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
  });

  it('uses a contained 9:16 frame before metadata is available', () => {
    const rect = getContainedReelVideoRect(390, 844, undefined);

    expect(rect.width / rect.height).toBeCloseTo(9 / 16);
    expect(rect.width).toBe(390);
    expect(rect.top).toBeGreaterThan(0);
  });

  it('returns an empty frame for invalid container dimensions', () => {
    expect(getContainedReelVideoRect(0, 844, 9 / 16)).toEqual({
      width: 0,
      height: 0,
      left: 0,
      top: 0,
    });
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

  it('honors native orientation metadata for rotated video files', () => {
    expect(
      getReelVideoNaturalAspectRatio({
        naturalSize: {
          width: 1920,
          height: 1080,
          orientation: 'portrait',
        },
      }),
    ).toBeCloseTo(9 / 16);
    expect(
      getReelVideoNaturalAspectRatio({
        naturalSize: {
          width: 1080,
          height: 1920,
          orientation: 'landscape',
        },
      }),
    ).toBeCloseTo(16 / 9);
  });
});
