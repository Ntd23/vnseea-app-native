import type { MessageItem } from '../../domain/types/messages.types';

export type ChatMessageListItem =
  | { kind: 'message'; id: string; message: MessageItem }
  | { kind: 'media-group'; id: string; messages: MessageItem[] };

function isGroupableMediaMessage(message: MessageItem) {
  return Boolean(
    !message.systemEvent &&
      message.media &&
      message.mediaGroupId &&
      (message.mediaType === 'image' || message.mediaType === 'video'),
  );
}

export function buildChatMessageListItems(
  messages: MessageItem[],
): ChatMessageListItem[] {
  const items: ChatMessageListItem[] = [];

  for (let index = 0; index < messages.length; ) {
    const message = messages[index];
    if (!isGroupableMediaMessage(message)) {
      items.push({ kind: 'message', id: message.id, message });
      index += 1;
      continue;
    }

    const group = [message];
    let nextIndex = index + 1;
    while (nextIndex < messages.length) {
      const nextMessage = messages[nextIndex];

      if (
        !isGroupableMediaMessage(nextMessage) ||
        nextMessage.isSentByMe !== message.isSentByMe ||
        nextMessage.fromId !== message.fromId ||
        nextMessage.mediaGroupId !== message.mediaGroupId
      ) {
        break;
      }

      group.push(nextMessage);
      nextIndex += 1;
    }

    items.push(
      group.length > 1
        ? {
            kind: 'media-group',
            id: `media-group-${group.map(item => item.id).join('-')}`,
            messages: group,
          }
        : { kind: 'message', id: message.id, message },
    );
    index = nextIndex;
  }

  return items;
}
