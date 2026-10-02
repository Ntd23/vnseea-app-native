// Description: Verifies video posts already on Bunny Stream send their upload ticket instead of the file.
jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
    multipart: jest.fn(),
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
    getSession: jest.fn(() => ({ accessToken: 'test-token', userId: '1' })),
    getAccessToken: jest.fn(() => 'test-token'),
  },
}));

jest.mock('../../../../reels/infrastructure/storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: { get: jest.fn(() => null) },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import type { CreatePostDraft } from '../../../domain/types/feed.types';
import { createFeedRepository } from '../ApiFeedRepository';

const multipart = backendApi.multipart as jest.Mock;

const draft: CreatePostDraft = {
  text: 'Xin chào',
  photos: [],
  privacy: 'public',
  video: {
    uri: 'file:///cache/clip.mp4',
    name: 'clip.mp4',
    type: 'video/mp4',
    thumbnailUri: 'file:///cache/clip.jpg',
    thumbnailName: 'clip.jpg',
    thumbnailType: 'image/jpeg',
    width: 1080,
    height: 1920,
  },
};

describe('ApiFeedRepository Bunny Stream video posts', () => {
  beforeEach(() => {
    multipart.mockReset();
  });

  it('sends the ticket and poster instead of the video file', async () => {
    multipart.mockResolvedValue({
      api_status: 200,
      code: 'processing',
      bunny_upload: { upload_id: '77', status: 'processing', publish_state: 'pending', needs_review: false, post_id: '' },
    });

    const pending = await createFeedRepository().createPostWithUploadedVideo(draft, '77');

    const [route, payload] = multipart.mock.calls[0];
    expect(route).toBe('new_post');
    expect(payload).toEqual(
      expect.objectContaining({
        bunny_upload_id: '77',
        postType: 'video',
        postText: 'Xin chào',
        media_width: 1080,
        media_height: 1920,
        video_thumb: expect.objectContaining({ uri: 'file:///cache/clip.jpg', type: 'image/jpeg' }),
      }),
    );
    expect(payload).not.toHaveProperty('postVideo');
    expect(pending).toEqual({
      uploadId: '77',
      status: 'processing',
      publishState: 'pending',
      needsReview: false,
      postId: undefined,
      storyId: undefined,
    });
  });

  it('keeps sending the file for regular video posts', async () => {
    multipart.mockResolvedValue({ api_status: 200, post_data: { id: '9', postFile: 'https://demo.vnseea.vn/v.mp4', postType: 'video' } });

    await createFeedRepository().createPost(draft);

    const payload = multipart.mock.calls[0][1];
    expect(payload.postVideo).toEqual(expect.objectContaining({ uri: 'file:///cache/clip.mp4' }));
    expect(payload).not.toHaveProperty('bunny_upload_id');
  });

  it('surfaces the server error when the ticket is refused', async () => {
    multipart.mockResolvedValue({ api_status: '400', errors: { error_id: 8, error_text: 'invalid file' } });

    await expect(createFeedRepository().createPostWithUploadedVideo(draft, '77')).rejects.toThrow('invalid file');
  });
});
