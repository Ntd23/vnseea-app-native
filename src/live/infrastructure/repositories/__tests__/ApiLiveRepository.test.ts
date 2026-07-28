const mockPost = jest.fn();

jest.mock(
  '../../../../shared-kernel/infrastructure/api/apiBridge',
  () => ({
    apiBridge: {
      get: jest.fn(),
      multipart: jest.fn(),
      post: (...args: unknown[]) => mockPost(...args),
    },
  }),
);

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    apiBaseUrl: 'https://example.test/api',
    requestTimeoutMs: 15_000,
    serverKey: 'test-server-key',
    webBaseUrl: 'https://example.test',
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getAccessToken: () => 'test-token',
      getSession: () => ({ userId: 'viewer-1' }),
    },
  }),
);

import { ApiBridgeError } from '../../../../shared-kernel/application/api/apiResponse';
import { createLiveRepository } from '../ApiLiveRepository';

describe('ApiLiveRepository.getLivePost', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('maps the backend Post not found envelope to an ended live', async () => {
    mockPost.mockRejectedValueOnce(
      new ApiBridgeError('Post not found', '400'),
    );

    await expect(createLiveRepository().getLivePost(42)).resolves.toBeNull();
  });

  it('does not hide transport failures as an ended live', async () => {
    const networkError = new ApiBridgeError(
      'Network Error: https://example.test/api/get-post-data',
      'ERR_NETWORK',
    );
    mockPost.mockRejectedValueOnce(networkError);

    await expect(createLiveRepository().getLivePost(42)).rejects.toBe(
      networkError,
    );
  });

  it('prefers explicit backend live state over an old heartbeat timestamp', async () => {
    mockPost.mockResolvedValueOnce({
      api_status: 200,
      post_data: {
        id: 42,
        live_ended: 0,
        live_time: 1,
        postType: 'live',
        publisher: {
          first_name: 'Live',
          last_name: 'Host',
          user_id: '7',
        },
        stream_name: 'stream-42',
        stream_state: 'live',
      },
    });

    await expect(createLiveRepository().getLivePost(42)).resolves.toMatchObject(
      {
        postId: 42,
        state: 'live',
        streamName: 'stream-42',
      },
    );
  });

  it('accepts the shared API success status 220', async () => {
    mockPost.mockResolvedValueOnce({
      api_status: 220,
      post_data: {
        id: 42,
        live_ended: 0,
        live_time: Math.floor(Date.now() / 1000),
        postType: 'live',
        publisher: { user_id: '7', username: 'host' },
        stream_name: 'stream-42',
      },
    });

    await expect(createLiveRepository().getLivePost(42)).resolves.toMatchObject(
      {
        postId: 42,
        state: 'live',
      },
    );
  });
});
