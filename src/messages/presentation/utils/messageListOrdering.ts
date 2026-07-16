import type { ChatItem } from '../../domain/types/messages.types';

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

export function sortMessageUserChats(chats: ChatItem[]) {
  return [...chats].sort((left, right) => {
    const leftBucket = getUserChatSortBucket(left);
    const rightBucket = getUserChatSortBucket(right);

    if (leftBucket !== rightBucket) return leftBucket - rightBucket;

    const timeDiff = right.lastMessageTime - left.lastMessageTime;
    if (timeDiff !== 0) return timeDiff;

    const unreadDiff = right.unreadCount - left.unreadCount;
    if (unreadDiff !== 0) return unreadDiff;

    if (leftBucket >= 2) {
      const relationshipDiff =
        getRelationshipRank(right) - getRelationshipRank(left);
      if (relationshipDiff !== 0) return relationshipDiff;

      if (left.isOnline !== right.isOnline) return right.isOnline ? 1 : -1;
    }

    return compareNames(left, right);
  });
}
