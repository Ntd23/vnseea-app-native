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

describe('ApiFeedRepository reportPost', () => {
  it('sends the selected report category and detailed reason', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      code: 1,
    });

    const result = await createFeedRepository().reportPost('post-101', {
      categoryCode: 'minor_safety',
      categoryLabel: 'Vấn đề liên quan đến người dưới 18 tuổi',
      reasonCode: 'minor_bullying',
      reasonLabel: 'Bắt nạt hoặc quấy rối',
    });

    expect(backendApi.post).toHaveBeenCalledWith('post-actions', {
      action: 'report',
      post_id: 'post-101',
      ensure_reported: 1,
      reason_code: 'minor_bullying',
      reason: 'Bắt nạt hoặc quấy rối',
      reason_category_code: 'minor_safety',
      reason_category: 'Vấn đề liên quan đến người dưới 18 tuổi',
      text: 'Vấn đề liên quan đến người dưới 18 tuổi: Bắt nạt hoặc quấy rối',
    });
    expect(result).toEqual({ reported: true });
  });
});
