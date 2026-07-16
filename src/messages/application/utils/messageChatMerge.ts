import type { ChatItem } from '../../domain/types/messages.types';

function getChatMergeKey(chat: ChatItem) {
  return chat.chatType === 'user' ? `${chat.chatType}:${chat.userId}` : chat.id;
}

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

function mergeRelationshipState(base: ChatItem, incoming: ChatItem) {
  return {
    isFollowing: incoming.isFollowing ?? base.isFollowing,
    isFollower: incoming.isFollower ?? base.isFollower,
    isOnline: incoming.isOnline,
  };
}

function mergeDiscoveryIntoConversation(
  conversation: ChatItem,
  discovery: ChatItem,
): ChatItem {
  return {
    ...conversation,
    name: discovery.name || conversation.name,
    username: discovery.username || conversation.username,
    avatar: discovery.avatar || conversation.avatar,
    ...mergeRelationshipState(conversation, discovery),
  };
}

function mergeSameChat(current: ChatItem, incoming: ChatItem) {
  const currentHasConversation = hasConversationActivity(current);
  const incomingHasConversation = hasConversationActivity(incoming);

  if (currentHasConversation && !incomingHasConversation) {
    return mergeDiscoveryIntoConversation(current, incoming);
  }

  if (incomingHasConversation && !currentHasConversation) {
    return {
      ...incoming,
      isFollowing: incoming.isFollowing ?? current.isFollowing,
      isFollower: incoming.isFollower ?? current.isFollower,
      labels: current.labels ?? incoming.labels,
    };
  }

  const newest =
    incoming.lastMessageTime >= current.lastMessageTime ? incoming : current;
  const oldest = newest === incoming ? current : incoming;

  return {
    ...newest,
    isFollowing: newest.isFollowing ?? oldest.isFollowing,
    isFollower: newest.isFollower ?? oldest.isFollower,
    labels: newest.labels ?? oldest.labels,
  };
}

function getSortBucket(chat: ChatItem) {
  if (chat.unreadCount > 0) return 0;
  if (hasConversationActivity(chat)) return 1;
  if (chat.isFollowing || chat.isFollower) return 2;
  return 3;
}

function compareChatItems(left: ChatItem, right: ChatItem) {
  const leftBucket = getSortBucket(left);
  const rightBucket = getSortBucket(right);

  if (leftBucket !== rightBucket) return leftBucket - rightBucket;

  const timeDifference = right.lastMessageTime - left.lastMessageTime;
  if (timeDifference !== 0) return timeDifference;

  return right.unreadCount - left.unreadCount;
}

export function mergeChatItems(...chatLists: ChatItem[][]) {
  const chats = new Map<string, ChatItem>();

  for (const chat of chatLists.flat()) {
    const key = getChatMergeKey(chat);
    const current = chats.get(key);

    chats.set(key, current ? mergeSameChat(current, chat) : chat);
  }

  return [...chats.values()].sort(compareChatItems);
}
