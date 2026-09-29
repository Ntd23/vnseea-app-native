const mockCreateVideoUploadThumbnail = jest.fn();

jest.mock('../../../../shared-kernel/application/utils/videoThumbnails', () => ({
  createVideoUploadThumbnail: (...args: unknown[]) =>
    mockCreateVideoUploadThumbnail(...args),
}));

jest.mock('../../../infrastructure/repositories/ApiStoriesRepository', () => ({
  createStoriesRepository: () => ({ createStory: jest.fn() }),
}));

import { withStoryVideoThumbnail } from '../useCreateStoryViewModel';

const video = {
  uri: 'file:///cache/story.mp4',
  name: 'story.mp4',
  type: 'video/mp4',
  fileType: 'video' as const,
};

describe('withStoryVideoThumbnail', () => {
  beforeEach(() => {
    mockCreateVideoUploadThumbnail.mockReset();
  });

  it('attaches a generated frame to a video story', async () => {
    mockCreateVideoUploadThumbnail.mockResolvedValue({
      uri: 'file:///cache/story-cover.jpg',
      name: 'story-cover.jpg',
      type: 'image/jpeg',
    });

    await expect(withStoryVideoThumbnail(video)).resolves.toEqual({
      ...video,
      thumbnailUri: 'file:///cache/story-cover.jpg',
      thumbnailName: 'story-cover.jpg',
      thumbnailType: 'image/jpeg',
    });
    expect(mockCreateVideoUploadThumbnail).toHaveBeenCalledWith(video.uri);
  });

  it('keeps the story postable when making the frame fails', async () => {
    mockCreateVideoUploadThumbnail.mockRejectedValue(new Error('codec'));
    await expect(withStoryVideoThumbnail(video)).resolves.toEqual(video);

    mockCreateVideoUploadThumbnail.mockResolvedValue(undefined);
    await expect(withStoryVideoThumbnail(video)).resolves.toEqual(video);
  });

  it('leaves photos and videos that already have a frame untouched', async () => {
    const photo = { ...video, fileType: 'image' as const, type: 'image/jpeg' };
    const withFrame = { ...video, thumbnailUri: 'file:///cache/existing.jpg' };

    await expect(withStoryVideoThumbnail(photo)).resolves.toBe(photo);
    await expect(withStoryVideoThumbnail(withFrame)).resolves.toBe(withFrame);
    expect(mockCreateVideoUploadThumbnail).not.toHaveBeenCalled();
  });
});
