// Description: Builds the background job that publishes a post, reel or story video: compress short videos to full 1080p, upload to Bunny Stream (ideally already started while the user was writing), then create the item.
import type { VideoPublishStatus } from '../../domain/types/videoPublish.types';
import { uploadVideoWithTicket } from '../../infrastructure/upload/bunnyVideoUpload';
import {
  getVideoUploadPolicy,
  type VideoUploadPolicy,
} from '../../infrastructure/upload/videoUploadPolicy';
import {
  prepareVideoForUpload,
  type VideoProcessingAttachment,
} from './videoProcessing';
import type {
  VideoPublishJob,
  VideoPublishProgress,
  VideoPublishPurpose,
  VideoPublishResult,
} from './videoPublishQueue';

/** Public videos keep full 1080p: Bunny encodes 360p to 1080p from what we send. */
const PUBLIC_VIDEO_MAX_DIMENSION = 1920;

export interface PreparedVideoUpload<T extends VideoProcessingAttachment> {
  /** The file that went up, possibly compressed; also used if Bunny is unavailable. */
  video: T;
  /** Ticket to send instead of the file, or null to upload the file to the server. */
  uploadId: string | null;
}

async function prepareAndUploadVideo<T extends VideoProcessingAttachment>(
  source: T,
  purpose: VideoPublishPurpose,
  policy: VideoUploadPolicy,
  progress: VideoPublishProgress,
  signal?: AbortSignal,
): Promise<PreparedVideoUpload<T>> {
  progress.setPhase('preparing');
  // Past the admin threshold, compressing on the phone takes longer than
  // uploading the original, which Bunny encodes itself.
  const keepOriginal = (source.duration ?? 0) > policy.compressMaxSeconds;
  if (__DEV__ && keepOriginal) {
    console.log('[video-processing] kept original', {
      purpose,
      durationSeconds: source.duration,
    });
  }
  const video = keepOriginal
    ? source
    : await prepareVideoForUpload(source, {
        maxDimension: PUBLIC_VIDEO_MAX_DIMENSION,
        signal,
        onProgress: value => progress.setProgress(value),
      });
  if (signal?.aborted) throw new Error('Video upload was cancelled');
  progress.setPhase('uploading');
  progress.setProgress(0);
  const uploadId = await uploadVideoWithTicket(
    video,
    purpose,
    value => progress.setProgress(value),
    signal,
  );
  return { video, uploadId };
}

export interface VideoPreUploadState {
  phase: 'preparing' | 'uploading';
  progress: number;
}

/** A picked video compressing and uploading while the user is still writing. */
export interface VideoPreUpload<T extends VideoProcessingAttachment> {
  readonly source: T;
  /** Null when this video does not go to Bunny Stream (Bunny off or unavailable). */
  readonly result: Promise<PreparedVideoUpload<T> | null>;
  getState(): VideoPreUploadState;
  subscribe(listener: (state: VideoPreUploadState) => void): () => void;
  cancel(): void;
}

/**
 * Starts compressing and uploading as soon as a video is picked, like
 * Facebook and Instagram, so pressing post only has to create the item. If
 * the user removes the video or leaves, cancel() stops the work; a ticket that
 * was already issued is cleaned up by the server after 24 hours.
 */
export function startVideoPreUpload<T extends VideoProcessingAttachment>(
  source: T,
  purpose: VideoPublishPurpose,
): VideoPreUpload<T> {
  const controller = new AbortController();
  const listeners = new Set<(state: VideoPreUploadState) => void>();
  let state: VideoPreUploadState = { phase: 'preparing', progress: 0 };
  const publish = (patch: Partial<VideoPreUploadState>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener(state));
  };
  const result = (async () => {
    if (!/^(file:\/\/|\/)/i.test(source.uri)) return null;
    const policy = await getVideoUploadPolicy(purpose);
    if (policy.provider !== 'bunny_stream' || controller.signal.aborted) return null;
    return prepareAndUploadVideo(
      source,
      purpose,
      policy,
      {
        setPhase: phase => publish({ phase, progress: 0 }),
        setProgress: progress => publish({ progress }),
      },
      controller.signal,
    );
  })().catch(() => null);
  return {
    source,
    result,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    cancel() {
      controller.abort();
      listeners.clear();
    },
  };
}

export interface VideoPublishJobOptions<T extends VideoProcessingAttachment> {
  purpose: VideoPublishPurpose;
  video: T;
  thumbnailUri?: string;
  policy: VideoUploadPolicy;
  /** Work already started when the video was picked, if it is still this video. */
  preUpload?: VideoPreUpload<T> | null;
  /** Creates the item from a Bunny upload ticket; the server holds it until the video is encoded. */
  createFromUpload(video: T, uploadId: string): Promise<VideoPublishStatus>;
  /** Creates the item with a regular file upload when Bunny turns out to be unavailable. */
  createDirectly(video: T): Promise<VideoPublishResult>;
  onPublished?(result: VideoPublishResult): void | Promise<void>;
}

export function createVideoPublishJob<T extends VideoProcessingAttachment>(
  options: VideoPublishJobOptions<T>,
): VideoPublishJob {
  return {
    purpose: options.purpose,
    thumbnailUri: options.thumbnailUri,
    async start(progress) {
      let prepared: PreparedVideoUpload<T> | null = null;
      const preUpload =
        options.preUpload?.source.uri === options.video.uri ? options.preUpload : null;
      if (preUpload) {
        progress.setPhase(preUpload.getState().phase);
        progress.setProgress(preUpload.getState().progress);
        const unsubscribe = preUpload.subscribe(state => {
          progress.setPhase(state.phase);
          progress.setProgress(state.progress);
        });
        try {
          prepared = await preUpload.result;
        } finally {
          unsubscribe();
        }
      }
      if (!prepared) {
        // Nothing started when the video was picked, or it failed: do it now.
        prepared = await prepareAndUploadVideo(
          options.video,
          options.purpose,
          options.policy,
          progress,
        );
      } else if (!prepared.uploadId) {
        // Only the ticket failed earlier; the compressed file just needs uploading.
        progress.setPhase('uploading');
        progress.setProgress(0);
        prepared = {
          video: prepared.video,
          uploadId: await uploadVideoWithTicket(prepared.video, options.purpose, value =>
            progress.setProgress(value),
          ),
        };
      }
      const { uploadId } = prepared;
      // An early upload started from the file as picked; keep what the
      // composer added since (cover frame, display size) and take only the
      // uploaded file itself from it.
      const video: T = {
        ...options.video,
        uri: prepared.video.uri,
        name: prepared.video.name,
        type: prepared.video.type,
      };
      if (!uploadId) {
        return { kind: 'published', result: await options.createDirectly(video) };
      }
      const status = await options.createFromUpload(video, uploadId);
      if (status.publishState === 'published') {
        return {
          kind: 'published',
          result: { postId: status.postId, storyId: status.storyId, needsReview: status.needsReview },
        };
      }
      return { kind: 'pending', status };
    },
    onPublished: options.onPublished,
  };
}
