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
      lastMessageTime: 999,
      isFollower: true,
      isOnline: true,
    });

    expect(mergeChatItems([conversation], [discovery])).toEqual([
      expect.objectContaining({
        chatId: 'conversation-record-10',
        hasConversationRecord: true,
        lastMessage: 'old message',
        lastMessageTime: 100,
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
      lastMessageTime: 999,
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
        isFollowing: true,
      }),
    ]);
  });

  it('keeps conversations above discovery rows in the merged state', () => {
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
      lastMessageTime: 999,
    });

    expect(mergeChatItems([discovery, conversation])).toEqual([
      conversation,
      discovery,
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
      lastMessage: 'https://v2.vnseea.vn/map?lat=21&lng=105',
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
});
