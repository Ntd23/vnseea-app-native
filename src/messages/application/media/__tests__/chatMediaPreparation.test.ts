import { prepareImageForUpload } from '../../../../shared-kernel/application/services/imageProcessing';
import { prepareVideoForUpload } from '../../../../shared-kernel/application/services/videoProcessing';
import { createVideoUploadThumbnail } from '../../../../shared-kernel/application/utils/videoThumbnails';
import { uploadVideoWithTicket } from '../../../../shared-kernel/infrastructure/upload/bunnyVideoUpload';
import { getChatVideoUploadPolicy } from '../../../../shared-kernel/infrastructure/upload/videoUploadPolicy';
import type { MessageAttachment } from '../../../domain/types/messages.types';
import { createTaskQueue, startChatMediaPreparation } from '../chatMediaPreparation';

jest.mock(
  '../../../../shared-kernel/application/services/imageProcessing',
  () => ({ prepareImageForUpload: jest.fn() }),
);
jest.mock(
  '../../../../shared-kernel/application/services/videoProcessing',
  () => ({ prepareVideoForUpload: jest.fn() }),
);
jest.mock(
  '../../../../shared-kernel/application/utils/videoThumbnails',
  () => ({ createVideoUploadThumbnail: jest.fn() }),
);
jest.mock(
  '../../../../shared-kernel/infrastructure/upload/videoUploadPolicy',
  () => ({ getChatVideoUploadPolicy: jest.fn() }),
);
jest.mock(
  '../../../../shared-kernel/infrastructure/upload/bunnyVideoUpload',
  () => ({ uploadVideoWithTicket: jest.fn() }),
);

const prepareImage = prepareImageForUpload as jest.Mock;
const prepareVideo = prepareVideoForUpload as jest.Mock;
const createThumbnail = createVideoUploadThumbnail as jest.Mock;
const getPolicy = getChatVideoUploadPolicy as jest.Mock;
const uploadWithTicket = uploadVideoWithTicket as jest.Mock;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const image = (index: number): MessageAttachment => ({
  uri: `file:///picked-${index}.jpg`,
  name: `picked-${index}.jpg`,
  type: 'image/jpeg',
  mediaType: 'image',
});

const video: MessageAttachment = {
  uri: 'file:///picked.mov',
  name: 'picked.mov',
  type: 'video/quicktime',
  mediaType: 'video',
};

const thumbnail = {
  uri: 'file:///poster.jpg',
  name: 'poster.jpg',
  type: 'image/jpeg',
};

describe('startChatMediaPreparation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createThumbnail.mockResolvedValue(thumbnail);
    getPolicy.mockResolvedValue({ provider: 'local', compressMaxSeconds: 0 });
    uploadWithTicket.mockResolvedValue(null);
  });

  it('uploads to Bunny Stream while composing so sending only references the ticket', async () => {
    getPolicy.mockResolvedValue({ provider: 'bunny_stream', compressMaxSeconds: 180 });
    const compressedVideo = { ...video, uri: 'file:///small.mp4', type: 'video/mp4' };
    prepareVideo.mockImplementationOnce(async (_source, options) => {
      options.onProgress(0.5);
      return compressedVideo;
    });
    uploadWithTicket.mockImplementationOnce(async (_file, _purpose, onProgress) => {
      onProgress(0.5);
      return '91';
    });

    const task = startChatMediaPreparation({ ...video, duration: 20 });
    const progress: number[] = [];
    task.subscribeProgress(value => progress.push(value));

    await expect(task.result).resolves.toEqual(
      expect.objectContaining({ uri: 'file:///small.mp4', bunnyUploadId: '91', uploadReady: true }),
    );
    expect(uploadWithTicket).toHaveBeenCalledWith(
      compressedVideo,
      'chat',
      expect.any(Function),
      expect.any(Object),
    );
    // Transcoding fills the first fifth of the bar, the upload the rest.
    expect(progress.map(value => Math.round(value * 100) / 100)).toEqual([0.1, 0.6, 1]);
  });

  it('keeps the attachment sendable when the early upload fails', async () => {
    getPolicy.mockResolvedValue({ provider: 'bunny_stream', compressMaxSeconds: 180 });
    prepareVideo.mockImplementationOnce(async (source: MessageAttachment) => source);
    uploadWithTicket.mockRejectedValueOnce(new Error('offline'));

    const ready = await startChatMediaPreparation(video).result;

    expect(ready.bunnyUploadId).toBeUndefined();
    expect(ready.uploadReady).toBe(true);
  });

  it('uploads long videos uncompressed when Bunny Stream encodes them', async () => {
    getPolicy.mockResolvedValue({ provider: 'bunny_stream', compressMaxSeconds: 180 });
    const longVideo = { ...video, duration: 3600 };

    await expect(startChatMediaPreparation(longVideo).result).resolves.toEqual({
      ...longVideo,
      thumbnailUri: thumbnail.uri,
      thumbnailName: thumbnail.name,
      thumbnailType: thumbnail.type,
      uploadReady: true,
    });
    expect(prepareVideo).not.toHaveBeenCalled();
  });

  it('never holds up short clips behind a long original that is still uploading', async () => {
    getPolicy.mockResolvedValue({ provider: 'bunny_stream', compressMaxSeconds: 180 });
    prepareVideo.mockImplementation(async (source: MessageAttachment) => source);
    const longUpload = deferred<string | null>();
    uploadWithTicket
      .mockImplementationOnce(() => longUpload.promise)
      .mockResolvedValueOnce('31')
      .mockResolvedValueOnce('32');

    const longTask = startChatMediaPreparation({ ...video, duration: 380 });
    await flush();
    const firstClip = startChatMediaPreparation({ ...video, uri: 'file:///clip-1.mov', duration: 20 });
    const secondClip = startChatMediaPreparation({ ...video, uri: 'file:///clip-2.mov', duration: 10 });

    await expect(firstClip.result).resolves.toEqual(expect.objectContaining({ bunnyUploadId: '31' }));
    await expect(secondClip.result).resolves.toEqual(expect.objectContaining({ bunnyUploadId: '32' }));
    longUpload.resolve('30');
    await expect(longTask.result).resolves.toEqual(expect.objectContaining({ bunnyUploadId: '30' }));
  });

  it('still compresses short videos with Bunny Stream and every video without it', async () => {
    prepareVideo.mockImplementation(async (source: MessageAttachment) => source);
    getPolicy.mockResolvedValue({ provider: 'bunny_stream', compressMaxSeconds: 180 });
    await startChatMediaPreparation({ ...video, duration: 30 }).result;
    getPolicy.mockResolvedValue({ provider: 'local', compressMaxSeconds: 0 });
    await startChatMediaPreparation({ ...video, duration: 3600 }).result;

    expect(prepareVideo).toHaveBeenCalledTimes(2);
  });

  it('marks a downscaled image as upload-ready', async () => {
    prepareImage.mockImplementationOnce(async (source: MessageAttachment) => ({
      ...source,
      uri: 'file:///small.jpg',
    }));

    const task = startChatMediaPreparation(image(1));

    await expect(task.result).resolves.toEqual({
      ...image(1),
      uri: 'file:///small.jpg',
      uploadReady: true,
    });
    await expect(task.thumbnail).resolves.toBeUndefined();
  });

  it('prepares at most two images at the same time', async () => {
    const pending = [deferred<MessageAttachment>(), deferred<MessageAttachment>(), deferred<MessageAttachment>()];
    pending.forEach(item => prepareImage.mockImplementationOnce(() => item.promise));

    const tasks = [1, 2, 3].map(index => startChatMediaPreparation(image(index)));
    await flush();
    expect(prepareImage).toHaveBeenCalledTimes(2);

    pending[0]!.resolve(image(1));
    await tasks[0]!.result;
    await flush();
    expect(prepareImage).toHaveBeenCalledTimes(3);

    pending[1]!.resolve(image(2));
    pending[2]!.resolve(image(3));
    await Promise.all(tasks.map(task => task.result));
  });

  it('compresses a video with its poster and reports progress to subscribers', async () => {
    const compression = deferred<MessageAttachment>();
    let reportProgress!: (progress: number) => void;
    prepareVideo.mockImplementationOnce((_source, options) => {
      reportProgress = options.onProgress;
      return compression.promise;
    });

    const task = startChatMediaPreparation(video);
    const progress: number[] = [];
    task.subscribeProgress(value => progress.push(value));
    await expect(task.thumbnail).resolves.toEqual(thumbnail);
    await flush();

    expect(prepareVideo).toHaveBeenCalledWith(
      video,
      expect.objectContaining({
        minimumFileSizeForCompress: 0,
        signal: expect.any(Object),
      }),
    );
    reportProgress(0.4);
    expect(task.getProgress()).toBe(0.4);

    compression.resolve({ ...video, uri: 'file:///small.mp4', type: 'video/mp4' });
    await expect(task.result).resolves.toEqual({
      ...video,
      uri: 'file:///small.mp4',
      type: 'video/mp4',
      thumbnailUri: thumbnail.uri,
      thumbnailName: thumbnail.name,
      thumbnailType: thumbnail.type,
      uploadReady: true,
    });
    expect(progress).toEqual([0.4, 1]);
  });

  it('transcodes one video at a time', async () => {
    const first = deferred<MessageAttachment>();
    prepareVideo
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(async (source: MessageAttachment) => source);

    const firstTask = startChatMediaPreparation(video);
    const secondTask = startChatMediaPreparation({ ...video, uri: 'file:///second.mov' });
    await flush();
    expect(prepareVideo).toHaveBeenCalledTimes(1);

    first.resolve(video);
    await firstTask.result;
    await secondTask.result;
    expect(prepareVideo).toHaveBeenCalledTimes(2);
  });

  it('skips queued work after cancel and falls back to the original on failure', async () => {
    const blocker = deferred<MessageAttachment>();
    prepareVideo.mockImplementationOnce(() => blocker.promise);
    const running = startChatMediaPreparation(video);
    const cancelled = startChatMediaPreparation({ ...video, uri: 'file:///removed.mov' });
    cancelled.cancel();

    blocker.reject(new Error('encoder busy'));
    await expect(running.result).resolves.toEqual({
      ...video,
      thumbnailUri: thumbnail.uri,
      thumbnailName: thumbnail.name,
      thumbnailType: thumbnail.type,
      uploadReady: true,
    });
    await cancelled.result;
    expect(prepareVideo).toHaveBeenCalledTimes(1);
  });
});

describe('createTaskQueue', () => {
  it('keeps running queued work after a task throws synchronously', async () => {
    const run = createTaskQueue(1);
    const failed = run(() => {
      throw new Error('boom');
    });
    const next = run(async () => 'next');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('next');
  });
});
