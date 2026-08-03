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

describe('ApiFeedRepository editPost', () => {
  it('uses the existing post-actions edit contract without a new endpoint', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      action: 'edited',
    });

    const result = await createFeedRepository().editPost('post-101', {
      text: 'Nội dung đã sửa',
      privacy: 'friends',
    });

    expect(backendApi.post).toHaveBeenCalledWith('post-actions', {
      action: 'edit',
      post_id: 'post-101',
      text: 'Nội dung đã sửa',
      privacy_type: '1',
      privacy_contract: 'audience_v2',
    });
    expect(result).toEqual({ edited: true });
  });
});
