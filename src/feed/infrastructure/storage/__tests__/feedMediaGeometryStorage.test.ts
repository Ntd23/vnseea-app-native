const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { feedMediaGeometryStorage } from '../feedMediaGeometryStorage';

describe('feedMediaGeometryStorage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockValues.clear();
    feedMediaGeometryStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('persists geometry learned from a legacy poster or video', () => {
    feedMediaGeometryStorage.remember('https://media.vnseea.vn/a.mp4', 1920, 1080);

    expect(
      feedMediaGeometryStorage.getAspectRatio('https://media.vnseea.vn/a.mp4'),
    ).toBeCloseTo(16 / 9);
    jest.runOnlyPendingTimers();
    expect(mockValues.get('aspect-ratios.v1')).toContain(
      'https://media.vnseea.vn/a.mp4',
    );
  });

  it('ignores invalid dimensions and empty media identities', () => {
    feedMediaGeometryStorage.remember('', 100, 100);
    feedMediaGeometryStorage.remember('invalid.mp4', 0, 100);

    expect(
      feedMediaGeometryStorage.getAspectRatio('invalid.mp4'),
    ).toBeUndefined();
    expect(mockValues.has('aspect-ratios.v1')).toBe(false);
  });
});
