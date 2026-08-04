import type { ChatItem, MessageItem } from '../../../domain/types/messages.types';
import {
  resolveConversationMessageAvatar,
  shouldShowConversationMessageAvatar,
} from '../groupMessagePresentation';

const chat = {
  chatType: 'group',
  avatar: 'group.jpg',
} as ChatItem;

const message = (fromId: string, overrides: Partial<MessageItem> = {}) =>
  ({
    id: fromId,
    fromId,
    toId: '',
    conversationId: '9',
    message: 'Tin nhắn',
    senderAvatar: `${fromId}.jpg`,
    reactions: { total: 0, myReaction: null, topReactions: [], breakdown: {} },
    time: 1,
    seen: 0,
    isSentByMe: false,
    ...overrides,
  }) as MessageItem;

describe('group message presentation', () => {
  it('uses the sender avatar for incoming group messages', () => {
    expect(resolveConversationMessageAvatar(chat, message('member-1'))).toBe(
      'member-1.jpg',
    );
  });

  it('falls back to the conversation avatar outside group chat', () => {
    expect(
      resolveConversationMessageAvatar(
        { ...chat, chatType: 'user' },
        message('member-1'),
      ),
    ).toBe('group.jpg');
  });

  it('starts a new avatar group when the incoming sender changes', () => {
    expect(
      shouldShowConversationMessageAvatar(
        chat,
        message('member-1'),
        message('member-2'),
      ),
    ).toBe(true);
    expect(
      shouldShowConversationMessageAvatar(
        chat,
        message('member-1'),
        message('member-1'),
      ),
    ).toBe(false);
  });
});
