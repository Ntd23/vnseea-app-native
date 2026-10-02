// Description: Uploads post, reel and story videos in the background and follows them until the server publishes them, so the composer can close right away.
import type { VideoPublishStatus } from '../../domain/types/videoPublish.types';
import { fetchVideoPublishStatuses } from '../../infrastructure/upload/bunnyVideoUpload';

export type VideoPublishPurpose = 'post' | 'reel' | 'story';

export type VideoPublishPhase =
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'review'
  | 'failed';

export interface VideoPublishTask {
  id: string;
  purpose: VideoPublishPurpose;
  phase: VideoPublishPhase;
  /** Fraction between 0 and 1 while preparing or uploading. */
  progress: number;
  thumbnailUri?: string;
  /** Encoding takes unusually long: the app stopped asking and the server notifies the author. */
  waitingInBackground?: boolean;
  errorMessage?: string;
}

export interface VideoPublishResult {
  postId?: string;
  storyId?: string;
  needsReview: boolean;
}

/** What starting a job produced: a Bunny upload to follow, or an item the server published at once. */
export type VideoPublishStart =
  | { kind: 'pending'; status: VideoPublishStatus }
  | { kind: 'published'; result: VideoPublishResult };

export interface VideoPublishProgress {
  setPhase(phase: 'preparing' | 'uploading'): void;
  setProgress(progress: number): void;
}

export interface VideoPublishJob {
  purpose: VideoPublishPurpose;
  thumbnailUri?: string;
  /** Prepares and uploads the video, then creates the post, reel or story. */
  start(progress: VideoPublishProgress): Promise<VideoPublishStart>;
  /** Runs once the item is visible, for example to put it at the top of the feed. */
  onPublished?(result: VideoPublishResult): void | Promise<void>;
}

export interface VideoPublishQueueDeps {
  fetchStatuses(uploadIds: string[]): Promise<VideoPublishStatus[]>;
  wait(milliseconds: number): Promise<void>;
  now(): number;
}

/** Encoding a long video can take a while; past this the server's notification takes over. */
const MAX_FOLLOW_MS = 45 * 60 * 1000;
const DONE_VISIBLE_MS = 4000;

function followDelay(elapsedMs: number) {
  if (elapsedMs < 2 * 60 * 1000) return 5000;
  if (elapsedMs < 15 * 60 * 1000) return 15000;
  return 30000;
}

function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function createVideoPublishQueue(deps: VideoPublishQueueDeps) {
  let tasks: VideoPublishTask[] = [];
  const jobs = new Map<string, VideoPublishJob>();
  const enqueuedAt = new Map<string, number>();
  const listeners = new Set<() => void>();
  let sequence = 0;

  const notify = () => {
    listeners.forEach(listener => {
      try {
        listener();
      } catch (caught) {
        // A bad subscriber must not break siblings.
        console.warn('[videoPublishQueue] listener error', caught);
      }
    });
  };
  const isActive = (id: string) => tasks.some(task => task.id === id);
  const update = (id: string, patch: Partial<VideoPublishTask>) => {
    if (!isActive(id)) return;
    tasks = tasks.map(task => (task.id === id ? { ...task, ...patch } : task));
    notify();
  };
  const remove = (id: string) => {
    if (!isActive(id)) return;
    tasks = tasks.filter(task => task.id !== id);
    jobs.delete(id);
    enqueuedAt.delete(id);
    notify();
  };

  async function finish(id: string, job: VideoPublishJob, result: VideoPublishResult) {
    update(id, { phase: result.needsReview ? 'review' : 'published', progress: 1 });
    if (__DEV__) {
      console.log('[video-publish] published', {
        purpose: job.purpose,
        postId: result.postId,
        storyId: result.storyId,
        secondsSincePost: (deps.now() - (enqueuedAt.get(id) ?? deps.now())) / 1000,
      });
    }
    try {
      await job.onPublished?.(result);
    } catch (caught) {
      console.warn('[videoPublishQueue] onPublished failed', caught);
    }
    await deps.wait(DONE_VISIBLE_MS);
    remove(id);
  }

  async function follow(id: string, job: VideoPublishJob, initial: VideoPublishStatus) {
    const startedAt = deps.now();
    let status = initial;
    for (;;) {
      if (status.publishState === 'published') {
        await finish(id, job, {
          postId: status.postId,
          storyId: status.storyId,
          needsReview: status.needsReview,
        });
        return;
      }
      if (status.publishState === 'discarded' || status.status === 'failed') {
        update(id, { phase: 'failed', errorMessage: undefined });
        return;
      }
      const elapsed = deps.now() - startedAt;
      if (elapsed >= MAX_FOLLOW_MS) {
        update(id, { waitingInBackground: true });
        return;
      }
      await deps.wait(followDelay(elapsed));
      if (!isActive(id)) return;
      try {
        const [next] = await deps.fetchStatuses([status.uploadId]);
        if (next) status = next;
      } catch {
        // Offline for a moment: keep waiting, the server publishes regardless.
      }
    }
  }

  async function run(id: string, job: VideoPublishJob) {
    try {
      const started = await job.start({
        setPhase: phase => update(id, { phase }),
        setProgress: progress => update(id, { progress: clampProgress(progress) }),
      });
      if (started.kind === 'published') {
        await finish(id, job, started.result);
        return;
      }
      update(id, { phase: 'processing', progress: 1 });
      await follow(id, job, started.status);
    } catch (caught) {
      update(id, {
        phase: 'failed',
        errorMessage: caught instanceof Error ? caught.message : undefined,
      });
    }
  }

  return {
    enqueue(job: VideoPublishJob): string {
      sequence += 1;
      const id = `video-publish-${sequence}-${deps.now()}`;
      jobs.set(id, job);
      enqueuedAt.set(id, deps.now());
      tasks = [
        ...tasks,
        { id, purpose: job.purpose, phase: 'preparing', progress: 0, thumbnailUri: job.thumbnailUri },
      ];
      notify();
      void run(id, job);
      return id;
    },
    /** Starts a failed task over: prepares and uploads the video again. */
    retry(id: string) {
      const job = jobs.get(id);
      const task = tasks.find(item => item.id === id);
      if (!job || task?.phase !== 'failed') return;
      update(id, { phase: 'preparing', progress: 0, errorMessage: undefined, waitingInBackground: false });
      void run(id, job);
    },
    dismiss: remove,
    getTasks(): VideoPublishTask[] {
      return tasks;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type VideoPublishQueue = ReturnType<typeof createVideoPublishQueue>;

export const videoPublishQueue = createVideoPublishQueue({
  fetchStatuses: fetchVideoPublishStatuses,
  wait: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  now: () => Date.now(),
});
