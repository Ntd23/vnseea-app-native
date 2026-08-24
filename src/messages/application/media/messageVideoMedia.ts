import type { MessageItem } from '../../domain/types/messages.types';

export function preserveOptimisticVideoThumbnail(
  sentMessages: MessageItem[],
  optimisticMessage: MessageItem,
) {
  if (
    optimisticMessage.mediaType !== 'video' ||
    !optimisticMessage.thumbnail
  ) {
    return sentMessages;
  }

  return sentMessages.map(message =>
    message.mediaType === 'video' && !message.thumbnail
      ? { ...message, thumbnail: optimisticMessage.thumbnail }
      : message,
  );
}
