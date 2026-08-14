import type { ChatItem } from '../../../domain/types/messages.types';
import { applyRelationshipChange } from '../messageRelationshipState';

function chat(overrides: Partial<ChatItem>): ChatItem {
  return {
    id: overrides.userId ? `user:${overrides.userId}` : 'user:1',
    chatType: 'user',
    userId: '1',
    username: 'user',
    name: 'User',
    avatar: '',
    lastMessage: '',
    lastMessageTime: 0,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
    ...overrides,
  };
}

describe('message relationship state', () => {
  it('removes a follow-only discovery row after the relationship ends', () => {
    const discovery = chat({
      userId: '20',
      hasConversationRecord: false,
      isFollower: true,
      relationshipActivityTime: 200,
    });

    expect(
      applyRelationshipChange([discovery], {
        peerUserId: '20',
        occurredAt: 300,
        revision: 1,
        isFollowing: false,
        isFollower: false,
      }),
    ).toEqual([]);
  });

  it('keeps a real conversation but clears stale relationship activity', () => {
    const conversation = chat({
      userId: '20',
      chatId: '77',
      hasConversationRecord: true,
      lastMessage: 'hello',
      lastMessageTime: 100,
      isFollowing: true,
      relationshipActivityTime: 200,
    });

    expect(
      applyRelationshipChange([conversation], {
        peerUserId: '20',
        occurredAt: 300,
        revision: 1,
        isFollowing: false,
        isFollower: false,
      }),
    ).toEqual([
      expect.objectContaining({
        chatId: '77',
        lastMessageTime: 100,
        isFollowing: false,
        isFollower: false,
        relationshipActivityTime: undefined,
        relationshipStateRevision: 1,
        relationshipEventOccurredAt: 300000,
      }),
    ]);
  });

  it('ignores an out-of-order relationship event', () => {
    const conversation = chat({
      userId: '20',
      chatId: '77',
      hasConversationRecord: true,
      isFollowing: true,
      relationshipActivityTime: 400,
      relationshipStateRevision: 2,
      relationshipEventOccurredAt: 400000,
    });

    expect(
      applyRelationshipChange([conversation], {
        peerUserId: '20',
        occurredAt: 300,
        revision: 3,
        isFollowing: false,
        isFollower: false,
      }),
    ).toEqual([conversation]);
  });

  it('does not bump activity when one direction of a mutual follow is removed', () => {
    const conversation = chat({
      userId: '20',
      chatId: '77',
      hasConversationRecord: true,
      isFollowing: true,
      isFollower: true,
      relationshipActivityTime: 200,
    });

    expect(
      applyRelationshipChange([conversation], {
        peerUserId: '20',
        occurredAt: 300,
        revision: 1,
        isFollowing: false,
        isFollower: true,
      }),
    ).toEqual([
      expect.objectContaining({
        isFollowing: false,
        isFollower: true,
        relationshipActivityTime: 200,
      }),
    ]);
  });
});
