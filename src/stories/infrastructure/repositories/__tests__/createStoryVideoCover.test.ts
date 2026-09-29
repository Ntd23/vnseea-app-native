// Description: Verifies video stories upload a cover frame so the home rail can preview them.
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

const video = {
  uri: 'file:///cache/story.mp4',
  name: 'story.mp4',
  type: 'video/mp4',
  fileType: 'video' as const,
};

function sentPayload() {
  return mockMultipart.mock.calls[0][1] as Record<string, unknown>;
}

describe('createStory video cover', () => {
  beforeEach(() => {
    mockMultipart.mockReset();
    mockMultipart.mockResolvedValue({ api_status: 200, story_id: 234 });
  });

  it('uploads the generated frame as the cover of a video story', async () => {
    await createStoriesRepository().createStory({
      media: {
        ...video,
        thumbnailUri: 'file:///cache/story-cover.jpg',
        thumbnailName: 'story-cover.jpg',
        thumbnailType: 'image/jpeg',
      },
    });

    expect(sentPayload().cover).toEqual({
      uri: 'file:///cache/story-cover.jpg',
      name: 'story-cover.jpg',
      type: 'image/jpeg',
    });
    expect(sentPayload().file).toEqual(
      expect.objectContaining({ uri: 'file:///cache/story.mp4' }),
    );
  });

  it('still posts a video story when no frame could be made', async () => {
    await expect(
      createStoriesRepository().createStory({ media: video }),
    ).resolves.toMatchObject({ storyId: '234' });
    expect(sentPayload()).not.toHaveProperty('cover');
  });

  it('never sends a cover for a photo story', async () => {
    await createStoriesRepository().createStory({
      media: {
        uri: 'file:///cache/story.jpg',
        name: 'story.jpg',
        type: 'image/jpeg',
        fileType: 'image',
        thumbnailUri: 'file:///cache/unused.jpg',
      },
    });

    expect(sentPayload()).not.toHaveProperty('cover');
  });
});
