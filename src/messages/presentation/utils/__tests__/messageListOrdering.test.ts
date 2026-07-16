import type { ChatItem } from '../../../domain/types/messages.types';
import { sortMessageUserChats } from '../messageListOrdering';

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

describe('message user list ordering', () => {
  it('keeps real conversations above newer follow discovery rows', () => {
    const olderConversation = chat({
      id: 'conversation-old',
      userId: '10',
      name: 'Old chat',
      hasConversationRecord: true,
      lastMessage: 'hello',
      lastMessageTime: 100,
    });
    const newFollower = chat({
      id: 'discovery-new',
      userId: '20',
      name: 'New follower',
      hasConversationRecord: false,
      isFollower: true,
      lastMessageTime: 999,
    });

    expect(sortMessageUserChats([newFollower, olderConversation])).toEqual([
      olderConversation,
      newFollower,
    ]);
  });

  it('sorts conversations by latest message time', () => {
    const older = chat({
      id: 'older',
      userId: '10',
      hasConversationRecord: true,
      lastMessage: 'old',
      lastMessageTime: 100,
    });
    const newer = chat({
      id: 'newer',
      userId: '11',
      hasConversationRecord: true,
      lastMessage: 'new',
      lastMessageTime: 200,
    });

    expect(sortMessageUserChats([older, newer])).toEqual([newer, older]);
  });

  it('keeps unread conversations at the top of the people tab', () => {
    const unread = chat({
      id: 'unread',
      userId: '10',
      hasConversationRecord: true,
      lastMessage: 'old unread',
      lastMessageTime: 100,
      unreadCount: 1,
    });
    const read = chat({
      id: 'read',
      userId: '11',
      hasConversationRecord: true,
      lastMessage: 'new read',
      lastMessageTime: 200,
    });

    expect(sortMessageUserChats([read, unread])).toEqual([unread, read]);
  });

  it('keeps follow discovery rows realtime within their own section', () => {
    const conversation = chat({
      id: 'conversation',
      userId: '10',
      hasConversationRecord: true,
      lastMessage: 'chat',
      lastMessageTime: 100,
    });
    const olderDiscovery = chat({
      id: 'old-discovery',
      userId: '20',
      name: 'Older discovery',
      hasConversationRecord: false,
      isFollowing: true,
      lastMessageTime: 300,
    });
    const newerDiscovery = chat({
      id: 'new-discovery',
      userId: '21',
      name: 'Newer discovery',
      hasConversationRecord: false,
      isFollower: true,
      lastMessageTime: 400,
    });

    expect(
      sortMessageUserChats([olderDiscovery, newerDiscovery, conversation]),
    ).toEqual([conversation, newerDiscovery, olderDiscovery]);
  });
});
