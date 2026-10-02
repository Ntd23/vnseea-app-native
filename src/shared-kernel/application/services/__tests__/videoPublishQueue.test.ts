import type { VideoPublishStatus } from '../../../domain/types/videoPublish.types';
import {
  createVideoPublishQueue,
  type VideoPublishJob,
  type VideoPublishStart,
} from '../videoPublishQueue';

jest.mock('../../../infrastructure/upload/bunnyVideoUpload', () => ({
  fetchVideoPublishStatuses: jest.fn(),
}));

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function status(patch: Partial<VideoPublishStatus> = {}): VideoPublishStatus {
  return {
    uploadId: '77',
    status: 'processing',
    publishState: 'pending',
    needsReview: false,
    ...patch,
  };
}

function setup(responses: VideoPublishStatus[][] = []) {
  let clock = 1000;
  const waits: number[] = [];
  const fetchStatuses = jest.fn(async () => responses.shift() ?? []);
  const queue = createVideoPublishQueue({
    fetchStatuses,
    wait: async milliseconds => {
      waits.push(milliseconds);
      clock += milliseconds;
    },
    now: () => clock,
  });
  return { queue, fetchStatuses, waits, advance: (ms: number) => (clock += ms) };
}

function job(start: () => Promise<VideoPublishStart>, patch: Partial<VideoPublishJob> = {}): VideoPublishJob {
  return {
    purpose: 'post',
    thumbnailUri: 'file:///poster.jpg',
    start: jest.fn(async progress => {
      progress.setPhase('uploading');
      progress.setProgress(0.5);
      return start();
    }),
    onPublished: jest.fn(),
    ...patch,
  };
}

describe('videoPublishQueue', () => {
  it('follows a held-back post until the server publishes it, then hands it over', async () => {
    const { queue, fetchStatuses } = setup([
      [status()],
      [status({ status: 'ready', publishState: 'published', postId: '501' })],
    ]);
    const phases: string[] = [];
    queue.subscribe(() => phases.push(queue.getTasks()[0]?.phase ?? 'removed'));
    const publishJob = job(async () => ({ kind: 'pending', status: status() }));

    queue.enqueue(publishJob);
    await flush();

    expect(fetchStatuses).toHaveBeenCalledWith(['77']);
    expect(publishJob.onPublished).toHaveBeenCalledWith({
      postId: '501',
      storyId: undefined,
      needsReview: false,
    });
    expect(phases).toEqual(['preparing', 'uploading', 'uploading', 'processing', 'published', 'removed']);
    expect(queue.getTasks()).toEqual([]);
  });

  it('reports a dropped post as failed and starts it over on retry', async () => {
    const { queue } = setup([[status({ status: 'failed', publishState: 'discarded' })]]);
    let attempts = 0;
    const publishJob = job(async () => {
      attempts += 1;
      return attempts === 1
        ? { kind: 'pending', status: status() }
        : { kind: 'published', result: { postId: '9', needsReview: false } };
    });

    const id = queue.enqueue(publishJob);
    await flush();
    expect(queue.getTasks()[0]).toEqual(expect.objectContaining({ id, phase: 'failed' }));

    queue.retry(id);
    await flush();
    expect(publishJob.onPublished).toHaveBeenCalledWith({ postId: '9', needsReview: false });
    expect(queue.getTasks()).toEqual([]);
  });

  it('keeps the upload error and stops following dismissed tasks', async () => {
    const { queue, fetchStatuses } = setup();
    const failing = job(async () => {
      throw new Error('Bunny rejected a video chunk (HTTP 500)');
    });
    queue.enqueue(failing);
    await flush();
    expect(queue.getTasks()[0]).toEqual(
      expect.objectContaining({ phase: 'failed', errorMessage: 'Bunny rejected a video chunk (HTTP 500)' }),
    );

    const pendingId = queue.enqueue(job(async () => ({ kind: 'pending', status: status() })));
    queue.dismiss(pendingId);
    await flush();
    expect(fetchStatuses).not.toHaveBeenCalled();
    expect(queue.getTasks().map(task => task.id)).not.toContain(pendingId);
  });

  it('hands over to the server notification when encoding takes very long', async () => {
    const { queue, waits } = setup(Array.from({ length: 200 }, () => [status()]));
    queue.enqueue(job(async () => ({ kind: 'pending', status: status() })));
    for (let index = 0; index < 50; index += 1) await flush();

    expect(queue.getTasks()[0]).toEqual(
      expect.objectContaining({ phase: 'processing', waitingInBackground: true }),
    );
    expect(waits[0]).toBe(5000);
    expect(waits).toContain(15000);
    expect(waits).toContain(30000);
  });

  it('marks posts waiting for review instead of published', async () => {
    const { queue } = setup();
    const reviewJob = job(async () => ({ kind: 'published', result: { postId: '3', needsReview: true } }));
    const phases: string[] = [];
    queue.subscribe(() => phases.push(queue.getTasks()[0]?.phase ?? 'removed'));

    queue.enqueue(reviewJob);
    await flush();
    expect(phases).toContain('review');
    expect(phases).not.toContain('published');
  });
});
