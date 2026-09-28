import type { ChatItem, MessageItem } from '../../domain/types/messages.types';

const GROUP_SENDER_NAME_COLORS = [
  '#D9480F',
  '#1971C2',
  '#2B8A3E',
  '#9C36B5',
  '#C2255C',
  '#0C8599',
  '#5F3DC4',
  '#B35C00',
] as const;

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

/**
 * Group chats label the first (top-most) message of each incoming sender run
 * with the sender's avatar and name. `olderMessage` is the message rendered
 * directly above this one.
 */
export function shouldShowGroupSenderHeader(
  chat: Pick<ChatItem, 'chatType'>,
  message: Pick<MessageItem, 'isSentByMe' | 'fromId'>,
  olderMessage?: Pick<MessageItem, 'isSentByMe' | 'fromId' | 'systemEvent'>,
) {
  if (chat.chatType !== 'group' || message.isSentByMe) return false;
  if (!olderMessage || olderMessage.isSentByMe || olderMessage.systemEvent) {
    return true;
  }
  return olderMessage.fromId !== message.fromId;
}

export function resolveGroupSenderNameColor(senderId: string) {
  let hash = 0;
  for (let index = 0; index < senderId.length; index += 1) {
    hash = (hash * 31 + senderId.charCodeAt(index)) % 2147483647;
  }
  return GROUP_SENDER_NAME_COLORS[hash % GROUP_SENDER_NAME_COLORS.length];
}
