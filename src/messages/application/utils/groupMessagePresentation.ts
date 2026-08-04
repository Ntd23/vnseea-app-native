import type { ChatItem, MessageItem } from '../../domain/types/messages.types';

export function resolveConversationMessageAvatar(
  chat: Pick<ChatItem, 'chatType' | 'avatar'>,
  message: Pick<MessageItem, 'isSentByMe' | 'senderAvatar'>,
) {
  if (chat.chatType === 'group' && !message.isSentByMe) {
    return message.senderAvatar || chat.avatar;
  }
  return chat.avatar;
}

export function shouldShowConversationMessageAvatar(
  chat: Pick<ChatItem, 'chatType'>,
  message: Pick<MessageItem, 'isSentByMe' | 'fromId'>,
  adjacentMessage?: Pick<MessageItem, 'isSentByMe' | 'fromId'>,
) {
  if (message.isSentByMe) return false;
  if (!adjacentMessage || adjacentMessage.isSentByMe) return true;
  if (chat.chatType !== 'group') return false;
  return adjacentMessage.fromId !== message.fromId;
}
