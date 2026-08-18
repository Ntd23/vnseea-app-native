import type { ChatItem } from '../../../domain/types/messages.types';
import { mergeChatItems } from '../messageChatMerge';

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

describe('message chat merge', () => {
  it('does not let a newer follow discovery row overwrite a real conversation', () => {
    const conversation = chat({
      id: 'conversation-10',
      chatId: 'conversation-record-10',
      userId: '10',
      name: 'Old conversation',
      hasConversationRecord: true,
      lastMessage: 'old message',
      lastMessageTime: 100,
      isOnline: false,
    });
    const discovery = chat({
      id: 'user:10',
      userId: '10',
      name: 'Updated name',
      hasConversationRecord: false,
      lastMessage: '',
      relationshipActivityTime: 200,
      isFollower: true,
      isOnline: true,
    });

    expect(mergeChatItems([conversation], [discovery])).toEqual([
      expect.objectContaining({
        chatId: 'conversation-record-10',
        hasConversationRecord: true,
        lastMessage: 'old message',
        lastMessageTime: 100,
        relationshipActivityTime: 200,
        name: 'Updated name',
        isFollower: true,
        isOnline: true,
      }),
    ]);
  });

  it('upgrades a discovery row when the real conversation arrives later', () => {
    const discovery = chat({
      id: 'user:10',
      userId: '10',
      hasConversationRecord: false,
      isFollowing: true,
      relationshipActivityTime: 200,
    });
    const conversation = chat({
      id: 'conversation-10',
      chatId: 'conversation-record-10',
      userId: '10',
      hasConversationRecord: true,
      lastMessage: 'hello',
      lastMessageTime: 100,
    });

    expect(mergeChatItems([discovery], [conversation])).toEqual([
      expect.objectContaining({
        chatId: 'conversation-record-10',
        hasConversationRecord: true,
        lastMessage: 'hello',
        lastMessageTime: 100,
        relationshipActivityTime: 200,
        isFollowing: true,
      }),
    ]);
  });

  it('sorts discovery and conversation rows by their latest activity', () => {
    const conversation = chat({
      id: 'conversation-10',
      userId: '10',
      hasConversationRecord: true,
      lastMessage: 'old',
      lastMessageTime: 100,
    });
    const discovery = chat({
      id: 'user:20',
      userId: '20',
      hasConversationRecord: false,
      isFollower: true,
      relationshipActivityTime: 200,
    });

    expect(mergeChatItems([discovery, conversation])).toEqual([
      discovery,
      conversation,
    ]);
  });

  it('keeps unread-first ordering for group chats', () => {
    const olderUnreadGroup = chat({
      id: 'group:10',
      chatType: 'group',
      groupId: '10',
      userId: '10',
      lastMessage: 'old unread',
      lastMessageTime: 100,
      unreadCount: 1,
    });
    const newerReadGroup = chat({
      id: 'group:11',
      chatType: 'group',
      groupId: '11',
      userId: '11',
      lastMessage: 'new read',
      lastMessageTime: 200,
    });

    expect(mergeChatItems([newerReadGroup, olderUnreadGroup])).toEqual([
      olderUnreadGroup,
      newerReadGroup,
    ]);
  });

  it('keeps the higher message id when two snapshots have the same timestamp', () => {
    const latestText = chat({
      id: 'group:20',
      chatType: 'group',
      groupId: '20',
      userId: '20',
      lastMessageId: '101',
      lastMessage: 'Tin nhắn mới nhất',
      lastMessageKind: 'text',
      lastMessageTime: 200,
    });
    const staleLocation = chat({
      id: 'group:20',
      chatType: 'group',
      groupId: '20',
      userId: '20',
      lastMessageId: '100',
      lastMessage: 'https://vnseea.vn/map?lat=21&lng=105',
      lastMessageKind: 'location',
      lastMessageTime: 200,
    });

    expect(mergeChatItems([latestText], [staleLocation])).toEqual([
      expect.objectContaining({
        lastMessageId: '101',
        lastMessage: 'Tin nhắn mới nhất',
        lastMessageKind: 'text',
      }),
    ]);
  });

  it('takes a renamed group from the incoming snapshot without losing newer message activity', () => {
    const cachedGroup = chat({
      id: 'group:20',
      chatType: 'group',
      groupId: '20',
      userId: '20',
      name: 'Tên nhóm cũ',
      avatar: 'old-avatar.jpg',
      lastMessageId: '102',
      lastMessage: 'Tin nhắn mới nhất',
      lastMessageTime: 300,
    });
    const refreshedGroup = chat({
      id: 'group:20',
      chatType: 'group',
      groupId: '20',
      userId: '20',
      name: 'Tên nhóm mới',
      avatar: 'new-avatar.jpg',
      lastMessageId: '101',
      lastMessage: 'Tin nhắn cũ hơn',
      lastMessageTime: 200,
    });

    expect(mergeChatItems([cachedGroup], [refreshedGroup])).toEqual([
      expect.objectContaining({
        name: 'Tên nhóm mới',
        avatar: 'new-avatar.jpg',
        lastMessageId: '102',
        lastMessage: 'Tin nhắn mới nhất',
        lastMessageTime: 300,
      }),
    ]);
  });
});
