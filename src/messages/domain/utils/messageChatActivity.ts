import type { ChatItem } from '../types/messages.types';

export function getChatActivityTime(chat: ChatItem) {
  return Math.max(
    Number(chat.lastMessageTime) || 0,
    Number(chat.relationshipActivityTime) || 0,
  );
}

export function getChatPreviewTime(chat: ChatItem) {
  return chat.lastMessageTime > 0
    ? chat.lastMessageTime
    : getChatActivityTime(chat);
}
