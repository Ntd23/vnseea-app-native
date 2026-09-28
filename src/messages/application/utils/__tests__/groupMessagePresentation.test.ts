import type { ChatItem, MessageItem } from '../../../domain/types/messages.types';
import {
  resolveConversationMessageAvatar,
  resolveGroupSenderNameColor,
  shouldShowConversationMessageAvatar,
  shouldShowGroupSenderHeader,
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

  it('labels the first message of each incoming group sender run', () => {
    expect(shouldShowGroupSenderHeader(chat, message('member-1'))).toBe(true);
    expect(
      shouldShowGroupSenderHeader(chat, message('member-1'), message('member-2')),
    ).toBe(true);
    expect(
      shouldShowGroupSenderHeader(
        chat,
        message('member-1'),
        message('me', { isSentByMe: true }),
      ),
    ).toBe(true);
    expect(
      shouldShowGroupSenderHeader(
        chat,
        message('member-1'),
        message('member-1', {
          systemEvent: {
            type: 'message_pinned',
            actorId: 'member-1',
            actorName: 'Member',
          },
        }),
      ),
    ).toBe(true);
    expect(
      shouldShowGroupSenderHeader(chat, message('member-1'), message('member-1')),
    ).toBe(false);
  });

  it('never labels own messages or direct chats', () => {
    expect(
      shouldShowGroupSenderHeader(chat, message('me', { isSentByMe: true })),
    ).toBe(false);
    expect(
      shouldShowGroupSenderHeader(
        { ...chat, chatType: 'user' },
        message('member-1'),
      ),
    ).toBe(false);
  });

  it('gives each sender a stable name color', () => {
    expect(resolveGroupSenderNameColor('1852')).toBe(
      resolveGroupSenderNameColor('1852'),
    );
    expect(resolveGroupSenderNameColor('1852')).toMatch(/^#[0-9A-F]{6}$/);
  });
});
