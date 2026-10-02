import { apiBridge } from '../../api/apiBridge';
import {
  getChatVideoUploadPolicy,
  getVideoUploadPolicy,
  resetVideoUploadPolicyCache,
} from '../videoUploadPolicy';

jest.mock('../../api/apiBridge', () => ({
  apiBridge: { post: jest.fn() },
}));

const post = apiBridge.post as jest.Mock;

describe('getChatVideoUploadPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetVideoUploadPolicyCache();
  });

  it('reads the Bunny provider and compression threshold from public settings', async () => {
    post.mockResolvedValueOnce({
      public_config: {
        video_upload: { chat: { provider: 'bunny_stream', compress_max_seconds: 240 } },
      },
    });

    await expect(getChatVideoUploadPolicy(1000)).resolves.toEqual({
      provider: 'bunny_stream',
      compressMaxSeconds: 240,
    });
    await expect(getChatVideoUploadPolicy(2000)).resolves.toEqual({
      provider: 'bunny_stream',
      compressMaxSeconds: 240,
    });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reads each purpose separately from one settings request', async () => {
    post.mockResolvedValueOnce({
      public_config: {
        video_upload: {
          chat: { provider: 'local', compress_max_seconds: 180 },
          post: { provider: 'bunny_stream', compress_max_seconds: 180 },
          reel: { provider: 'bunny_stream', compress_max_seconds: 'x' },
        },
      },
    });

    await expect(getVideoUploadPolicy('chat')).resolves.toEqual({ provider: 'local', compressMaxSeconds: 0 });
    await expect(getVideoUploadPolicy('post')).resolves.toEqual({ provider: 'bunny_stream', compressMaxSeconds: 180 });
    await expect(getVideoUploadPolicy('reel')).resolves.toEqual({ provider: 'bunny_stream', compressMaxSeconds: 180 });
    // Older servers only describe chat videos.
    await expect(getVideoUploadPolicy('story')).resolves.toEqual({ provider: 'local', compressMaxSeconds: 0 });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('falls back to local uploads for old servers and failures', async () => {
    post.mockResolvedValueOnce({ public_config: {} });
    await expect(getChatVideoUploadPolicy()).resolves.toEqual({
      provider: 'local',
      compressMaxSeconds: 0,
    });

    resetVideoUploadPolicyCache();
    post.mockRejectedValueOnce(new Error('offline'));
    await expect(getChatVideoUploadPolicy()).resolves.toEqual({
      provider: 'local',
      compressMaxSeconds: 0,
    });
  });
});
