import type { MessageAttachment } from '../../domain/types/messages.types';

export type ComposerMediaPreparationState = 'preparing' | 'ready';

export interface ComposerMediaAttachment extends MessageAttachment {
  draftId: string;
  preparationState: ComposerMediaPreparationState;
  /** On-device compression progress between 0 and 1, for videos. */
  preparationProgress?: number;
}

export type ChatComposerAttachment =
  | MessageAttachment
  | ComposerMediaAttachment;

export function isComposerMediaAttachment(
  attachment: ChatComposerAttachment,
): attachment is ComposerMediaAttachment {
  return 'draftId' in attachment;
}

export interface MessageComposerPickedAsset {
  uri?: string;
  fileName?: string;
  type?: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface CreateComposerMediaDraftOptions {
  platform: 'ios' | 'android';
  createDraftId: (index: number) => string;
  now?: number;
}

interface ComposerVideoThumbnail {
  uri: string;
  name: string;
  type: string;
}

function normalizeLocalMediaUri(uri: string, platform: 'ios' | 'android') {
  if (
    platform !== 'android' ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(uri)
  ) {
    return uri;
  }
  return `file://${uri}`;
}

function isVideoAsset(asset: MessageComposerPickedAsset) {
  return (
    asset.type?.startsWith('video/') === true ||
    /\.(mp4|mov|webm|m4v)$/i.test(asset.fileName ?? '')
  );
}

export function createComposerMediaDrafts(
  assets: MessageComposerPickedAsset[],
  options: CreateComposerMediaDraftOptions,
): ComposerMediaAttachment[] {
  const now = options.now ?? Date.now();

  return assets.flatMap((asset, index) => {
    if (!asset.uri) return [];

    const video = isVideoAsset(asset);
    return [
      {
        draftId: options.createDraftId(index),
        // Both kinds are compressed in the background before upload.
        preparationState: 'preparing',
        uri: normalizeLocalMediaUri(asset.uri, options.platform),
        name:
          asset.fileName ??
          `chat-${now}-${index}.${video ? 'mp4' : 'jpg'}`,
        type: asset.type ?? (video ? 'video/mp4' : 'image/jpeg'),
        mediaType: video ? 'video' : 'image',
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
      },
    ];
  });
}

function updateComposerDraft(
  attachments: ChatComposerAttachment[],
  draftId: string,
  patch: Partial<ComposerMediaAttachment>,
) {
  const index = attachments.findIndex(
    item => isComposerMediaAttachment(item) && item.draftId === draftId,
  );
  if (index < 0) return attachments;

  const next = [...attachments];
  next[index] = { ...next[index], ...patch };
  return next;
}

export function applyComposerVideoThumbnail(
  attachments: ChatComposerAttachment[],
  draftId: string,
  thumbnail: ComposerVideoThumbnail,
) {
  return updateComposerDraft(attachments, draftId, {
    thumbnailUri: thumbnail.uri,
    thumbnailName: thumbnail.name,
    thumbnailType: thumbnail.type,
  });
}

export function updateComposerMediaPreparationProgress(
  attachments: ChatComposerAttachment[],
  draftId: string,
  progress: number,
) {
  return updateComposerDraft(attachments, draftId, {
    preparationProgress: progress,
  });
}

export function markComposerMediaPrepared(
  attachments: ChatComposerAttachment[],
  draftId: string,
) {
  return updateComposerDraft(attachments, draftId, {
    preparationState: 'ready',
    preparationProgress: 1,
  });
}

/** Drops composer-only draft fields before the attachment leaves the screen. */
export function toMessageAttachment(
  attachment: ChatComposerAttachment,
): MessageAttachment {
  if (!isComposerMediaAttachment(attachment)) return attachment;
  const messageAttachment: MessageAttachment &
    Partial<
      Pick<
        ComposerMediaAttachment,
        'draftId' | 'preparationState' | 'preparationProgress'
      >
    > = { ...attachment };
  delete messageAttachment.draftId;
  delete messageAttachment.preparationState;
  delete messageAttachment.preparationProgress;
  return messageAttachment;
}
