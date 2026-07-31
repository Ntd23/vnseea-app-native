jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://v2.vnseea.test',
    apiBaseUrl: 'https://v2.vnseea.test/api',
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

import { apiRoutes } from '../../../../shared-kernel/application/constants/route-registry';
import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import {
  createFeedRepository,
  resetFeedRepositoryPaginationStateForTests,
} from '../ApiFeedRepository';

const groupRecipient = {
  group_id: '27',
  group_name: 'hoi-meme-vui',
  group_title: 'Hội Meme video hài bựa',
  avatar: 'upload/photos/group-avatar.jpg',
  privacy: '1',
};

function rawGroupPost(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id: String(id),
    post_id: String(id),
    user_id: '19',
    group_id: '27',
    group_recipient: groupRecipient,
    publisher: {
      user_id: '19',
      name: 'Peter Nguyen',
      username: 'peter',
      avatar: 'https://cdn.vnseea.test/peter.jpg',
    },
    postText: `Bài đăng nhóm ${id}`,
    postPrivacy: '0',
    time: String(1785510000 + id),
    postLikes: '3',
    post_comments: '2',
    can_share: '1',
    ...overrides,
  };
}

function mockRecommendedRows(rows: Array<Record<string, unknown>>) {
  (backendApi.post as jest.Mock).mockImplementation(async (route: string) => {
    if (route !== apiRoutes.feed.recommended) {
      throw new Error(`Unexpected feed fallback request: ${route}`);
    }
    return {
      api_status: 200,
      data: rows,
      next_cursor: '270',
      reached_end: false,
    };
  });
}

describe('ApiFeedRepository group posts in Home Feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFeedRepositoryPaginationStateForTests();
    (backendApi.get as jest.Mock).mockResolvedValue({
      api_status: 200,
      data: [],
    });
  });

  it('keeps group text and poll posts in the light Home Feed page', async () => {
    const rows = Array.from({ length: 30 }, (_, index) =>
      rawGroupPost(300 - index),
    );
    rows[0] = rawGroupPost(300, {
      poll_id: '1',
      options: [
        {
          id: '1',
          text: 'Có',
          option_votes: 2,
          percentage: '100%',
          all: 2,
        },
      ],
    });
    mockRecommendedRows(rows);

    const page = await createFeedRepository().getLightPostsPage(
      2,
      undefined,
      'all',
      1,
    );

    expect(page.posts.map(post => post.kind)).toEqual(['poll', 'text']);
    expect(page.posts.every(post => post.groupContext?.id === '27')).toBe(true);
    expect(page.posts[0].groupContext?.title).toBe('Hội Meme video hài bựa');
  });

  it('keeps newly published group posts in the latest-post refresh probe', async () => {
    mockRecommendedRows([
      rawGroupPost(403),
      rawGroupPost(402),
      rawGroupPost(401),
    ]);

    const posts = await createFeedRepository().getLatestPosts(3, 'all');

    expect(posts).toHaveLength(3);
    expect(posts.every(post => post.groupContext?.id === '27')).toBe(true);
  });

  it('keeps group videos in the Home Feed video buffer', async () => {
    mockRecommendedRows([
      rawGroupPost(503, {
        postType: 'video',
        postFile: 'https://cdn.vnseea.test/group-503.mp4',
      }),
      rawGroupPost(502, {
        postType: 'video',
        postFile: 'https://cdn.vnseea.test/group-502.mp4',
      }),
      rawGroupPost(501, {
        postType: 'video',
        postFile: 'https://cdn.vnseea.test/group-501.mp4',
      }),
    ]);

    const posts = await createFeedRepository().getVideoPosts(
      2,
      undefined,
      'all',
    );

    expect(posts).toHaveLength(2);
    expect(posts.every(post => post.groupContext?.id === '27')).toBe(true);
  });
});
