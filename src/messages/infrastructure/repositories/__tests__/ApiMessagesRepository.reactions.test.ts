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
  apiConfig: { webBaseUrl: 'https://vnseea.vn' },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getSession: () => ({ userId: '1' }) },
  }),
);

const post = apiBridge.post as jest.Mock;

const rawMessage = {
  id: '10',
  from_id: '2',
  to_id: '1',
  or_text: 'Xin chao',
  time: 100,
  seen: 1,
  reaction: {
    count: 3,
    is_reacted: 1,
    type: '2',
    '1': 2,
    '2': 1,
  },
};

function groupChat(): ChatItem {
  return {
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
}

describe('ApiMessagesRepository message reactions', () => {
  beforeEach(() => post.mockReset());

  it.each([
    ['one-to-one', '2', { messages: [rawMessage] }],
    ['group', groupChat(), { data: { messages: [rawMessage] } }],
  ])('maps the reaction snapshot for %s messages', async (_name, chat, response) => {
    post.mockResolvedValueOnce(response);

    const [message] = await createMessagesRepository().getMessages(
      chat as ChatItem | string,
    );

    expect(message.reactions).toEqual({
      total: 3,
      myReaction: 'love',
      topReactions: ['like', 'love'],
      breakdown: { like: 2, love: 1 },
    });
  });

  it('sets, swaps and removes reactions through the canonical endpoint', async () => {
    post
      .mockResolvedValueOnce({
        api_status: 200,
        reaction: { count: 1, is_reacted: 1, type: '2', '2': 1 },
      })
      .mockResolvedValueOnce({
        api_status: 200,
        reaction: { count: 0, is_reacted: 0 },
      });
    const repository = createMessagesRepository();

    await expect(repository.setMessageReaction('10', 'love')).resolves.toEqual(
      expect.objectContaining({ total: 1, myReaction: 'love' }),
    );
    expect(post).toHaveBeenNthCalledWith(1, 'react_message', {
      id: '10',
      action: 'set',
      reaction: '2',
    });

    await expect(repository.setMessageReaction('10', null)).resolves.toEqual(
      expect.objectContaining({ total: 0, myReaction: null }),
    );
    expect(post).toHaveBeenNthCalledWith(2, 'react_message', {
      id: '10',
      action: 'remove',
    });
  });
});
