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

jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: {
    getSession: jest.fn(() => ({
      accessToken: 'test-token',
      userId: 'viewer-1',
    })),
    getAccessToken: jest.fn(() => 'test-token'),
  },
}));

jest.mock('../../../../reels/infrastructure/storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: {
    get: jest.fn(() => null),
  },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createFeedRepository } from '../ApiFeedRepository';
import type { FeedTextPost } from '../../../domain/types/feed.types';

describe('ApiFeedRepository photo URL mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the original album image instead of the generated _small crop for fullscreen photos', async () => {
    const originalUrl =
      'https://demo.vnseea.vn/upload/photos/2026/06/tall_screenshot_image.jpg';
    const smallPath = 'upload/photos/2026/06/tall_screenshot_image_small.jpg';

    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: '200',
      data: [
        {
          id: '123',
          post_id: '123',
          user_id: 'viewer-1',
          postText: 'Tall screenshot',
          postPrivacy: '0',
          time: '1781712000',
          postLikes: '0',
          post_comments: '0',
          publisher: {
            user_id: 'viewer-1',
            name: 'Viewer',
            username: 'viewer',
          },
          photo_album: [
            {
              id: 'photo-1',
              image_org: smallPath,
              image: originalUrl,
            },
          ],
        },
      ],
    });

    const posts = await createFeedRepository().getUserPosts(
      'viewer-1',
      20,
      '999',
    );

    expect((posts[0] as FeedTextPost).photos).toEqual([originalUrl]);
  });
});
