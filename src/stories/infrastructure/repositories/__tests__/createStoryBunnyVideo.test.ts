// Description: Verifies video stories already on Bunny Stream send their upload ticket and cover instead of the file.
const mockMultipart = jest.fn();

jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    multipart: (...args: unknown[]) => mockMultipart(...args),
    post: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://vnseea.example',
    mediaBaseUrl: 'https://cdn.vnseea.example',
  },
}));

import { createStoriesRepository } from '../ApiStoriesRepository';

const media = {
  uri: 'file:///cache/story.mp4',
  name: 'story.mp4',
  type: 'video/mp4',
  fileType: 'video' as const,
  thumbnailUri: 'file:///cache/story-cover.jpg',
  thumbnailName: 'story-cover.jpg',
  thumbnailType: 'image/jpeg',
};

describe('createStoryWithUploadedVideo', () => {
  beforeEach(() => {
    mockMultipart.mockReset();
  });

  it('sends the ticket, cover and story fields without the file', async () => {
    mockMultipart.mockResolvedValue({
      api_status: 200,
      code: 'processing',
      story_id: 0,
      bunny_upload: { upload_id: '91', status: 'processing', publish_state: 'pending', needs_review: false, story_id: '' },
    });

    const pending = await createStoriesRepository().createStoryWithUploadedVideo(
      { media, title: 'Đi chơi', audience: 'friends' },
      '91',
    );

    const [route, payload] = mockMultipart.mock.calls[0];
    expect(route).toBe('create-story');
    expect(payload).toEqual(
      expect.objectContaining({
        bunny_upload_id: '91',
        file_type: 'video',
        story_title: 'Đi chơi',
        cover: { uri: 'file:///cache/story-cover.jpg', name: 'story-cover.jpg', type: 'image/jpeg' },
      }),
    );
    expect(payload).not.toHaveProperty('file');
    expect(pending).toEqual(expect.objectContaining({ uploadId: '91', publishState: 'pending', storyId: undefined }));
  });

  it('reports the server error when the ticket is refused', async () => {
    mockMultipart.mockResolvedValue({ api_status: 400, errors: ['file (STREAM FILE) is missing'] });

    await expect(
      createStoriesRepository().createStoryWithUploadedVideo({ media }, '91'),
    ).rejects.toThrow('file (STREAM FILE) is missing');
  });
});
