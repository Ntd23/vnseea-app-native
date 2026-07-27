const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { hiddenPostsStorage } from '../hiddenPostsStorage';

describe('hiddenPostsStorage', () => {
  beforeEach(() => {
    mockValues.clear();
  });

  it('persists hidden post ids separately for each user', () => {
    hiddenPostsStorage.hidePost('post-10', 'user-1');

    expect(hiddenPostsStorage.isHidden('post-10', 'user-1')).toBe(true);
    expect(hiddenPostsStorage.isHidden('post-10', 'user-2')).toBe(false);
  });

  it('filters hidden posts after the feed is loaded again', () => {
    hiddenPostsStorage.hidePost('post-2', 'user-1');

    expect(
      hiddenPostsStorage.filterVisiblePosts(
        [{ id: 'post-1' }, { id: 'post-2' }, { id: 'post-3' }],
        'user-1',
      ),
    ).toEqual([{ id: 'post-1' }, { id: 'post-3' }]);
  });

  it('deduplicates ids and can clear the local preference', () => {
    hiddenPostsStorage.hidePost('post-10', 'user-1');
    hiddenPostsStorage.hidePost('post-10', 'user-1');

    expect(Array.from(hiddenPostsStorage.getHiddenPostIds('user-1'))).toEqual([
      'post-10',
    ]);

    hiddenPostsStorage.clear('user-1');
    expect(hiddenPostsStorage.isHidden('post-10', 'user-1')).toBe(false);
  });
});
