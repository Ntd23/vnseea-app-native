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
    },
  }),
);

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createFeedRepository } from '../ApiFeedRepository';

function rawTextPost(id: number) {
  return {
    id: String(id),
    post_id: String(id),
    user_id: 'author-1',
    postText: `Post ${id}`,
    postPrivacy: '0',
    time: String(1781712000 - id),
    postLikes: '0',
    post_comments: '0',
    publisher: {
      user_id: 'author-1',
      name: 'Author',
      username: 'author',
    },
  };
}

describe('ApiFeedRepository pagination performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a usable partial recommended page without waiting for legacy fan-out', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: Array.from({ length: 9 }, (_, index) => rawTextPost(90 - index)),
      next_cursor: '81',
      reached_end: false,
    });

    const page = await createFeedRepository().getLightPostsPage(
      6,
      '100',
      'all',
      1,
    );

    expect(page.posts).toHaveLength(6);
    expect(page.nextCursor).toBe('81');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });

  it('returns ten recommended rows directly for constrained-network pagination', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: Array.from({ length: 10 }, (_, index) => rawTextPost(90 - index)),
      next_cursor: '80',
      reached_end: false,
    });

    const page = await createFeedRepository().getLightPostsPage(
      10,
      '100',
      'all',
      1,
    );

    expect(page.posts).toHaveLength(10);
    expect(page.nextCursor).toBe('80');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });

  it('retains every mapped row from an oversized cursor window', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: Array.from({ length: 24 }, (_, index) => rawTextPost(90 - index)),
      next_cursor: '66',
      reached_end: false,
    });

    const page = await createFeedRepository().getLightPostsPage(
      10,
      '100',
      'all',
      1,
    );

    expect(page.posts).toHaveLength(10);
    expect(page.prefetchedPosts).toHaveLength(14);
    expect(
      [...page.posts, ...(page.prefetchedPosts ?? [])].map(post => post.id),
    ).toHaveLength(24);
    expect(page.nextCursor).toBe('66');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });
});
