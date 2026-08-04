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

jest.mock(
  '../../../../shared-kernel/application/view-models/useShareViewModel',
  () => ({
    getShareableUrl: jest.fn(async () => 'https://demo.vnseea.vn/post/42'),
  }),
);

jest.mock('../../../../reels/infrastructure/storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: {
    get: jest.fn(() => null),
  },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createFeedRepository } from '../ApiFeedRepository';

describe('ApiFeedRepository message sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (backendApi.post as jest.Mock).mockResolvedValue({ api_status: 200 });
  });

  it('sends a post link to a one-to-one conversation', async () => {
    await createFeedRepository().sharePost({
      postId: '42',
      destination: 'message',
      recipientUserId: '8',
      text: 'Xem bài này',
    });

    expect(backendApi.post).toHaveBeenCalledWith(
      'send-message',
      expect.objectContaining({
        user_id: '8',
        text: 'Xem bài này\n\nhttps://demo.vnseea.vn/post/42',
        message_hash_id: expect.stringMatching(/^[0-9]+-[a-z0-9]+$/),
      }),
    );
    const payload = (backendApi.post as jest.Mock).mock.calls[0][1];
    expect(payload).not.toHaveProperty('message_type');
  });

  it('marks a live link sent to a one-to-one conversation', async () => {
    await createFeedRepository().sharePost({
      postId: '42',
      destination: 'message',
      recipientUserId: '8',
      sourceKind: 'live',
    });

    expect(backendApi.post).toHaveBeenCalledWith(
      'send-message',
      expect.objectContaining({
        user_id: '8',
        text: 'https://demo.vnseea.vn/post/42?live=1',
      }),
    );
  });

  it('sends a post link to a group conversation through group_chat', async () => {
    await createFeedRepository().sharePost({
      postId: '42',
      destination: 'message',
      recipientGroupId: '9',
    });

    expect(backendApi.post).toHaveBeenCalledWith('group_chat', {
      type: 'send',
      id: '9',
      text: 'https://demo.vnseea.vn/post/42',
    });
  });

  it('rejects ambiguous message targets', async () => {
    await expect(
      createFeedRepository().sharePost({
        postId: '42',
        destination: 'message',
        recipientUserId: '8',
        recipientGroupId: '9',
      }),
    ).rejects.toThrow('Thiếu hoặc trùng đích nhận');
    expect(backendApi.post).not.toHaveBeenCalled();
  });

  it('rejects an internal-share success envelope without a persisted post id', async () => {
    (backendApi.post as jest.Mock).mockResolvedValue({
      api_status: 200,
      data: { id: 0 },
    });

    await expect(
      createFeedRepository().sharePost({
        postId: '42',
        destination: 'timeline',
        userId: 'viewer-1',
      }),
    ).rejects.toThrow('Không thể chia sẻ bài viết');
  });
});
