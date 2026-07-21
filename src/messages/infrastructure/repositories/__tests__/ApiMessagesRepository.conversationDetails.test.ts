import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import type { ChatItem } from '../../../domain/types/messages.types';
import { createMessagesRepository } from '../ApiMessagesRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://v2.vnseea.vn',
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: () => ({ userId: '1' }),
    },
  }),
);

const post = apiBridge.post as jest.Mock;

function rawMessage(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    from_id: '2',
    to_id: '1',
    or_text: `Tin nhắn ${id}`,
    time: 100 + Number(id),
    seen: 1,
    ...overrides,
  };
}

describe('ApiMessagesRepository conversation details', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('keeps the chat record id separate from the participant id and maps mute state', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          chat_type: 'user',
          chat_id: '77',
          user_data: {
            user_id: '12',
            username: 'partner',
            name: 'Partner',
          },
          mute: { notify: 'no' },
          last_message: rawMessage('9'),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.chatId).toBe('77');
    expect(chat.hasConversationRecord).toBe(true);
    expect(chat.participantId).toBe('12');
    expect(chat.userId).toBe('12');
    expect(chat.notificationsMuted).toBe(true);
  });

  it('does not invent a chat record id for discovered users', async () => {
    post.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({
      data: {
        following: [
          {
            user_id: '12',
            username: 'partner',
            name: 'Partner',
          },
        ],
        followers: [],
      },
    });

    const [chat] = await createMessagesRepository().getChats({
      latestOnly: true,
      forceRefresh: true,
    });

    expect(chat.participantId).toBe('12');
    expect(chat.chatId).toBeUndefined();
    expect(chat.hasConversationRecord).toBe(false);
  });

  it('resolves the real conversation record for a participant', async () => {
    post.mockResolvedValueOnce({
      data: [
        {
          chat_type: 'user',
          chat_id: '77',
          user_data: {
            user_id: '12',
            username: 'partner',
            name: 'Partner',
          },
          last_message: rawMessage('9'),
        },
      ],
    });

    const chat = await createMessagesRepository().findUserConversation('12');

    expect(chat?.chatId).toBe('77');
    expect(chat?.participantId).toBe('12');
    expect(chat?.hasConversationRecord).toBe(true);
  });

  it('sends canonical search, media, notification and pin payloads', async () => {
    post
      .mockResolvedValueOnce({ data: [rawMessage('10')] })
      .mockResolvedValueOnce({
        data: [rawMessage('11', { media: 'upload/photos/a.jpg' })],
      })
      .mockResolvedValueOnce({
        data: [rawMessage('12', { media: 'upload/videos/a.mp4' })],
      })
      .mockResolvedValue({ api_status: 200, data: [] });
    const repository = createMessagesRepository();

    const search = await repository.searchConversationMessages('2', 'xin chào');
    const assets = await repository.getConversationAssets('2', 'media');
    await repository.setConversationNotifications('77', false);
    await repository.setMessagePinned('77', '10', true);
    await repository.getPinnedMessages('77');

    expect(search[0].id).toBe('10');
    expect(assets.items.map(item => item.id)).toEqual(['12', '11']);
    expect(assets.nextCursor).toBeUndefined();
    expect(assets.items.every(item => item.media?.startsWith('http'))).toBe(
      true,
    );
    expect(post).toHaveBeenCalledWith('chat', {
      type: 'search',
      user_id: '2',
      text: 'xin chào',
    });
    expect(post).toHaveBeenCalledWith('mute', {
      chat_id: '77',
      type: 'user',
      notify: 'no',
    });
    expect(post).toHaveBeenCalledWith('pin_message', {
      chat_id: '77',
      message_id: '10',
      pin: 'yes',
      type: 'user',
    });
    expect(post).toHaveBeenCalledWith('get_pin_message', {
      chat_id: '77',
      type: 'user',
    });
  });

  it('uses the group id for pinned messages and keeps newest pins first', async () => {
    post
      .mockResolvedValueOnce({
        data: [
          rawMessage('10', { group_id: '55', pinned_at: 100 }),
          rawMessage('11', { group_id: '55', pinned_at: 200 }),
        ],
      })
      .mockResolvedValueOnce({ api_status: 200 });
    const groupChat: ChatItem = {
      id: 'group:55',
      chatId: '55',
      chatType: 'group',
      groupId: '55',
      userId: '55',
      username: '',
      name: 'Nhóm',
      avatar: '',
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: false,
    };
    const repository = createMessagesRepository();

    const pinned = await repository.getPinnedMessages(groupChat);
    await repository.setMessagePinned(groupChat, '11', false);

    expect(pinned.map(message => message.id)).toEqual(['11', '10']);
    expect(post).toHaveBeenNthCalledWith(1, 'get_pin_message', {
      chat_id: '55',
      type: 'group',
    });
    expect(post).toHaveBeenNthCalledWith(2, 'pin_message', {
      chat_id: '55',
      message_id: '11',
      pin: 'no',
      type: 'group',
    });
  });

  it('keeps independent media cursors so an exhausted stream is not fetched again', async () => {
    post
      .mockResolvedValueOnce({
        data: [
          rawMessage('20', { media: 'upload/photos/20.jpg' }),
          rawMessage('18', { media: 'upload/photos/18.jpg' }),
        ],
      })
      .mockResolvedValueOnce({
        data: [rawMessage('19', { media: 'upload/videos/19.mp4' })],
      })
      .mockResolvedValueOnce({
        data: [rawMessage('17', { media: 'upload/photos/17.jpg' })],
      });
    const repository = createMessagesRepository();

    const firstPage = await repository.getConversationAssets(
      '2',
      'media',
      undefined,
      2,
    );
    const secondPage = await repository.getConversationAssets(
      '2',
      'media',
      firstPage.nextCursor,
      2,
    );

    expect(firstPage.nextCursor).toEqual({ images: '18', videos: null });
    expect(secondPage.items.map(item => item.id)).toEqual(['17']);
    expect(post).toHaveBeenNthCalledWith(3, 'chat', {
      type: 'get_media',
      user_id: '2',
      media_type: 'images',
      offset: '18',
      limit: 2,
    });
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('sends block, idempotent report and message-context requests to the existing endpoints', async () => {
    post
      .mockResolvedValueOnce({ api_status: 200, block_status: 'blocked' })
      .mockResolvedValueOnce({
        api_status: 200,
        code: 1,
        already_reported: 0,
      })
      .mockResolvedValueOnce({ api_status: 200, messages: [] });
    const repository = createMessagesRepository();

    await repository.blockConversationUser('2');
    const report = await repository.reportConversationUser('2', 'Spam');
    await repository.getMessages('2', { messageId: '44' });

    expect(report).toEqual({ reported: true, alreadyReported: false });
    expect(post).toHaveBeenCalledWith('block-user', {
      user_id: '2',
      block_action: 'block',
    });
    expect(post).toHaveBeenCalledWith('report_user', {
      user: '2',
      text: 'Spam',
      ensure_reported: 1,
    });
    expect(post).toHaveBeenCalledWith('get_user_messages', {
      recipient_id: '2',
      limit: 20,
      before_message_id: undefined,
      after_message_id: undefined,
      message_id: '44',
    });
  });

  it('rejects a block operation that the backend did not apply', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      block_status: 'invalid',
    });

    await expect(
      createMessagesRepository().blockConversationUser('2'),
    ).rejects.toThrow('Backend không xác nhận chặn người dùng.');
  });

  it('does not call the toggle endpoint when the user is already reported', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      code: 1,
      already_reported: 1,
    });

    const result = await createMessagesRepository().reportConversationUser(
      '2',
      'Spam',
    );

    expect(result).toEqual({ reported: true, alreadyReported: true });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('report_user', {
      user: '2',
      text: 'Spam',
      ensure_reported: 1,
    });
  });
});
