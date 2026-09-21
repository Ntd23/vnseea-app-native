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
    mediaBaseUrl: 'https://media.vnseea.vn',
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getSession: () => ({ userId: '1' }) },
  }),
);

const post = apiBridge.post as jest.Mock;

function recalledToken() {
  const payload =
    'eyJkZWxldGVkX2F0IjoxNzIwMDAwMDAwLCJkZWxldGVkX2J5IjoxLCJkZWxldGVkX2J5X25hbWUiOiJOZ3V5ZW4gVmFuIEEifQ==';
  return `__VNSEEA_MESSAGE_RECALLED__:${payload}`;
}

const rawRecalledMessage = {
  id: '10',
  from_id: '1',
  to_id: '2',
  or_text: recalledToken(),
  media: 'upload/photos/old.jpg',
  story_id: '99',
  time: 100,
  seen: 1,
  reaction: { count: 1, is_reacted: 1, type: '1', '1': 1 },
};

const directChat: ChatItem = {
  id: '2',
  chatType: 'user',
  participantId: '2',
  userId: '2',
  username: 'partner',
  name: 'Partner',
  avatar: '',
  lastMessage: '',
  lastMessageTime: 0,
  unreadCount: 0,
  isOnline: true,
  isVerified: false,
};

const groupChat: ChatItem = {
  id: 'group:9',
  chatType: 'group',
  groupId: '9',
  userId: '9',
  username: '',
  name: 'Nhom',
  avatar: '',
  lastMessage: '',
  lastMessageTime: 0,
  unreadCount: 0,
  isOnline: false,
  isVerified: false,
};

describe('ApiMessagesRepository message recall', () => {
  beforeEach(() => post.mockReset());

  it.each([
    ['one-to-one', directChat, { messages: [rawRecalledMessage] }],
    ['group', groupChat, { data: { messages: [rawRecalledMessage] } }],
  ])('maps recalled %s messages as inert tombstones', async (_name, chat, response) => {
    post.mockResolvedValueOnce(response);

    const [message] = await createMessagesRepository().getMessages(chat);

    expect(message).toEqual(
      expect.objectContaining({
        id: '10',
        message: 'Tin nhắn đã thu hồi',
        isRecalled: true,
        recalledAt: 1720000000,
        recalledByUserId: '1',
        recalledByName: 'Nguyen Van A',
        media: undefined,
        storyReply: undefined,
        replyTo: undefined,
      }),
    );
    expect(message.reactions.total).toBe(0);
  });

  it('recalls a message through the canonical endpoint', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      message_id: '10',
      recalled_at: 1720000000,
      recalled_by: '1',
      recalled_by_name: 'Nguyen Van A',
    });

    await expect(
      createMessagesRepository().recallMessage('10'),
    ).resolves.toEqual({
      messageId: '10',
      recalledAt: 1720000000,
      recalledByUserId: '1',
      recalledByName: 'Nguyen Van A',
    });
    expect(post).toHaveBeenCalledWith('recall_message', { message_id: '10' });
  });

  it('uses the recalled tombstone in the conversation preview', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          chat_type: 'user',
          chat_id: '77',
          user_data: {
            user_id: '2',
            username: 'partner',
            name: 'Partner',
          },
          last_message: rawRecalledMessage,
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.lastMessage).toBe('Tin nhắn đã thu hồi');
    expect(chat.lastMessageKind).toBe('text');
  });
});
