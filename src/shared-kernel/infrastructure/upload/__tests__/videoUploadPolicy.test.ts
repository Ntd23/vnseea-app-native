import { apiBridge } from '../../api/apiBridge';
import {
  getChatVideoUploadPolicy,
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
