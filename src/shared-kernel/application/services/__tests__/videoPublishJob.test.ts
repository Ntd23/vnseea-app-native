import { uploadVideoWithTicket } from '../../../infrastructure/upload/bunnyVideoUpload';
import { prepareVideoForUpload } from '../videoProcessing';
import { createVideoPublishJob } from '../videoPublishJob';

jest.mock('../videoProcessing', () => ({ prepareVideoForUpload: jest.fn() }));
jest.mock('../../../infrastructure/upload/bunnyVideoUpload', () => ({
  uploadVideoWithTicket: jest.fn(),
}));

const prepareVideo = prepareVideoForUpload as jest.Mock;
const uploadWithTicket = uploadVideoWithTicket as jest.Mock;

const bunnyPolicy = { provider: 'bunny_stream' as const, compressMaxSeconds: 180 };
const video = { uri: 'file:///clip.mov', name: 'clip.mov', type: 'video/quicktime' };
const compressed = { uri: 'file:///clip.mp4', name: 'clip.mp4', type: 'video/mp4' };

function progress() {
  return { setPhase: jest.fn(), setProgress: jest.fn() };
}

describe('createVideoPublishJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prepareVideo.mockResolvedValue(compressed);
    uploadWithTicket.mockResolvedValue('77');
  });

  it('compresses short videos to full 1080p and creates the item from the ticket', async () => {
    const createFromUpload = jest.fn(async () => ({
      uploadId: '77',
      status: 'processing' as const,
      publishState: 'pending',
      needsReview: false,
    }));
    const job = createVideoPublishJob({
      purpose: 'reel',
      video: { ...video, duration: 30 },
      policy: bunnyPolicy,
      createFromUpload,
      createDirectly: jest.fn(),
    });

    const started = await job.start(progress());

    expect(prepareVideo).toHaveBeenCalledWith(
      { ...video, duration: 30 },
      expect.objectContaining({ maxDimension: 1920 }),
    );
    expect(uploadWithTicket).toHaveBeenCalledWith(compressed, 'reel', expect.any(Function));
    expect(createFromUpload).toHaveBeenCalledWith(compressed, '77');
    expect(started).toEqual({ kind: 'pending', status: expect.objectContaining({ uploadId: '77' }) });
  });

  it('uploads long originals and reports items the server published at once', async () => {
    const job = createVideoPublishJob({
      purpose: 'post',
      video: { ...video, duration: 3600 },
      policy: bunnyPolicy,
      createFromUpload: async () => ({
        uploadId: '77',
        status: 'ready',
        publishState: 'published',
        needsReview: true,
        postId: '12',
      }),
      createDirectly: jest.fn(),
    });

    await expect(job.start(progress())).resolves.toEqual({
      kind: 'published',
      result: { postId: '12', storyId: undefined, needsReview: true },
    });
    expect(prepareVideo).not.toHaveBeenCalled();
    expect(uploadWithTicket).toHaveBeenCalledWith({ ...video, duration: 3600 }, 'post', expect.any(Function));
  });

  it('falls back to a regular upload when no ticket is issued', async () => {
    uploadWithTicket.mockResolvedValueOnce(null);
    const createDirectly = jest.fn(async () => ({ storyId: '5', needsReview: false }));
    const job = createVideoPublishJob({
      purpose: 'story',
      video,
      policy: bunnyPolicy,
      createFromUpload: jest.fn(),
      createDirectly,
    });

    await expect(job.start(progress())).resolves.toEqual({
      kind: 'published',
      result: { storyId: '5', needsReview: false },
    });
    expect(createDirectly).toHaveBeenCalledWith(compressed);
  });
});
