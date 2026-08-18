import type { ChatItem } from '../../../domain/types/messages.types';
import { getChatPreviewTime } from '../../../domain/utils/messageChatActivity';
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
  it('sorts newer follow activity above an older conversation', () => {
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
      relationshipActivityTime: 200,
    });

    expect(sortMessageUserChats([newFollower, olderConversation])).toEqual([
      newFollower,
      olderConversation,
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

  it('sorts by latest activity before unread state', () => {
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

    expect(sortMessageUserChats([read, unread])).toEqual([read, unread]);
  });

  it('interleaves follow discovery rows and conversations by activity time', () => {
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
      relationshipActivityTime: 300,
    });
    const newerDiscovery = chat({
      id: 'new-discovery',
      userId: '21',
      name: 'Newer discovery',
      hasConversationRecord: false,
      isFollower: true,
      relationshipActivityTime: 400,
    });

    expect(
      sortMessageUserChats([olderDiscovery, newerDiscovery, conversation]),
    ).toEqual([newerDiscovery, olderDiscovery, conversation]);
  });

  it('keeps the displayed preview time tied to the message when a follow is newer', () => {
    const conversation = chat({
      hasConversationRecord: true,
      lastMessage: 'chat',
      lastMessageTime: 100,
      relationshipActivityTime: 200,
    });
    const followOnly = chat({
      hasConversationRecord: false,
      isFollower: true,
      relationshipActivityTime: 200,
    });

    expect(getChatPreviewTime(conversation)).toBe(100);
    expect(getChatPreviewTime(followOnly)).toBe(200);
  });
});
