import type { MessageAttachment } from '../../domain/types/messages.types';

export type ComposerMediaPreparationState =
  | 'preparing'
  | 'ready'
  | 'failed';

export interface ComposerMediaAttachment extends MessageAttachment {
  draftId: string;
  preparationState: ComposerMediaPreparationState;
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
        preparationState: video ? 'preparing' : 'ready',
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

export function applyComposerVideoThumbnail(
  attachments: ChatComposerAttachment[],
  draftId: string,
  thumbnail: ComposerVideoThumbnail,
) {
  const index = attachments.findIndex(
    item => isComposerMediaAttachment(item) && item.draftId === draftId,
  );
  if (index < 0) return attachments;

  const next = [...attachments];
  next[index] = {
    ...next[index],
    thumbnailUri: thumbnail.uri,
    thumbnailName: thumbnail.name,
    thumbnailType: thumbnail.type,
    preparationState: 'ready',
  };
  return next;
}

export function markComposerMediaPreparationFailed(
  attachments: ChatComposerAttachment[],
  draftId: string,
) {
  const index = attachments.findIndex(
    item => isComposerMediaAttachment(item) && item.draftId === draftId,
  );
  if (index < 0) return attachments;

  const next = [...attachments];
  next[index] = {
    ...next[index],
    preparationState: 'failed',
  };
  return next;
}
