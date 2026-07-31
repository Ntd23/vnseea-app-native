const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { storyAdRotationStorage } from '../storyAdRotationStorage';

describe('storyAdRotationStorage', () => {
  beforeEach(() => {
    mockValues.clear();
  });

  it('keeps view history separate for each account', () => {
    storyAdRotationStorage.markViewed('a', 'user-1');

    expect(storyAdRotationStorage.getViewedAdIds('user-1')).toEqual(['a']);
    expect(storyAdRotationStorage.getViewedAdIds('user-2')).toEqual([]);
  });

  it('moves a viewed ad to the newest position without duplicating it', () => {
    storyAdRotationStorage.markViewed('a', 'user-1');
    storyAdRotationStorage.markViewed('b', 'user-1');
    storyAdRotationStorage.markViewed('a', 'user-1');

    expect(storyAdRotationStorage.getViewedAdIds('user-1')).toEqual([
      'b',
      'a',
    ]);
  });
});
