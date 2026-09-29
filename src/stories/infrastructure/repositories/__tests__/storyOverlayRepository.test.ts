// Description: Verifies story overlays are sent as story_overlay and read back from overlay_data.
const mockMultipart = jest.fn();
const mockPost = jest.fn();

jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    multipart: (...args: unknown[]) => mockMultipart(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://vnseea.example',
    mediaBaseUrl: 'https://cdn.vnseea.example',
  },
}));

import type { StoryOverlay } from '../../../domain/types/stories.types';
import { createStoriesRepository } from '../ApiStoriesRepository';

const overlay: StoryOverlay = {
  version: 1,
  filter: 'rose',
  items: [
    { id: 'm1', kind: 'mention', userId: '1852', username: 'duong2004', name: 'Dương', x: 0.3, y: 0.7, scale: 1.2, rotation: 0.1 },
    { id: 's1', kind: 'sticker', emoji: '🎉', x: 0.6, y: 0.2, scale: 1, rotation: 0 },
  ],
};

describe('story overlay repository', () => {
  beforeEach(() => {
    mockMultipart.mockReset();
    mockPost.mockReset();
  });

  it('sends the overlay as story_overlay JSON', async () => {
    mockMultipart.mockResolvedValue({ api_status: 200, story_id: 240 });

    await createStoriesRepository().createStory({
      media: { uri: 'file:///cache/a.jpg', name: 'a.jpg', type: 'image/jpeg', fileType: 'image' },
      overlay,
    });

    const payload = mockMultipart.mock.calls[0][1] as Record<string, unknown>;
    expect(JSON.parse(String(payload.story_overlay))).toEqual(overlay);
  });

  it('omits story_overlay when nothing was placed on the story', async () => {
    mockMultipart.mockResolvedValue({ api_status: 200, story_id: 241 });

    await createStoriesRepository().createStory({
      media: { uri: 'file:///cache/a.jpg', name: 'a.jpg', type: 'image/jpeg', fileType: 'image' },
      overlay: { version: 1, filter: 'none', items: [] },
    });

    expect(mockMultipart.mock.calls[0][1]).not.toHaveProperty('story_overlay');
  });

  it('attaches overlay_data to the story segments it belongs to', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockPost.mockResolvedValue({
      api_status: 200,
      stories: [
        {
          id: '240',
          user_id: '7',
          posted: String(now - 60),
          expire: String(now + 3600),
          overlay_data: JSON.stringify(overlay),
          thumb: { id: '90', filename: 'https://cdn.vnseea.example/a.jpg', type: 'image' },
          user_data: { user_id: '7', username: 'ngocanh', name: 'Lê Ngọc Anh' },
        },
      ],
    });

    const stories = await createStoriesRepository().getStories();

    expect(stories[0].media[0].overlay).toEqual(overlay);
  });
});
