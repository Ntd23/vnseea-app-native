import type { MessageAttachment } from '../../domain/types/messages.types';
import { prepareImageForUpload } from '../../../shared-kernel/application/services/imageProcessing';
import { prepareVideoForUpload } from '../../../shared-kernel/application/services/videoProcessing';
import { uploadVideoWithTicket } from '../../../shared-kernel/infrastructure/upload/bunnyVideoUpload';
import { getChatVideoUploadPolicy } from '../../../shared-kernel/infrastructure/upload/videoUploadPolicy';
import {
  createVideoUploadThumbnail,
  type GeneratedVideoThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';

/**
 * Prepares picked chat media in the background while the user is still
 * composing, so pressing send only has to upload.
 *
 * Images are downscaled two at a time; videos are transcoded one at a time
 * because each transcode already saturates the hardware encoder.  With Bunny
 * Stream, videos are also uploaded here, so sending only references them.
 * Every task is fail-open: when preparation fails, the original file is
 * uploaded at send time.
 */
type ProgressListener = (progress: number) => void;

/** The part of a preparation task the send pipeline depends on. */
export interface ChatMediaPreparationHandle {
  /** Resolves to the upload-ready attachment; never rejects. */
  readonly result: Promise<MessageAttachment>;
  getProgress(): number | undefined;
  subscribeProgress(listener: ProgressListener): () => void;
}

export interface ChatMediaPreparationTask extends ChatMediaPreparationHandle {
  /** Resolves to the composer poster for videos, `undefined` otherwise. */
  readonly thumbnail: Promise<GeneratedVideoThumbnail | undefined>;
  cancel(): void;
}

export function createTaskQueue(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  const next = () => {
    active -= 1;
    waiting.shift()?.();
  };

  return function runQueued<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active += 1;
        let running: Promise<T>;
        try {
          running = task();
        } catch (error) {
          running = Promise.reject(error);
        }
        running.then(resolve, reject).finally(next);
      };

      if (active < concurrency) {
        start();
      } else {
        waiting.push(start);
      }
    });
  };
}

const runImagePreparation = createTaskQueue(2);
const runVideoPreparation = createTaskQueue(1);
// One upload at a time per lane keeps each video's progress meaningful; the
// next video can transcode meanwhile. Originals past the admin threshold get
// their own lane so a long one never holds up the clips sent after it.
const runVideoUpload = createTaskQueue(1);
const runOriginalVideoUpload = createTaskQueue(1);
/** Share of the progress bar taken by transcoding when the upload follows. */
const TRANSCODE_PROGRESS_SHARE = 0.2;

function withThumbnail(
  attachment: MessageAttachment,
  thumbnail: GeneratedVideoThumbnail | undefined,
): MessageAttachment {
  if (!thumbnail?.uri) return attachment;
  return {
    ...attachment,
    thumbnailUri: thumbnail.uri,
    thumbnailName: thumbnail.name,
    thumbnailType: thumbnail.type,
  };
}

export function startChatMediaPreparation(
  attachment: MessageAttachment,
): ChatMediaPreparationTask {
  const controller = new AbortController();
  const listeners = new Set<ProgressListener>();
  let latestProgress: number | undefined;

  const publishProgress = (progress: number) => {
    latestProgress = progress;
    listeners.forEach(listener => listener(progress));
  };

  const readyAttachment = (prepared: MessageAttachment): MessageAttachment => ({
    ...prepared,
    uploadReady: true,
  });

  let thumbnail: Promise<GeneratedVideoThumbnail | undefined> =
    Promise.resolve(undefined);
  let prepared: Promise<MessageAttachment>;

  if (attachment.mediaType === 'image') {
    prepared = runImagePreparation(() =>
      controller.signal.aborted
        ? Promise.resolve(attachment)
        : prepareImageForUpload(attachment),
    ).then(readyAttachment);
  } else if (attachment.mediaType === 'video') {
    thumbnail = createVideoUploadThumbnail(attachment.uri).catch(
      () => undefined,
    );
    let uploadsToBunny = false;
    let keptOriginal = false;
    let transcodeShare = 1;
    const compressed = runVideoPreparation(async () => {
      if (controller.signal.aborted) return attachment;
      const policy = await getChatVideoUploadPolicy();
      uploadsToBunny = policy.provider === 'bunny_stream';
      // Bunny Stream encodes the original itself; past the admin threshold
      // compressing takes longer than uploading the original.
      if (uploadsToBunny && (attachment.duration ?? 0) > policy.compressMaxSeconds) {
        keptOriginal = true;
        transcodeShare = 0;
        if (__DEV__) {
          console.log('[video-processing] kept original', {
            purpose: 'chat',
            durationSeconds: attachment.duration,
          });
        }
        return attachment;
      }
      transcodeShare = uploadsToBunny ? TRANSCODE_PROGRESS_SHARE : 1;
      return prepareVideoForUpload(attachment, {
        // Chat otherwise normalises picked MOV/HEVC files to MP4.
        minimumFileSizeForCompress: 0,
        signal: controller.signal,
        onProgress: progress => publishProgress(progress * transcodeShare),
      });
    });
    const uploaded = compressed.then(async video => {
      if (!uploadsToBunny || controller.signal.aborted) return video;
      const runUpload = keptOriginal ? runOriginalVideoUpload : runVideoUpload;
      const uploadId = await runUpload(async () =>
        controller.signal.aborted
          ? null
          : uploadVideoWithTicket(
              video,
              'chat',
              progress => publishProgress(transcodeShare + progress * (1 - transcodeShare)),
              controller.signal,
            ),
      ).catch(() => null);
      return uploadId ? { ...video, bunnyUploadId: uploadId } : video;
    });
    prepared = Promise.all([uploaded, thumbnail]).then(([video, poster]) =>
      readyAttachment(withThumbnail(video, poster)),
    );
  } else {
    prepared = Promise.resolve(attachment);
  }

  const result = prepared
    .catch(() =>
      thumbnail.then(poster =>
        readyAttachment(withThumbnail(attachment, poster)),
      ),
    )
    .then(ready => {
      if (attachment.mediaType === 'video') publishProgress(1);
      listeners.clear();
      return ready;
    });

  return {
    result,
    thumbnail,
    getProgress: () => latestProgress,
    subscribeProgress(listener) {
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
