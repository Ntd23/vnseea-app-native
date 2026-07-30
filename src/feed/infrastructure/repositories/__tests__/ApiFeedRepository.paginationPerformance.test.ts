jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
    get: jest.fn(),
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
import { apiRoutes } from '../../../../shared-kernel/application/constants/route-registry';
import {
  createFeedRepository,
  resetFeedRepositoryPaginationStateForTests,
} from '../ApiFeedRepository';

function rawTextPost(
  id: number,
  authorId = 'author-1',
  authorName = 'Author',
) {
  return {
    id: String(id),
    post_id: String(id),
    user_id: authorId,
    postText: `Post ${id}`,
    postPrivacy: '0',
    time: String(1781712000 - id),
    postLikes: '0',
    post_comments: '0',
    publisher: {
      user_id: authorId,
      name: authorName,
      username: authorId,
    },
  };
}

function rawAd(id: number) {
  return {
    id: String(id),
    ad_id: String(id),
    postType: 'ad',
    ad_media: 'https://demo.vnseea.vn/upload/photos/ad.jpg',
    headline: `Ad ${id}`,
    posted: '1781712000',
  };
}

describe('ApiFeedRepository pagination performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFeedRepositoryPaginationStateForTests();
    (backendApi.get as jest.Mock).mockResolvedValue({
      api_status: 200,
      data: [],
    });
  });

  it('keeps full recommended pages on the single-request cursor path', async () => {
    (backendApi.post as jest.Mock).mockImplementation(
      async (route: string, payload: Record<string, unknown>) => {
        if (route !== apiRoutes.feed.recommended) {
          throw new Error(`Unexpected fallback request: ${route}`);
        }
        const isNextPage = Boolean(payload.after_post_id);
        const startId = isNextPage ? 2969 : 3000;
        return {
          api_status: 200,
          data: Array.from({ length: 30 }, (_, index) =>
            rawTextPost(startId - index, 'recommended-author', 'Recommended'),
          ),
          next_cursor: isNextPage ? '2939' : '2970',
          reached_end: false,
        };
      },
    );

    const repository = createFeedRepository();
    const firstPage = await repository.getLightPostsPage(
      10,
      undefined,
      'all',
      1,
    );
    const secondPage = await repository.getLightPostsPage(
      10,
      firstPage.nextCursor,
      'all',
      1,
    );

    expect(firstPage.nextCursor).toBe('2970');
    expect(secondPage.nextCursor).toBe('2939');
    expect(backendApi.post).toHaveBeenCalledTimes(2);
    expect(
      (backendApi.post as jest.Mock).mock.calls.every(
        call => call[0] === apiRoutes.feed.recommended,
      ),
    ).toBe(true);
  });

  it('never accepts an advertisement id as a recommended-feed cursor', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        ...Array.from({ length: 10 }, (_, index) => rawTextPost(100 - index)),
        rawAd(18),
      ],
      next_cursor: '18',
      reached_end: false,
    });

    const page = await createFeedRepository().getLightPostsPage(
      5,
      undefined,
      'all',
      1,
    );

    expect(page.nextCursor).toBe('91');
    expect(page.nextCursor).not.toBe('18');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });

  it('keeps a subsequent full recommended page on the single-request fast path', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: Array.from({ length: 30 }, (_, index) => rawTextPost(90 - index)),
      next_cursor: '60',
      reached_end: false,
    });

    const page = await createFeedRepository().getLightPostsPage(
      10,
      '100',
      'all',
      1,
    );

    expect(page.posts).toHaveLength(10);
    expect(page.prefetchedPosts).toHaveLength(20);
    expect(page.nextCursor).toBe('60');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });

  it('accepts a renderable first page when the server returns below rawLimit', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: Array.from({ length: 12 }, (_, index) => rawTextPost(90 - index)),
      next_cursor: '78',
      reached_end: false,
    });

    const page = await createFeedRepository().getLightPostsPage(
      10,
      undefined,
      'all',
      1,
    );

    expect(page.posts).toHaveLength(10);
    expect(page.prefetchedPosts).toHaveLength(2);
    expect(page.nextCursor).toBe('78');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });

  it('keeps periodic latest-post probes on the recommended endpoint only', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [rawTextPost(500)],
      next_cursor: '500',
      reached_end: true,
    });

    const posts = await createFeedRepository().getLatestPosts(8, 'all');

    expect(posts.map(post => post.id)).toEqual(['500']);
    expect(backendApi.post).toHaveBeenCalledTimes(1);
    expect(backendApi.post).toHaveBeenCalledWith(
      apiRoutes.feed.recommended,
      expect.objectContaining({ limit: 8, source: 'all' }),
    );
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
      'following',
      1,
    );

    expect(page.posts).toHaveLength(6);
    expect(page.nextCursor).toBe('81');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });

  it('returns a mostly filled load-more page without starting legacy discovery', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: Array.from({ length: 7 }, (_, index) => rawTextPost(90 - index)),
      next_cursor: '83',
      reached_end: false,
    });

    const page = await createFeedRepository().getLightPostsPage(
      10,
      '100',
      'all',
      1,
    );

    expect(page.posts).toHaveLength(7);
    expect(page.nextCursor).toBe('83');
    expect(backendApi.post).toHaveBeenCalledTimes(1);
    expect(backendApi.post).toHaveBeenCalledWith(
      apiRoutes.feed.recommended,
      expect.objectContaining({ after_post_id: '100' }),
    );
  });

  it('fills an advancing but unusably sparse recommended page from the legacy lane', async () => {
    (backendApi.post as jest.Mock)
      .mockResolvedValueOnce({
        api_status: 200,
        data: [rawTextPost(99), rawTextPost(98)],
        next_cursor: '90',
        reached_end: false,
      })
      .mockResolvedValueOnce({
        api_status: 200,
        data: Array.from({ length: 6 }, (_, index) => rawTextPost(89 - index)),
      });

    const page = await createFeedRepository().getLightPostsPage(
      6,
      '100',
      'following',
      1,
    );

    expect(page.posts).toHaveLength(6);
    expect(page.prefetchedPosts).toHaveLength(2);
    expect(page.nextCursor).toBe('98');
    expect(backendApi.post).toHaveBeenCalledTimes(2);
    expect(backendApi.post).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        type: 'get_news_feed',
        after_post_id: '100',
      }),
    );
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
      'following',
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
      'following',
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

  it('keeps scanning sparse pages while the cursor advances despite a false reached-end flag', async () => {
    (backendApi.post as jest.Mock)
      .mockResolvedValueOnce({
        api_status: 200,
        data: [rawTextPost(99), rawTextPost(98)],
        next_cursor: '90',
        reached_end: true,
      })
      .mockResolvedValueOnce({
        api_status: 200,
        data: [],
      })
      .mockResolvedValueOnce({
        api_status: 200,
        data: [
          rawTextPost(89),
          rawTextPost(88),
          rawTextPost(87),
          rawTextPost(86),
        ],
        next_cursor: '80',
        reached_end: false,
      });

    const page = await createFeedRepository().getLightPostsPage(
      6,
      '100',
      'following',
      2,
    );

    expect(page.posts).toHaveLength(6);
    expect(page.nextCursor).toBe('80');
    expect(page.reachedEnd).toBe(false);
    expect(backendApi.post).toHaveBeenCalledTimes(3);
  });

  it('pins one discovery-author cohort for the complete cursor run', async () => {
    const firstPageAuthors: string[] = [];
    const nextPageAuthors: string[] = [];

    (backendApi.get as jest.Mock).mockResolvedValue({
      api_status: 200,
      data: [],
    });
    (backendApi.post as jest.Mock).mockImplementation(
      async (route: string, payload: Record<string, unknown>) => {
        if (route === apiRoutes.feed.recommended) {
          return {
            api_status: 200,
            data: [],
            reached_end: true,
          };
        }

        if (route === apiRoutes.user.suggestions) {
          return {
            api_status: 200,
            suggestions: Array.from({ length: 25 }, (_, index) => ({
              user_id: `author-${index + 1}`,
            })),
          };
        }

        if (route === apiRoutes.social.friends) {
          return {
            api_status: 200,
            data: { following: [], followers: [] },
          };
        }

        if (route === apiRoutes.user.nearby) {
          return { api_status: 200, nearby_users: [] };
        }

        if (route === apiRoutes.feed.posts) {
          if (payload.type === 'get_news_feed') {
            return { api_status: 200, data: [] };
          }

          const authorId = String(payload.id ?? '');
          if (authorId === 'viewer-1') {
            return { api_status: 200, data: [] };
          }

          if (payload.type === 'get_user_posts' && authorId) {
            const authorNumber = Number(authorId.replace('author-', ''));
            const isNextPage = Boolean(payload.after_post_id);
            (isNextPage ? nextPageAuthors : firstPageAuthors).push(authorId);
            return {
              api_status: 200,
              data: [
                rawTextPost(
                  (isNextPage ? 500 : 1000) -
                    (Number.isFinite(authorNumber) ? authorNumber : 0),
                ),
              ],
            };
          }
        }

        return { api_status: 200, data: [] };
      },
    );

    const repository = createFeedRepository();
    const firstPage = await repository.getLightPostsPage(
      5,
      undefined,
      'all',
      1,
    );
    await repository.getLightPostsPage(
      5,
      firstPage.nextCursor,
      'all',
      1,
    );

    expect(firstPageAuthors).toHaveLength(8);
    expect(nextPageAuthors).toEqual(firstPageAuthors);
  });

  it('keeps legacy discovery moving when an ad and a sparse author have very old ids', async () => {
    const discoveryCursors: string[] = [];

    (backendApi.post as jest.Mock).mockImplementation(
      async (route: string, payload: Record<string, unknown>) => {
        if (route === apiRoutes.feed.recommended) {
          throw new Error('404 API Type Not Found');
        }

        if (route === apiRoutes.user.suggestions) {
          return {
            api_status: 200,
            suggestions: [
              { user_id: 'active-author' },
              { user_id: 'sparse-author' },
            ],
          };
        }

        if (route === apiRoutes.social.friends) {
          return {
            api_status: 200,
            data: { following: [], followers: [] },
          };
        }

        if (route === apiRoutes.user.nearby) {
          return { api_status: 200, nearby_users: [] };
        }

        if (route === apiRoutes.feed.posts) {
          if (payload.type === 'get_news_feed' || payload.id === 'viewer-1') {
            return { api_status: 200, data: [] };
          }

          if (payload.type === 'get_user_posts') {
            const authorId = String(payload.id ?? '');
            const cursor = String(payload.after_post_id ?? 'first');
            discoveryCursors.push(cursor);

            if (authorId === 'active-author') {
              const start = cursor === 'first' ? 5000 : 4990;
              return {
                api_status: 200,
                data: Array.from({ length: 10 }, (_, index) =>
                  rawTextPost(start - index, authorId),
                ),
              };
            }

            if (authorId === 'sparse-author') {
              return {
                api_status: 200,
                data: [rawTextPost(18, authorId), rawAd(18)],
              };
            }
          }
        }

        return { api_status: 200, data: [] };
      },
    );

    const repository = createFeedRepository();
    const firstPage = await repository.getLightPostsPage(
      5,
      undefined,
      'all',
      1,
    );
    const secondPage = await repository.getLightPostsPage(
      5,
      firstPage.nextCursor,
      'all',
      1,
    );

    expect(firstPage.nextCursor).toBe('4991');
    expect(secondPage.nextCursor).toBe('4981');
    expect(discoveryCursors).toContain('4991');
    expect(discoveryCursors).not.toContain('18');
    expect(
      (backendApi.post as jest.Mock).mock.calls.filter(
        call => call[0] === apiRoutes.feed.recommended,
      ),
    ).toHaveLength(1);
  });

  it('does not let a fresh background request replace an active light-feed author cohort', async () => {
    const requestedAuthors = {
      first: [] as string[],
      fresh: [] as string[],
      next: [] as string[],
    };
    let phase: keyof typeof requestedAuthors = 'first';

    (backendApi.post as jest.Mock).mockImplementation(
      async (route: string, payload: Record<string, unknown>) => {
        if (route === apiRoutes.feed.recommended) {
          return {
            api_status: 200,
            data: [],
            reached_end: false,
          };
        }

        if (route === apiRoutes.user.suggestions) {
          return {
            api_status: 200,
            suggestions: Array.from({ length: 25 }, (_, index) => ({
              user_id: `author-${index + 1}`,
            })),
          };
        }

        if (route === apiRoutes.social.friends) {
          return {
            api_status: 200,
            data: { following: [], followers: [] },
          };
        }

        if (route === apiRoutes.user.nearby) {
          return { api_status: 200, nearby_users: [] };
        }

        if (route === apiRoutes.feed.posts) {
          if (payload.type === 'get_news_feed') {
            return { api_status: 200, data: [] };
          }

          const authorId = String(payload.id ?? '');
          if (authorId === 'viewer-1') {
            return { api_status: 200, data: [] };
          }

          if (payload.type === 'get_user_posts' && authorId) {
            requestedAuthors[phase].push(authorId);
            const authorNumber = Number(authorId.replace('author-', ''));
            const phaseBase =
              phase === 'first' ? 1000 : phase === 'fresh' ? 750 : 500;
            return {
              api_status: 200,
              data: [
                rawTextPost(
                  phaseBase -
                    (Number.isFinite(authorNumber) ? authorNumber : 0),
                  authorId,
                ),
              ],
            };
          }
        }

        return { api_status: 200, data: [] };
      },
    );

    const repository = createFeedRepository();
    const firstPage = await repository.getLightPostsPage(
      5,
      undefined,
      'all',
      1,
    );
    phase = 'fresh';
    await repository.getAllPosts(5, undefined, 'all');
    phase = 'next';
    await repository.getLightPostsPage(
      5,
      firstPage.nextCursor,
      'all',
      1,
    );

    expect(requestedAuthors.first).toHaveLength(8);
    expect(requestedAuthors.fresh).toEqual(requestedAuthors.first);
    expect(requestedAuthors.next).toEqual(requestedAuthors.first);
  });
});
