import type { ChatItem } from '../../domain/types/messages.types';
import { getChatActivityTime } from '../../domain/utils/messageChatActivity';

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
  const baseDefinesState =
    base.isFollowing !== undefined || base.isFollower !== undefined;
  const incomingDefinesState =
    incoming.isFollowing !== undefined || incoming.isFollower !== undefined;
  const baseRevision = base.relationshipStateRevision ?? 0;
  const incomingRevision = incoming.relationshipStateRevision ?? 0;
  const useIncoming =
    incomingDefinesState &&
    (!baseDefinesState ||
      incomingRevision > baseRevision ||
      (incomingRevision === baseRevision &&
        ((incomingRevision > 0) ||
          (incoming.relationshipActivityTime ?? 0) >=
            (base.relationshipActivityTime ?? 0))));
  const source = useIncoming ? incoming : base;
  const fallback = useIncoming ? base : incoming;
  const isFollowing = source.isFollowing ?? fallback.isFollowing;
  const isFollower = source.isFollower ?? fallback.isFollower;
  const hasRelationship = Boolean(isFollowing || isFollower);
  const relationshipActivityTime = hasRelationship
    ? source.relationshipActivityTime ?? fallback.relationshipActivityTime ?? 0
    : 0;
  const relationshipStateRevision = Math.max(baseRevision, incomingRevision);

  return {
    isFollowing,
    isFollower,
    isOnline: incoming.isOnline,
    relationshipActivityTime:
      relationshipActivityTime > 0 ? relationshipActivityTime : undefined,
    relationshipStateRevision:
      relationshipStateRevision > 0
        ? relationshipStateRevision
        : undefined,
    relationshipEventOccurredAt:
      Math.max(
        base.relationshipEventOccurredAt ?? 0,
        incoming.relationshipEventOccurredAt ?? 0,
      ) || undefined,
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
      labels: current.labels ?? incoming.labels,
      ...mergeRelationshipState(current, incoming),
    };
  }

  const currentMessageId = Number(current.lastMessageId ?? 0);
  const incomingMessageId = Number(incoming.lastMessageId ?? 0);
  const incomingIsNewer =
    incoming.lastMessageTime > current.lastMessageTime ||
    (incoming.lastMessageTime === current.lastMessageTime &&
      incomingMessageId >= currentMessageId);
  const newest = incomingIsNewer ? incoming : current;
  const oldest = newest === incoming ? current : incoming;

  return {
    ...newest,
    // Message activity decides which preview wins, but the incoming server
    // snapshot is authoritative for mutable conversation metadata. Otherwise
    // a cached row with a newer message can keep an old group name forever.
    name: incoming.name || newest.name,
    username: incoming.username || newest.username,
    avatar: incoming.avatar || newest.avatar,
    notificationsMuted:
      incoming.notificationsMuted ?? newest.notificationsMuted,
    labels: newest.labels ?? oldest.labels,
    ...mergeRelationshipState(oldest, newest),
  };
}

function getSortBucket(chat: ChatItem) {
  if (chat.unreadCount > 0) return 0;
  if (hasConversationActivity(chat)) return 1;
  if (chat.isFollowing || chat.isFollower) return 2;
  return 3;
}

function compareChatItems(left: ChatItem, right: ChatItem) {
  const bothDirectUsers =
    left.chatType === 'user' && right.chatType === 'user';
  if (bothDirectUsers) {
    const timeDifference =
      getChatActivityTime(right) - getChatActivityTime(left);
    if (timeDifference !== 0) return timeDifference;
  }

  const unreadDifference = right.unreadCount - left.unreadCount;
  if (unreadDifference !== 0) return unreadDifference;

  const leftBucket = getSortBucket(left);
  const rightBucket = getSortBucket(right);

  if (leftBucket !== rightBucket) return leftBucket - rightBucket;

  if (!bothDirectUsers) {
    const timeDifference = right.lastMessageTime - left.lastMessageTime;
    if (timeDifference !== 0) return timeDifference;
  }

  return 0;
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
