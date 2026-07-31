jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://demo.vnseea.vn',
    apiBaseUrl: 'https://demo.vnseea.vn/api',
    serverKey: 'test-server-key',
    requestTimeoutMs: 10000,
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: jest.fn(() => ({
        accessToken: 'test-token',
        userId: 'viewer-1',
      })),
      getAccessToken: jest.fn(() => 'test-token'),
    },
  }),
);

jest.mock(
  '../../../../reels/infrastructure/storage/reelsReactionsStorage',
  () => ({
    reelsReactionsStorage: {
      get: jest.fn(() => null),
      set: jest.fn(),
    },
  }),
);

import { apiRoutes } from '../../../../shared-kernel/application/constants/route-registry';
import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createFeedRepository } from '../ApiFeedRepository';

describe('ApiFeedRepository post reactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the numeric backend reaction id when a tab is filtered', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      reactions: [
        { reaction: '1', count: 2 },
        { reaction: '2', count: 1 },
      ],
      users: [
        {
          user_id: 'user-3',
          first_name: 'Anh',
          last_name: 'Ba',
          username: 'anhba',
          reaction: '2',
          is_following: 1,
        },
      ],
      next_offset: null,
      reached_end: true,
    });

    const result = await createFeedRepository().getPostReactions(
      'post-42',
      'love',
      20,
      0,
    );

    expect(backendApi.post).toHaveBeenCalledWith(
      apiRoutes.feed.postReactions,
      {},
      {
        params: {
          post_id: 'post-42',
          reaction: '2',
          limit: 20,
          offset: 0,
        },
      },
    );
    expect(result).toEqual({
      users: [
        expect.objectContaining({
          id: 'user-3',
          name: 'Anh Ba',
          reaction: 'love',
          isFollowing: true,
        }),
      ],
      reactions: [
        { reaction: 'like', count: 2 },
        { reaction: 'love', count: 1 },
      ],
      nextOffset: undefined,
      reachedEnd: true,
    });
  });

  it('uses the explicit server offset instead of the mapped user count', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      reactions: [{ reaction: '1', count: 30 }],
      users: [
        { user_id: 'valid-user', username: 'valid', reaction: '1' },
        { username: 'missing-id', reaction: '1' },
      ],
      next_offset: 22,
      reached_end: false,
    });

    const result = await createFeedRepository().getPostReactions(
      'post-42',
      'like',
      20,
      20,
    );

    expect(result.users).toHaveLength(1);
    expect(result.nextOffset).toBe('22');
    expect(result.reachedEnd).toBe(false);
  });
});
