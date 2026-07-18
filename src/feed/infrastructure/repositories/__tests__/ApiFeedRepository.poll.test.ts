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

describe('ApiFeedRepository poll mapping', () => {
  it('maps a newly-created poll returned by get-post-data as a poll post', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      post_data: {
        id: 'poll-101',
        poll_id: '1',
        postText: 'Bạn chọn phương án nào?',
        postPrivacy: '0',
        time: '1781712000',
        postLikes: '0',
        post_comments: '0',
        publisher: {
          user_id: 'viewer-1',
          name: 'Viewer',
          username: 'viewer',
        },
        options: [
          {
            id: 'option-1',
            text: 'Phương án 1',
            option_votes: 0,
            percentage: '0%',
            percentage_num: 0,
            all: 0,
          },
          {
            id: 'option-2',
            text: 'Phương án 2',
            option_votes: 0,
            percentage: '0%',
            percentage_num: 0,
            all: 0,
          },
        ],
      },
      post_comments: [],
    });

    const result = await createFeedRepository().getPostById('poll-101', {
      fetchComments: false,
    });

    expect(result.post.kind).toBe('poll');
    if (result.post.kind !== 'poll') return;

    expect(result.post.id).toBe('poll-101');
    expect(result.post.pollQuestion).toBe('Bạn chọn phương án nào?');
    expect(result.post.options.map(option => option.id)).toEqual([
      'option-1',
      'option-2',
    ]);
  });
});
