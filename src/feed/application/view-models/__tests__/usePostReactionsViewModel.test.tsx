import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockGetPostReactions = jest.fn();

jest.mock('../../../infrastructure/repositories/ApiFeedRepository', () => ({
  createFeedRepository: () => ({
    getPostReactions: mockGetPostReactions,
  }),
}));

import { usePostReactionsViewModel } from '../usePostReactionsViewModel';

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const completePage = {
  users: [
    {
      id: 'user-1',
      name: 'Like One',
      username: 'like-one',
      reaction: 'like' as const,
      isFollowing: false,
    },
    {
      id: 'user-2',
      name: 'Like Two',
      username: 'like-two',
      reaction: 'like' as const,
      isFollowing: true,
    },
    {
      id: 'user-3',
      name: 'Love One',
      username: 'love-one',
      reaction: 'love' as const,
      isFollowing: true,
    },
  ],
  reactions: [
    { reaction: 'like' as const, count: 2 },
    { reaction: 'love' as const, count: 1 },
  ],
  nextOffset: undefined,
  reachedEnd: true,
};

describe('usePostReactionsViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPostReactions.mockResolvedValue(completePage);
  });

  it('does not request reactions while the shared sheet has no post id', async () => {
    let latest!: ReturnType<typeof usePostReactionsViewModel>;

    function Probe() {
      latest = usePostReactionsViewModel('');
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });

    expect(mockGetPostReactions).not.toHaveBeenCalled();
    expect(latest.isLoading).toBe(false);
    await act(async () => renderer.unmount());
  });

  it('filters a complete all-page locally without another API request', async () => {
    let latest!: ReturnType<typeof usePostReactionsViewModel>;

    function Probe() {
      latest = usePostReactionsViewModel('post-42');
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flushAsyncWork();
    });

    expect(latest.users.map(user => user.id)).toEqual([
      'user-1',
      'user-2',
      'user-3',
    ]);
    expect(mockGetPostReactions).toHaveBeenCalledTimes(1);

    await act(async () => {
      latest.switchTab('like');
    });
    expect(latest.activeTab).toBe('like');
    expect(latest.users.map(user => user.id)).toEqual(['user-1', 'user-2']);

    await act(async () => {
      latest.switchTab('love');
    });
    expect(latest.users.map(user => user.id)).toEqual(['user-3']);

    await act(async () => {
      latest.switchTab('haha');
    });
    expect(latest.users).toEqual([]);
    expect(mockGetPostReactions).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});
