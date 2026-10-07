import type { ChatItem } from '../../domain/types/messages.types';
import { getChatActivityTime } from '../../domain/utils/messageChatActivity';

function hasConversationActivity(chat: ChatItem) {
  if (chat.chatType !== 'user') return true;
  if (chat.hasConversationRecord === false) return false;

  return (
    Boolean(chat.hasConversationRecord) ||
    Boolean(chat.chatId) ||
    chat.lastMessageTime > 0 ||
    chat.lastMessage.trim().length > 0
  );
}

function getRelationshipRank(chat: ChatItem) {
  if (chat.isFollowing && chat.isFollower) return 3;
  if (chat.isFollowing) return 2;
  if (chat.isFollower) return 1;
  return 0;
}

function getUserChatSortBucket(chat: ChatItem) {
  if (chat.unreadCount > 0) return 0;
  if (hasConversationActivity(chat)) return 1;
  if (chat.isFollowing || chat.isFollower) return 2;
  return 3;
}

function compareNames(left: ChatItem, right: ChatItem) {
  const leftName = (left.name || left.username || '').toLocaleLowerCase('vi-VN');
  const rightName = (right.name || right.username || '').toLocaleLowerCase('vi-VN');

  return leftName.localeCompare(rightName, 'vi-VN');
}

/**
 * The "Tất cả" list: one-to-one, Page and group conversations newest first
 * by their latest activity (a message, or a follow for contacts without a
 * conversation). Every chat type uses the same keys, so the order stays
 * consistent when groups sit between people.
 */
export function sortMessageChats(chats: ChatItem[]) {
  return [...chats].sort((left, right) => {
    const timeDiff = getChatActivityTime(right) - getChatActivityTime(left);
    if (timeDiff !== 0) return timeDiff;

    const unreadDiff = right.unreadCount - left.unreadCount;
    if (unreadDiff !== 0) return unreadDiff;

    const leftBucket = getUserChatSortBucket(left);
    const rightBucket = getUserChatSortBucket(right);

    if (leftBucket !== rightBucket) return leftBucket - rightBucket;

    if (leftBucket >= 2) {
      const relationshipDiff =
        getRelationshipRank(right) - getRelationshipRank(left);
      if (relationshipDiff !== 0) return relationshipDiff;

      if (left.isOnline !== right.isOnline) return right.isOnline ? 1 : -1;
    }

    return compareNames(left, right);
  });
}
