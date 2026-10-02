// Description: Builds the background job that publishes a post, reel or story video: compress short videos to full 1080p, upload to Bunny Stream, then create the item.
import type { VideoPublishStatus } from '../../domain/types/videoPublish.types';
import { uploadVideoWithTicket } from '../../infrastructure/upload/bunnyVideoUpload';
import type { VideoUploadPolicy } from '../../infrastructure/upload/videoUploadPolicy';
import {
  prepareVideoForUpload,
  type VideoProcessingAttachment,
} from './videoProcessing';
import type {
  VideoPublishJob,
  VideoPublishPurpose,
  VideoPublishResult,
} from './videoPublishQueue';

/** Public videos keep full 1080p: Bunny encodes 360p to 1080p from what we send. */
const PUBLIC_VIDEO_MAX_DIMENSION = 1920;

export interface VideoPublishJobOptions<T extends VideoProcessingAttachment> {
  purpose: VideoPublishPurpose;
  video: T;
  thumbnailUri?: string;
  policy: VideoUploadPolicy;
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
      progress.setPhase('preparing');
      // Compressing an hour-long video on a phone takes far longer than
      // uploading the original, which Bunny encodes itself.
      const keepOriginal = (options.video.duration ?? 0) > options.policy.compressMaxSeconds;
      if (__DEV__ && keepOriginal) {
        console.log('[video-processing] kept original', {
          purpose: options.purpose,
          durationSeconds: options.video.duration,
        });
      }
      const video = keepOriginal
        ? options.video
        : await prepareVideoForUpload(options.video, {
              maxDimension: PUBLIC_VIDEO_MAX_DIMENSION,
              onProgress: value => progress.setProgress(value),
            });
      progress.setPhase('uploading');
      progress.setProgress(0);
      const uploadId = await uploadVideoWithTicket(video, options.purpose, value =>
        progress.setProgress(value),
      );
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
