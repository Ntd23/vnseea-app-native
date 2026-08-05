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
import { createFeedRepository } from '../ApiFeedRepository';

function rawTextPost(id: number, authorId: string) {
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
      name: 'Author',
      username: authorId,
    },
  };
}

function rawPersonalJobPost(id: number, authorId: string) {
  return {
    ...rawTextPost(id, authorId),
    postText: 'Thư ký',
    postType: 'job',
    job_id: '23',
    job: {
      id: '23',
      post_id: String(id),
      user_id: authorId,
      page_id: '0',
      title: 'Thư ký',
      description: 'Mô tả công việc',
      location: 'Hà Nội',
      job_type: 'full_time',
      category: '13',
      time: 1781712000 - id,
    },
  };
}

describe('ApiFeedRepository user posts latency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the public-video fallback before the own-post request settles', async () => {
    let resolveOwnPosts!: (value: unknown) => void;
    let ownPostsStarted = false;
    let publicVideosStarted = false;

    (backendApi.post as jest.Mock).mockImplementation(
      (route: string, payload: Record<string, unknown>) => {
        if (route !== apiRoutes.feed.posts) {
          return Promise.resolve({ api_status: 200, data: [] });
        }

        if (payload.type === 'get_user_posts') {
          ownPostsStarted = true;
          return new Promise(resolve => {
            resolveOwnPosts = resolve;
          });
        }

        if (payload.type === 'get_random_videos') {
          publicVideosStarted = true;
          return Promise.resolve({ api_status: 200, data: [] });
        }

        return Promise.resolve({ api_status: 200, data: [] });
      },
    );

    const request = createFeedRepository().getUserPosts('author-1', 20);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 0));

    expect(ownPostsStarted).toBe(true);
    expect(publicVideosStarted).toBe(true);

    resolveOwnPosts({
      api_status: 200,
      data: [rawTextPost(1, 'author-1')],
    });

    await expect(request).resolves.toHaveLength(1);
  });

  it('maps a personal job post to the job card model on Profile', async () => {
    (backendApi.post as jest.Mock).mockImplementation(
      async (route: string, payload: Record<string, unknown>) => {
        if (route !== apiRoutes.feed.posts) {
          return { api_status: 200, data: [] };
        }
        if (payload.type === 'get_user_posts') {
          return {
            api_status: 200,
            data: [rawPersonalJobPost(4880, 'author-1')],
          };
        }
        return { api_status: 200, data: [] };
      },
    );

    const posts = await createFeedRepository().getUserPosts('author-1', 20);

    expect(posts).toEqual([
      expect.objectContaining({
        kind: 'job',
        id: '4880',
        job: expect.objectContaining({
          id: '23',
          page_id: '0',
          title: 'Thư ký',
        }),
      }),
    ]);
  });
});
