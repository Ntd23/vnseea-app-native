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

  it('persists a learned aspect ratio for legacy media', () => {
    feedMediaGeometryStorage.remember('https://media.vnseea.vn/a.jpg', 1200, 800);

    expect(
      feedMediaGeometryStorage.getAspectRatio(
        'https://media.vnseea.vn/a.jpg',
      ),
    ).toBe(1.5);
    jest.runOnlyPendingTimers();
    expect(mockValues.get('aspect-ratios.v1')).toContain(
      'https://media.vnseea.vn/a.jpg',
    );
  });

  it('ignores invalid dimensions and empty media identities', () => {
    feedMediaGeometryStorage.remember('', 100, 100);
    feedMediaGeometryStorage.remember('invalid.jpg', 0, 100);

    expect(
      feedMediaGeometryStorage.getAspectRatio('invalid.jpg'),
    ).toBeUndefined();
    expect(mockValues.has('aspect-ratios.v1')).toBe(false);
  });
});
