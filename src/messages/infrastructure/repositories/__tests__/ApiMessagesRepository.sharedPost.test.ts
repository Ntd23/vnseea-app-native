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
    webBaseUrl: 'https://demo.vnseea.vn',
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

const rawSharedMessage = {
  id: '11',
  from_id: '2',
  to_id: '1',
  or_text: 'Hay xem bai nay\n\nhttps://demo.vnseea.vn/post/42',
  time: 100,
  seen: 1,
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

describe('ApiMessagesRepository shared post mapping', () => {
  beforeEach(() => post.mockReset());

  it('maps a shared post reference in a one-to-one message', async () => {
    post.mockResolvedValueOnce({ messages: [rawSharedMessage] });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.sharedPost).toEqual({
      postId: '42',
      url: 'https://demo.vnseea.vn/post/42',
      note: 'Hay xem bai nay',
    });
  });

  it('maps the same shared post reference in a group message', async () => {
    post.mockResolvedValueOnce({
      data: { messages: [rawSharedMessage] },
    });

    const [message] = await createMessagesRepository().getMessages(groupChat());

    expect(message.sharedPost?.postId).toBe('42');
    expect(post).toHaveBeenCalledWith(
      'group_chat',
      expect.objectContaining({ type: 'fetch_messages', id: '9' }),
    );
  });
});
