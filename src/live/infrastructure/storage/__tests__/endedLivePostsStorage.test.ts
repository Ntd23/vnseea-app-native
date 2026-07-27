const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { endedLivePostsStorage } from '../endedLivePostsStorage';

describe('endedLivePostsStorage', () => {
  beforeEach(() => {
    mockValues.clear();
  });

  it('persists ended live posts separately for each signed-in user', () => {
    endedLivePostsStorage.markEnded(42, 'user-1');

    expect(endedLivePostsStorage.hasEnded(42, 'user-1')).toBe(true);
    expect(endedLivePostsStorage.hasEnded(42, 'user-2')).toBe(false);
  });

  it('filters the ended post from feed posts and live discovery', () => {
    endedLivePostsStorage.markEnded('42', 'user-1');

    expect(
      endedLivePostsStorage.filterVisiblePosts(
        [{ id: '41' }, { id: '42' }, { id: '43' }],
        'user-1',
      ),
    ).toEqual([{ id: '41' }, { id: '43' }]);
    expect(
      endedLivePostsStorage.filterActiveStreams(
        [{ postId: 42 }, { postId: 44 }],
        'user-1',
      ),
    ).toEqual([{ postId: 44 }]);
  });

  it('deduplicates ids and can clear the local state', () => {
    endedLivePostsStorage.markEnded('42', 'user-1');
    endedLivePostsStorage.markEnded('42', 'user-1');

    expect(
      Array.from(endedLivePostsStorage.getEndedPostIds('user-1')),
    ).toEqual(['42']);

    endedLivePostsStorage.clear('user-1');
    expect(endedLivePostsStorage.hasEnded('42', 'user-1')).toBe(false);
  });
});
