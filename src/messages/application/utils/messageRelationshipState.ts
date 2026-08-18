import type { ChatItem } from '../../domain/types/messages.types';

export type MessageRelationshipChange = {
  peerUserId: string;
  occurredAt: number;
  revision: number;
  isFollowing: boolean;
  isFollower: boolean;
};

function normalizeUnixMilliseconds(value: number) {
  const finiteValue = Number.isFinite(value) ? value : 0;
  return Math.floor(
    finiteValue > 10_000_000_000 ? finiteValue : finiteValue * 1000,
  );
}

export function applyRelationshipChange(
  chats: ChatItem[],
  change: MessageRelationshipChange,
): ChatItem[] {
  const occurredAt = normalizeUnixMilliseconds(change.occurredAt);
  if (!change.peerUserId || occurredAt < 1 || change.revision < 1) return chats;

  let changed = false;
  const nextChats: ChatItem[] = [];
  for (const chat of chats) {
    if (chat.chatType !== 'user' || chat.userId !== change.peerUserId) {
      nextChats.push(chat);
      continue;
    }
    if (
      (chat.relationshipStateRevision ?? 0) > change.revision ||
      (chat.relationshipEventOccurredAt ?? 0) > occurredAt
    ) {
      nextChats.push(chat);
      continue;
    }

    const hasRelationship = change.isFollowing || change.isFollower;
    if (!hasRelationship && chat.hasConversationRecord === false) {
      changed = true;
      continue;
    }

    changed = true;
    const addedRelationshipDirection =
      (change.isFollowing && !chat.isFollowing) ||
      (change.isFollower && !chat.isFollower);
    nextChats.push({
      ...chat,
      isFollowing: change.isFollowing,
      isFollower: change.isFollower,
      relationshipActivityTime: hasRelationship
        ? addedRelationshipDirection
          ? Math.floor(occurredAt / 1000)
          : chat.relationshipActivityTime
        : undefined,
      relationshipStateRevision: change.revision,
      relationshipEventOccurredAt: occurredAt,
    });
  }

  return changed ? nextChats : chats;
}

export function stampAuthoritativeRelationshipSnapshot(
  chats: ChatItem[],
  revision: number,
): ChatItem[] {
  if (revision < 0) return chats;

  return chats.map(chat => {
    if (
      chat.chatType !== 'user' ||
      (chat.isFollowing === undefined && chat.isFollower === undefined)
    ) {
      return chat;
    }
    const hasRelationship = Boolean(chat.isFollowing || chat.isFollower);
    return {
      ...chat,
      relationshipActivityTime: hasRelationship
        ? chat.relationshipActivityTime
        : undefined,
      relationshipStateRevision: revision,
    };
  });
}
