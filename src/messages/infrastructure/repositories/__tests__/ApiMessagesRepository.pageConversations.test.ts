import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import {
  createCustomerPageChat,
  createPageInboxChat,
} from '../../../application/page-conversations/pageConversationChat';
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

// Page 7 is owned by user 100. User 1 is either a customer or a Page admin.
function customerChat() {
  return createCustomerPageChat({
    pageId: '7',
    ownerId: '100',
    viewerId: '1',
    pageTitle: 'Shop Hoa',
    pageName: 'shophoa',
    avatar: 'https://vnseea.vn/page.jpg',
  });
}

function inboxChat() {
  return createPageInboxChat({
    pageId: '7',
    pageTitle: 'Shop Hoa',
    customer: { id: '300', name: 'Khách', username: 'khach', avatar: '' },
  });
}

function rawMessage(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    from_id: '300',
    to_id: '100',
    page_id: '7',
    or_text: `Tin nhắn ${id}`,
    time: 100 + Number(id),
    seen: 0,
    user_data: { user_id: '300', name: 'Khách' },
    ...overrides,
  };
}

describe('ApiMessagesRepository Page conversations', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('reads the customer thread through page_chat and shows Page replies as the Page', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        rawMessage('2', {
          from_id: '100',
          to_id: '1',
          user_data: { user_id: '100', name: 'Chủ trang' },
        }),
        rawMessage('1', { from_id: '1', to_id: '100' }),
      ],
    });
    const repository = createMessagesRepository();

    const messages = await repository.getMessages(customerChat(), { limit: 20 });

    expect(post).toHaveBeenCalledWith('page_chat', expect.objectContaining({
      type: 'fetch',
      page_id: '7',
      recipient_id: '100',
    }));
    expect(messages[0]).toMatchObject({
      isSentByMe: false,
      senderName: 'Shop Hoa',
      senderAvatar: 'https://vnseea.vn/page.jpg',
    });
    expect(messages[0].pageSentBy).toBeUndefined();
    expect(messages[1].isSentByMe).toBe(true);
  });

  it('reads the Page Inbox thread and puts every Page-side reply on the member side', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        rawMessage('3', {
          from_id: '100',
          to_id: '300',
          is_page_side: 1,
          sent_by: { user_id: '200', name: 'Admin Lan' },
        }),
        rawMessage('2', { is_page_side: 0 }),
      ],
    });
    const repository = createMessagesRepository();

    const messages = await repository.getMessages(inboxChat(), { limit: 20 });

    expect(post).toHaveBeenCalledWith('page_inbox', expect.objectContaining({
      type: 'fetch',
      page_id: '7',
      user_id: '300',
    }));
    expect(messages[0]).toMatchObject({
      isSentByMe: true,
      pageSentBy: { id: '200', name: 'Admin Lan' },
    });
    expect(messages[1].isSentByMe).toBe(false);
  });

  it('sends a customer message to the Page owner through page_chat', async () => {
    post.mockResolvedValueOnce({ api_status: 200, data: [] });
    const repository = createMessagesRepository();

    await repository.sendMessage(customerChat(), 'Xin chào', undefined, {
      replyTo: {
        messageId: '9',
        senderId: '100',
        senderName: 'Shop Hoa',
        text: 'Chào bạn',
      } as never,
    });

    expect(post).toHaveBeenCalledWith('page_chat', expect.objectContaining({
      type: 'send',
      page_id: '7',
      recipient_id: '100',
      text: 'Xin chào',
      reply_id: '9',
    }));
    expect(post.mock.calls[0][1]).not.toHaveProperty('user_id');
  });

  it('sends a Page Inbox reply to the customer through page_inbox', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        rawMessage('5', {
          from_id: '100',
          to_id: '300',
          or_text: 'Cảm ơn bạn',
          is_page_side: 1,
          sent_by: { user_id: '1', name: 'Tôi' },
        }),
      ],
    });
    const repository = createMessagesRepository();

    const result = await repository.sendMessage(inboxChat(), 'Cảm ơn bạn');

    expect(post).toHaveBeenCalledWith('page_inbox', expect.objectContaining({
      type: 'send',
      page_id: '7',
      user_id: '300',
      text: 'Cảm ơn bạn',
    }));
    expect(post.mock.calls[0][1]).not.toHaveProperty('recipient_id');
    expect(result.sentMessages[0]).toMatchObject({
      isSentByMe: true,
      pageSentBy: { id: '1', name: 'Tôi' },
    });
  });

  it('marks the Page Inbox thread read but leaves page_chat to mark itself', async () => {
    post.mockResolvedValue({ api_status: 200 });
    const repository = createMessagesRepository();

    await repository.markAsSeen(customerChat());
    expect(post).not.toHaveBeenCalled();

    await repository.markAsSeen(inboxChat());
    expect(post).toHaveBeenCalledWith('page_inbox', {
      type: 'read',
      page_id: '7',
      user_id: '300',
    });
  });

  it('skips pinned messages on Page threads', async () => {
    const repository = createMessagesRepository();

    await expect(repository.getPinnedMessages(inboxChat())).resolves.toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });

  it('lists Page Inbox conversations with the cursor for older rows', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      role: 'admin',
      page: { page_id: '7', page_name: 'shophoa', page_title: 'Shop Hoa' },
      data: [
        {
          customer: { user_id: '300', name: 'Khách', username: 'khach', avatar: 'a.jpg' },
          last_message_id: '42',
          unread_count: 2,
          last_message: rawMessage('42', {
            from_id: '100',
            to_id: '300',
            or_text: 'Đã giao hàng',
            is_page_side: 1,
            sent_by: { user_id: '200', name: 'Admin Lan' },
          }),
        },
      ],
    });
    const repository = createMessagesRepository();

    const result = await repository.getPageInboxConversations('7', { limit: 1 });

    expect(post).toHaveBeenCalledWith('page_inbox', expect.objectContaining({
      type: 'list',
      page_id: '7',
      limit: 1,
    }));
    expect(result.page).toMatchObject({ pageId: '7', pageTitle: 'Shop Hoa', role: 'admin' });
    expect(result.nextCursor).toBe('42');
    expect(result.conversations[0]).toMatchObject({
      customer: { id: '300', name: 'Khách', username: 'khach', avatar: 'a.jpg' },
      lastMessageId: '42',
      lastMessagePreview: 'Đã giao hàng',
      lastMessageIsPageSide: true,
      lastMessageSentBy: { id: '200', name: 'Admin Lan' },
      unreadCount: 2,
    });
  });

  it('knows the customer of an owner row in the personal chat list', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          chat_type: 'page',
          chat_id: '55',
          page_id: '7',
          user_id: '1',
          page_title: 'Shop Hoa',
          last_message: rawMessage('8', { from_id: '300', to_id: '1' }),
        },
      ],
    });
    const repository = createMessagesRepository();

    const chats = await repository.getChats({
      includeDiscovery: false,
      latestOnly: true,
    });
    const pageChat = chats.find(chat => chat.chatType === 'page');

    expect(pageChat?.page).toEqual({
      pageId: '7',
      ownerId: '1',
      customerId: '300',
      actsAsPage: true,
      pageTitle: 'Shop Hoa',
      pageAvatar: undefined,
    });
  });
});
