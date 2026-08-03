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
    webBaseUrl: 'https://vnseea.vn',
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

function groupChat(): ChatItem {
  return {
    id: 'group:9',
    chatId: '9',
    chatType: 'group',
    groupId: '9',
    userId: '9',
    username: '',
    name: 'Nhóm kiểm thử',
    avatar: '',
    lastMessage: '',
    lastMessageTime: 0,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

function directChat(): ChatItem {
  return {
    id: '2',
    chatId: '77',
    chatType: 'user',
    participantId: '2',
    userId: '2',
    username: 'duong20042',
    name: 'duong20042',
    avatar: '',
    lastMessage: '',
    lastMessageTime: 0,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

function rawMessage(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    from_id: '2',
    to_id: '1',
    or_text: `Tin nhắn ${id}`,
    time: 100 + Number(id),
    seen: 1,
    messageUser: {
      user_id: '2',
      name: 'Người gửi',
      username: 'sender',
    },
    ...overrides,
  };
}

const replySources = [
  rawMessage('11', {
    or_text: 'https://example.com/news',
  }),
  rawMessage('12', {
    or_text: 'Xem bài viết\nhttps://vnseea.vn/post/42',
  }),
  rawMessage('13', {
    or_text:
      'https://vnseea.vn/map?lat=21.0285&lng=105.8542&title=Hà Nội',
  }),
  rawMessage('14', {
    or_text: '',
    media: 'upload/photos/photo.jpg',
    type: 'left_image',
  }),
  rawMessage('15', {
    or_text: '',
    media: 'upload/files/report.pdf',
    type: 'left_file',
  }),
  rawMessage('16', {
    or_text: '',
    media: 'upload/audio/voice.m4a',
    type_two: 'audio',
  }),
  rawMessage('17', {
    or_text: '',
    call_event: {
      call_id: 'call-17',
      call_type: 'video',
      status: 'ended',
      initiator_id: '2',
      receiver_id: '1',
    },
  }),
];

describe('ApiMessagesRepository message replies', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it.each([
    ['one-to-one', { messages: replySources.map((reply, index) => rawMessage(String(30 + index), { or_text: `Phản hồi ${index}`, reply_id: reply.id, reply })) }, '2'],
    ['group', { data: { messages: replySources.map((reply, index) => rawMessage(String(40 + index), { group_id: '9', or_text: `Phản hồi ${index}`, reply_id: reply.id, reply })) } }, groupChat()],
  ] as const)(
    'maps every canonical reply source for %s chat',
    async (_label, response, chat) => {
      post.mockResolvedValueOnce(response);

      const messages = await createMessagesRepository().getMessages(chat);

      expect(messages.map(message => message.replyTo?.contentKind)).toEqual([
        'link',
        'shared_post',
        'location',
        'image',
        'file',
        'audio',
        'video_call',
      ]);
      expect(messages[0].replyTo).toEqual(
        expect.objectContaining({
          messageId: '11',
          senderId: '2',
          senderName: 'Người gửi',
        }),
      );
      expect(messages[1].replyTo?.sharedPost?.postId).toBe('42');
      expect(messages[2].replyTo?.location).toEqual(
        expect.objectContaining({ latitude: 21.0285, longitude: 105.8542 }),
      );
      expect(messages[3].replyTo?.media).toContain('photo.jpg');
      expect(messages[6].replyTo?.callEvent?.callType).toBe('video');
    },
  );

  it('strips a legacy reply envelope before classifying the current message', async () => {
    const legacyReply = [
      '↪️ *Trả lời tin nhắn:*',
      '👉 *Người gửi*: Bài viết đã chia sẻ https://vnseea.vn/post/42',
      '🆔 ID: *11*',
      '',
      'Tôi đồng ý',
    ].join('\n');
    post.mockResolvedValueOnce({
      messages: [rawMessage('50', { or_text: legacyReply })],
    });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.message).toBe('Tôi đồng ý');
    expect(message.contentKind).toBe('text');
    expect(message.sharedPost).toBeUndefined();
    expect(message.replyTo).toEqual(
      expect.objectContaining({
        messageId: '11',
        senderName: 'Người gửi',
        contentKind: 'shared_post',
      }),
    );
  });

  it('uses the reply body instead of the legacy envelope in the conversation list', async () => {
    const legacyReply = [
      '↪️ *Trả lời tin nhắn:*',
      '👉 *Người gửi*: Liên kết: example.com',
      '🆔 ID: *11*',
      '',
      'Đã xem',
    ].join('\n');
    post.mockResolvedValueOnce({
      data: [
        {
          chat_type: 'user',
          chat_id: '77',
          user_data: { user_id: '2', name: 'Người gửi' },
          last_message: rawMessage('51', { or_text: legacyReply }),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.lastMessage).toBe('Đã xem');
    expect(chat.lastMessageKind).toBe('text');
    expect(chat.lastMessageIsReply).toBe(true);
  });

  it('keeps the latest group reply body when the source is a location', async () => {
    post.mockResolvedValueOnce({
      data: [
        {
          group_id: '9',
          group_name: 'Nhóm kiểm thử',
          last_message: rawMessage('52', {
            group_id: '9',
            or_text: 'Tôi sẽ đến ngay',
            reply_id: '13',
            reply: replySources[2],
          }),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getGroupChats();

    expect(chat.lastMessage).toBe('Tôi sẽ đến ngay');
    expect(chat.lastMessageKind).toBe('text');
    expect(chat.lastMessageIsReply).toBe(true);
  });

  it('resolves missing reply sender metadata from the direct conversation', async () => {
    post.mockResolvedValueOnce({
      messages: [
        rawMessage('53', {
          from_id: '1',
          or_text: 'Trả lời đối phương',
          reply_id: '21',
          reply: rawMessage('21', {
            from_id: '2',
            messageUser: undefined,
          }),
        }),
        rawMessage('54', {
          from_id: '2',
          or_text: 'Trả lời tôi',
          reply_id: '22',
          reply: rawMessage('22', {
            from_id: '1',
            messageUser: undefined,
          }),
        }),
      ],
    });

    const messages = await createMessagesRepository().getMessages(directChat());

    expect(messages.map(message => message.replyTo?.senderName)).toEqual([
      'duong20042',
      'Bạn',
    ]);
  });

  it.each([
    ['one-to-one', '2'],
    ['group', groupChat()],
  ] as const)('sends a real reply_id for %s chat', async (_label, chat) => {
    post.mockResolvedValueOnce({
      api_status: 200,
      message_data: [rawMessage('60', { or_text: 'Nội dung phản hồi' })],
    });
    const repository = createMessagesRepository();

    const response = await (repository.sendMessage as any)(chat, 'Nội dung phản hồi', undefined, {
      replyTo: {
        messageId: '11',
        senderId: '2',
        senderName: 'Người gửi',
        text: 'Tin gốc',
        contentKind: 'text',
      },
    });

    expect(post).toHaveBeenCalledWith(
      chat === '2' ? 'send-message' : 'group_chat',
      expect.objectContaining({
        text: 'Nội dung phản hồi',
        reply_id: '11',
      }),
    );
    expect(post.mock.calls[0][1].text).not.toContain('Trả lời tin nhắn');
    expect(response.sentMessages[0].replyTo).toEqual(
      expect.objectContaining({ messageId: '11', contentKind: 'text' }),
    );
  });
});
