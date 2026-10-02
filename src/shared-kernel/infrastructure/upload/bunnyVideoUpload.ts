// Description: Uploads a video straight to Bunny Stream with a ticket from the backend, and asks the backend how its encoding and publishing are going.
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../api/apiBridge';
import type { VideoPublishStatus } from '../../domain/types/videoPublish.types';
import {
  getLocalFileSize,
  uploadToBunnyStream,
  type BunnyTusFile,
} from './bunnyTusUpload';
import type { VideoUploadPurpose } from './videoUploadPolicy';

type MediaUploadTicketResponse = {
  provider?: string;
  upload_id?: string | number;
  tus?: {
    endpoint?: string;
    library_id?: string | number;
    video_id?: string;
    expires?: string | number;
    signature?: string;
  };
};

/**
 * Sends a video straight to Bunny Stream when the server hands out an upload
 * ticket for this purpose. Returns the ticket id to send instead of the file,
 * or null when the video must go through the regular multipart upload.
 */
export async function uploadVideoWithTicket(
  file: BunnyTusFile,
  purpose: VideoUploadPurpose,
  onProgress?: (progress: number) => void,
): Promise<string | null> {
  if (!/^(file:\/\/|\/)/i.test(file.uri)) return null;
  const fileSize = await getLocalFileSize(file.uri);
  if (fileSize <= 0) return null;

  let ticket: MediaUploadTicketResponse;
  try {
    ticket = await apiBridge.post<MediaUploadTicketResponse>(
      apiRoutes.media.uploadTicket,
      {
        purpose,
        file_type: file.type || 'video/mp4',
        file_size: fileSize,
        file_name: file.name,
      },
    );
  } catch {
    // Older servers have no ticket endpoint; Bunny may also be unreachable.
    return null;
  }
  const tus = ticket.tus;
  if (
    ticket.provider !== 'bunny_stream' ||
    !ticket.upload_id ||
    !tus?.video_id ||
    !tus.signature
  ) {
    return null;
  }

  const startedAt = Date.now();
  await uploadToBunnyStream(
    file,
    {
      endpoint: tus.endpoint || 'https://video.bunnycdn.com/tusupload',
      libraryId: String(tus.library_id ?? ''),
      videoId: tus.video_id,
      expires: Number(tus.expires),
      signature: tus.signature,
    },
    { onProgress },
  );
  if (__DEV__) {
    console.log('[video-upload] uploaded', {
      purpose,
      uploadId: String(ticket.upload_id),
      megabytes: Math.round((fileSize / 1048576) * 10) / 10,
      seconds: (Date.now() - startedAt) / 1000,
    });
  }
  return String(ticket.upload_id);
}

function readText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/** Reads the `bunny_upload` block of new_post / create-story or one row of media-upload-status. */
export function readVideoPublishStatus(raw: unknown): VideoPublishStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const uploadId = readText(record.upload_id);
  if (!uploadId) return null;
  const status = readText(record.status);
  return {
    uploadId,
    status: status === 'ready' || status === 'failed' ? status : 'processing',
    publishState: readText(record.publish_state),
    needsReview: record.needs_review === true || record.needs_review === 1 || record.needs_review === '1',
    postId: readText(record.post_id) || undefined,
    storyId: readText(record.story_id) || undefined,
  };
}

export async function fetchVideoPublishStatuses(
  uploadIds: string[],
): Promise<VideoPublishStatus[]> {
  const response = await apiBridge.post<{ uploads?: unknown[] }>(
    apiRoutes.media.uploadStatus,
    { upload_ids: uploadIds.join(',') },
  );
  return (Array.isArray(response?.uploads) ? response.uploads : [])
    .map(readVideoPublishStatus)
    .filter((item): item is VideoPublishStatus => item !== null);
}
