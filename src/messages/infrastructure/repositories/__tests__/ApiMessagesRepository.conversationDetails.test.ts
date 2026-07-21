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

  it('uses the pin actor in the conversation preview instead of the raw token', async () => {
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
          last_message: rawMessage('9', {
            type_two: 'message_pin_event',
            reply_id: '8',
            or_text: 'message_pinned',
            messageUser: { user_id: '2', name: 'Partner' },
          }),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.lastMessage).toBe('Partner đã ghim một tin nhắn');
    expect(chat.lastMessage).not.toContain('message_pinned');
  });

  it('classifies shared posts, locations and links and records the last sender', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          chat_type: 'user',
          chat_id: '71',
          user_data: { user_id: '11', username: 'post', name: 'Post' },
          last_message: rawMessage('1', {
            from_id: '1',
            or_text: 'Xem bài này\nhttps://v2.vnseea.vn/post/123',
          }),
        },
        {
          chat_type: 'group',
          group_id: '72',
          chat_id: '72',
          group_name: 'Map group',
          last_message: rawMessage('2', {
            or_text:
              'Mở bản đồ: https://v2.vnseea.vn/map?lat=21.02&lng=105.84&title=Hanoi',
          }),
        },
        {
          chat_type: 'page',
          page_id: '73',
          chat_id: '73',
          page_title: 'Page',
          last_message: rawMessage('3', {
            or_text: 'https://example.com/news',
          }),
        },
      ],
    });

    const chats = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(
      Object.fromEntries(
        chats.map(chat => [
          chat.chatId,
          { kind: chat.lastMessageKind, isMine: chat.lastMessageIsMine },
        ]),
      ),
    ).toEqual({
      '71': { kind: 'shared_post', isMine: true },
      '72': { kind: 'location', isMine: false },
      '73': { kind: 'link', isMine: false },
    });
  });

  it('keeps a plain text last message as text when transport coordinates are zero', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          chat_type: 'user',
          chat_id: '74',
          user_data: { user_id: '12', username: 'partner', name: 'Partner' },
          last_message: rawMessage('14', {
            from_id: '1',
            or_text: 'Đây mới là tin nhắn mới nhất',
            lat: '0',
            lng: '0',
          }),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.lastMessageId).toBe('14');
    expect(chat.lastMessageKind).toBe('text');
    expect(chat.lastMessage).toBe('Đây mới là tin nhắn mới nhất');
  });

  it('deduplicates equal-time conversation snapshots by the latest message id', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          chat_type: 'group',
          group_id: '75',
          chat_id: '75',
          group_name: 'Nhóm',
          last_message: rawMessage('31', {
            time: 500,
            or_text: 'Tin nhắn mới nhất',
          }),
        },
        {
          chat_type: 'group',
          group_id: '75',
          chat_id: '75',
          group_name: 'Nhóm',
          last_message: rawMessage('30', {
            time: 500,
            or_text:
              'https://v2.vnseea.vn/map?lat=21.02&lng=105.84&title=Hanoi',
          }),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.lastMessageId).toBe('31');
    expect(chat.lastMessageKind).toBe('text');
    expect(chat.lastMessage).toBe('Tin nhắn mới nhất');
  });

  it('maps direct and group payloads to the same canonical content descriptors', async () => {
    const contentRows = [
      rawMessage('21', {
        type_two: 'audio',
        media: 'upload/audio/voice.m4a',
        or_text: '',
      }),
      rawMessage('22', {
        media: 'upload/photos/photo.jpg',
        type: 'left_image',
        or_text: '',
      }),
      rawMessage('23', {
        or_text: 'Bài viết hay\nhttps://v2.vnseea.vn/post/321',
      }),
      rawMessage('24', {
        or_text: 'https://example.com/news',
      }),
      rawMessage('25', {
        or_text: '',
        lat: '21.0285',
        lng: '105.8542',
      }),
      rawMessage('26', {
        or_text: '',
        call_event: {
          call_id: 'call-26',
          call_type: 'audio',
          status: 'ended',
          initiator_id: '2',
          receiver_id: '1',
        },
      }),
    ];
    post
      .mockResolvedValueOnce({ api_status: 200, messages: contentRows })
      .mockResolvedValueOnce({
        api_status: 200,
        data: { messages: contentRows.map(row => ({ ...row, group_id: '55' })) },
      });
    const repository = createMessagesRepository();
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

    const directMessages = await repository.getMessages('2');
    const groupMessages = await repository.getMessages(groupChat);

    expect(directMessages.map(message => message.contentKind)).toEqual([
      'audio',
      'image',
      'shared_post',
      'link',
      'location',
      'audio_call',
    ]);
    expect(groupMessages.map(message => message.contentKind)).toEqual(
      directMessages.map(message => message.contentKind),
    );
    expect(directMessages[3].link).toEqual({
      url: 'https://example.com/news',
      host: 'example.com',
    });
    expect(groupMessages[4].location).toEqual(
      expect.objectContaining({ latitude: 21.0285, longitude: 105.8542 }),
    );
  });

  it('decodes WoWonder group link markup before classifying a shared location', async () => {
    const encodedLocation =
      '[a]https%3A%2F%2Fv2.vnseea.vn%2Fmap%3Flat%3D37.785834%26amp%3Blng%3D-122.406417%26amp%3Btitle%3DV%25E1%25BB%258B%2Btr%25C3%25AD%2Bc%25E1%25BB%25A7a%2Bb%25E1%25BA%25A1n%26amp%3Baddress%3DV%25E1%25BB%258B%2Btr%25C3%25AD%2Bhi%25E1%25BB%2587n%2Bt%25E1%25BA%25A1i[/a]';
    post.mockResolvedValueOnce({
      api_status: 200,
      data: {
        messages: [
          rawMessage('27', {
            group_id: '55',
            or_text: encodedLocation,
          }),
        ],
      },
    });
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

    const [message] = await createMessagesRepository().getMessages(groupChat);

    expect(message.contentKind).toBe('location');
    expect(message.link).toBeUndefined();
    expect(message.location).toEqual(
      expect.objectContaining({
        title: 'Vị trí của bạn',
        address: 'Vị trí hiện tại',
        latitude: 37.785834,
        longitude: -122.406417,
      }),
    );
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

    const directChat: ChatItem = {
      id: 'user:77',
      chatId: '77',
      chatType: 'user',
      participantId: '2',
      userId: '2',
      username: 'partner',
      name: 'Partner',
      avatar: '',
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: false,
    };
    const search = await repository.searchConversationMessages(
      directChat,
      'xin chào',
    );
    const assets = await repository.getConversationAssets(directChat, 'media');
    await repository.setConversationNotifications(directChat, false);
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

  it('uses group endpoints for search, assets, notifications and private history clearing', async () => {
    post
      .mockResolvedValueOnce({ data: [rawMessage('10', { group_id: '55' })] })
      .mockResolvedValueOnce({
        data: [rawMessage('11', { group_id: '55', media: 'upload/photos/a.jpg' })],
      })
      .mockResolvedValue({ api_status: 200, data: [] });
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

    await repository.searchConversationMessages(groupChat, 'hẹn');
    await repository.getConversationAssets(groupChat, 'media');
    await repository.setConversationNotifications(groupChat, false);
    await repository.clearGroupHistory(groupChat);

    expect(post).toHaveBeenCalledWith('group_chat', {
      type: 'search',
      id: '55',
      keyword: 'hẹn',
    });
    expect(post).toHaveBeenCalledWith('group_chat', {
      type: 'get_media',
      id: '55',
      media_type: 'images',
      offset: undefined,
      limit: 24,
    });
    expect(post).toHaveBeenCalledWith('mute', {
      chat_id: '55',
      type: 'group',
      notify: 'no',
    });
    expect(post).toHaveBeenCalledWith('group_chat', {
      type: 'clear_history',
      id: '55',
    });
  });

  it('keeps the group owner in the member list when parts omits the owner', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          group_id: '55',
          user_id: '1',
          group_name: 'Nhóm kiểm thử',
          user_data: {
            user_id: '1',
            username: 'owner',
            name: 'Group owner',
            avatar: 'owner.jpg',
          },
          parts: [
            {
              user_id: '2',
              username: 'member',
              name: 'Group member',
              avatar: 'member.jpg',
            },
          ],
        },
      ],
    });

    const info = await createMessagesRepository().getGroupInfo('55');

    expect(info.memberCount).toBe(2);
    expect(info.members.map(member => member.id)).toEqual(['1', '2']);
    expect(info.members[0]).toEqual(
      expect.objectContaining({ id: '1', isOwner: true }),
    );
    expect(info.isOwner).toBe(true);
  });

  it('uses the group id for pinned messages and keeps newest pins first', async () => {
    post
      .mockResolvedValueOnce({
        data: [
          rawMessage('10', {
            group_id: '55',
            pinned_at: 100,
            pinned_by_user_id: '2',
            pinned_by_name: 'Partner',
            can_unpin: false,
          }),
          rawMessage('11', {
            group_id: '55',
            pinned_at: 200,
            pinned_by_user_id: '1',
            pinned_by_name: 'Current user',
            can_unpin: true,
          }),
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
    expect(pinned[0]).toEqual(
      expect.objectContaining({
        pinnedByUserId: '1',
        pinnedByName: 'Bạn',
        canUnpin: true,
      }),
    );
    expect(pinned[1]).toEqual(
      expect.objectContaining({
        pinnedByUserId: '2',
        pinnedByName: 'Partner',
        canUnpin: false,
      }),
    );
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

  it('maps a persisted pin event without exposing its raw transport token', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      messages: [
        rawMessage('30', {
          from_id: '2',
          type_two: 'message_pin_event',
          reply_id: '10',
          or_text: 'message_pinned',
          system_event: {
            type: 'message_pinned',
            actor_id: '2',
            actor_name: 'Partner',
            target_message_id: '10',
          },
        }),
      ],
    });

    const [eventMessage] = await createMessagesRepository().getMessages('2');

    expect(eventMessage.message).toBe('');
    expect(eventMessage.systemEvent).toEqual({
      type: 'message_pinned',
      actorId: '2',
      actorName: 'Partner',
      targetMessageId: '10',
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
    const directChat: ChatItem = {
      id: 'user:2',
      chatId: '2',
      participantId: '2',
      userId: '2',
      name: 'Taylor',
      username: 'taylor',
      avatar: '',
      chatType: 'user',
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: false,
    };

    const firstPage = await repository.getConversationAssets(
      directChat,
      'media',
      undefined,
      2,
    );
    const secondPage = await repository.getConversationAssets(
      directChat,
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
