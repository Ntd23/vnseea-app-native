import { uploadVideoWithTicket } from '../../../infrastructure/upload/bunnyVideoUpload';
import { getVideoUploadPolicy } from '../../../infrastructure/upload/videoUploadPolicy';
import { prepareVideoForUpload } from '../videoProcessing';
import { createVideoPublishJob, startVideoPreUpload } from '../videoPublishJob';

jest.mock('../videoProcessing', () => ({ prepareVideoForUpload: jest.fn() }));
jest.mock('../../../infrastructure/upload/bunnyVideoUpload', () => ({
  uploadVideoWithTicket: jest.fn(),
}));
jest.mock('../../../infrastructure/upload/videoUploadPolicy', () => ({
  getVideoUploadPolicy: jest.fn(),
}));

const getPolicy = getVideoUploadPolicy as jest.Mock;

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
    getPolicy.mockResolvedValue(bunnyPolicy);
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
    expect(uploadWithTicket).toHaveBeenCalledWith(compressed, 'reel', expect.any(Function), undefined);
    expect(createFromUpload).toHaveBeenCalledWith({ ...compressed, duration: 30 }, '77');
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
    expect(uploadWithTicket).toHaveBeenCalledWith({ ...video, duration: 3600 }, 'post', expect.any(Function), undefined);
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

  it('takes over an upload that started when the video was picked', async () => {
    const preUpload = startVideoPreUpload<typeof video & { duration?: number; thumbnailUri?: string; width?: number }>(
      { ...video, duration: 30 },
      'post',
    );
    await preUpload.result;
    jest.clearAllMocks();
    const createFromUpload = jest.fn(async () => ({
      uploadId: '77',
      status: 'processing' as const,
      publishState: 'pending',
      needsReview: false,
    }));
    const steps = progress();

    await createVideoPublishJob({
      purpose: 'story',
      // The cover frame and size are added after the early upload started.
      video: { ...video, duration: 30, thumbnailUri: 'file:///poster.jpg', width: 1080 },
      thumbnailUri: 'file:///poster.jpg',
      policy: bunnyPolicy,
      preUpload,
      createFromUpload,
      createDirectly: jest.fn(),
    }).start(steps);

    expect(prepareVideo).not.toHaveBeenCalled();
    expect(uploadWithTicket).not.toHaveBeenCalled();
    expect(createFromUpload).toHaveBeenCalledWith(
      { ...compressed, duration: 30, thumbnailUri: 'file:///poster.jpg', width: 1080 },
      '77',
    );
    expect(steps.setPhase).toHaveBeenCalledWith('uploading');
  });

  it('only retries the ticket when the early upload could not get one', async () => {
    uploadWithTicket.mockResolvedValueOnce(null).mockResolvedValueOnce('78');
    const preUpload = startVideoPreUpload(video, 'reel');
    await preUpload.result;
    const createFromUpload = jest.fn(async () => ({
      uploadId: '78',
      status: 'processing' as const,
      publishState: 'pending',
      needsReview: false,
    }));

    await createVideoPublishJob({
      purpose: 'reel',
      video,
      policy: bunnyPolicy,
      preUpload,
      createFromUpload,
      createDirectly: jest.fn(),
    }).start(progress());

    expect(prepareVideo).toHaveBeenCalledTimes(1);
    expect(uploadWithTicket).toHaveBeenCalledTimes(2);
    expect(createFromUpload).toHaveBeenCalledWith(compressed, '78');
  });

  it('starts nothing when Bunny is off, and cancelling stops the upload', async () => {
    getPolicy.mockResolvedValueOnce({ provider: 'local', compressMaxSeconds: 0 });
    await expect(startVideoPreUpload(video, 'story').result).resolves.toBeNull();
    expect(prepareVideo).not.toHaveBeenCalled();

    let signal: AbortSignal | undefined;
    uploadWithTicket.mockImplementationOnce(async (_file, _purpose, _progress, abortSignal) => {
      signal = abortSignal;
      return '79';
    });
    const preUpload = startVideoPreUpload(video, 'post');
    await preUpload.result;
    preUpload.cancel();
    expect(signal?.aborted).toBe(true);
  });

  it('ignores an early upload of a different video', async () => {
    const preUpload = startVideoPreUpload({ ...video, uri: 'file:///other.mov' }, 'post');
    await preUpload.result;
    jest.clearAllMocks();

    await createVideoPublishJob({
      purpose: 'post',
      video,
      policy: bunnyPolicy,
      preUpload,
      createFromUpload: async () => ({ uploadId: '77', status: 'processing', publishState: 'pending', needsReview: false }),
      createDirectly: jest.fn(),
    }).start(progress());

    expect(prepareVideo).toHaveBeenCalledWith(video, expect.anything());
  });
});
