// Description: Verifies reels already on Bunny Stream send their upload ticket instead of the file.
jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: {
    getSession: jest.fn(() => ({ userId: 'viewer-1' })),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://demo.vnseea.vn',
  },
}));

jest.mock('../../storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: { get: jest.fn(() => null) },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createReelsRepository } from '../ApiReelsRepository';

const multipart = backendApi.multipart as jest.Mock;

const draft = {
  videoUri: 'file:///cache/reel.mp4',
  videoType: 'video/mp4',
  videoName: 'reel.mp4',
  videoWidth: 1080,
  videoHeight: 1920.4,
  thumbnailUri: 'file:///cache/reel.jpg',
  caption: 'Hello #reel',
  privacy: 'public' as const,
};

describe('ApiReelsRepository Bunny Stream reels', () => {
  beforeEach(() => {
    multipart.mockReset();
  });

  it('creates the reel from the upload ticket', async () => {
    multipart.mockResolvedValue({
      api_status: 200,
      code: 'processing',
      bunny_upload: { upload_id: '88', status: 'ready', publish_state: 'published', needs_review: false, post_id: '42' },
    });

    const pending = await createReelsRepository().createReelWithUploadedVideo(draft, '88');

    const [route, payload] = multipart.mock.calls[0];
    expect(route).toBe('new_post');
    expect(payload).toEqual(
      expect.objectContaining({
        bunny_upload_id: '88',
        postType: 'reel',
        postText: 'Hello #reel',
        // Nothing on the server can measure a video that went to Bunny.
        media_width: 1080,
        media_height: 1920,
        video_thumb: expect.objectContaining({ uri: 'file:///cache/reel.jpg' }),
      }),
    );
    expect(payload).not.toHaveProperty('postVideo');
    expect(pending).toEqual(expect.objectContaining({ uploadId: '88', publishState: 'published', postId: '42' }));
  });

  it('still uploads the file for regular reels', async () => {
    multipart.mockResolvedValue({ api_status: 200, post_data: { id: '5', postFile: 'https://demo.vnseea.vn/r.mp4' } });

    await createReelsRepository().createReel(draft);

    expect(multipart.mock.calls[0][1].postVideo).toEqual({
      uri: 'file:///cache/reel.mp4',
      type: 'video/mp4',
      name: 'reel.mp4',
    });
    expect(multipart.mock.calls[0][1]).toEqual(
      expect.objectContaining({ media_width: 1080, media_height: 1920 }),
    );
  });

  it('leaves the size out when the picker did not report one', async () => {
    multipart.mockResolvedValue({ api_status: 200, post_data: { id: '6', postFile: 'https://demo.vnseea.vn/r.mp4' } });

    await createReelsRepository().createReel({ ...draft, videoWidth: undefined, videoHeight: 0 });

    expect(multipart.mock.calls[0][1]).not.toHaveProperty('media_width');
    expect(multipart.mock.calls[0][1]).not.toHaveProperty('media_height');
  });
});
