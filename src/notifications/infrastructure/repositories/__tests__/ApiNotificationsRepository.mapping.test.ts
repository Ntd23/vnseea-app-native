jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    API_BASE_URL: 'https://api.vnseea.test',
    WEB_BASE_URL: 'https://v2.vnseea.test',
    SERVER_KEY: 'test-server-key',
    REQUEST_TIMEOUT_MS: '10000',
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: { post: jest.fn() },
}));

import {
  createNotificationsRepository,
  mapGroupChatRequestRecord,
  mapNotificationRecord,
  shouldExcludeFromNotificationCenter,
} from '../ApiNotificationsRepository';
import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';

const mockedApiPost = apiBridge.post as jest.Mock;

describe('ApiNotificationsRepository notification mapping', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
  });

  it('keeps social-group notifications visible and maps the group target', () => {
    const item = mapNotificationRecord({
      id: 1,
      type: 'added_you_to_group',
      group_id: 42,
      url: 'index.php?link1=timeline&u=nhom-cong-dong',
      notifier: { user_id: 7, name: 'Quản trị viên' },
    });

    expect(shouldExcludeFromNotificationCenter(item.type)).toBe(false);
    expect(item.groupId).toBe('42');
    expect(item.groupName).toBe('nhom-cong-dong');
  });

  it('does not use the notifier name as the target page name', () => {
    const item = mapNotificationRecord({
      id: 2,
      type: 'page_admin',
      url: 'index.php?link1=timeline&u=trang-vnseea',
      notifier: { user_id: 8, name: 'Nguyễn Văn A' },
    });

    expect(item.pageName).toBe('trang-vnseea');
  });

  it('maps new-review URLs as products instead of posts', () => {
    const item = mapNotificationRecord({
      id: 3,
      type: 'new_review',
      url: 'index.php?link1=post&id=123',
    });

    expect(item.productId).toBe('123');
    expect(item.postId).toBe('');
  });

  it('preserves event and group-chat identifiers from the API', () => {
    const eventItem = mapNotificationRecord({
      id: 4,
      type: 'invited_event',
      event_id: 55,
      event: { id: 55, name: 'Sinh nhật' },
    });
    const chatItem = mapNotificationRecord({
      id: 5,
      type: 'accept_group_chat_request',
      group_chat_id: 77,
    });

    expect(eventItem.event).toMatchObject({ id: '55', name: 'Sinh nhật' });
    expect(chatItem.groupChatId).toBe('77');
    expect(shouldExcludeFromNotificationCenter(chatItem.type)).toBe(false);
  });

  it('maps a message push to its exact conversation target', () => {
    const direct = mapNotificationRecord({
      id: 'message:41',
      type: 'message',
      conversation_type: 'user',
      user_id: 17,
      sender_id: 17,
      sender_name: 'Người gửi',
    });
    const group = mapNotificationRecord({
      id: 'message:42',
      type: 'message',
      conversation_type: 'group',
      group_id: 73,
    });

    expect(direct).toMatchObject({
      messageConversationType: 'user',
      messageConversationId: '17',
      notifierId: '17',
    });
    expect(group).toMatchObject({
      messageConversationType: 'group',
      messageConversationId: '73',
    });
  });

  it('maps pending group-chat requests to a dedicated internal type', () => {
    const item = mapGroupChatRequestRecord({
      group_id: 91,
      group_tab: {
        group_id: 91,
        group_name: 'Nhóm dự án',
        user_id: 10,
      },
    });

    expect(item).toMatchObject({
      id: 'group-chat-request:91',
      type: 'group_chat_invite',
      groupChatId: '91',
    });
  });

  it('maps order identifiers and buyer/seller modes from notification links', () => {
    const sellerItem = mapNotificationRecord({
      id: 6,
      type: 'status_changed',
      url: 'index.php?link1=order&id=order-hash',
    });
    const buyerItem = mapNotificationRecord({
      id: 7,
      type: 'added_tracking_info',
      url: 'index.php?link1=customer_order&id=buyer-order-hash',
    });

    expect(sellerItem).toMatchObject({
      orderId: 'order-hash',
      orderMode: 'seller',
    });
    expect(buyerItem).toMatchObject({
      orderId: 'buyer-order-hash',
      orderMode: 'purchased',
    });
  });

  it('hides profile-visit notifications from the center and unread badge', async () => {
    expect(shouldExcludeFromNotificationCenter('visited_profile')).toBe(true);

    mockedApiPost.mockResolvedValue({
      api_status: 200,
      notifications: [
        {
          id: 8,
          type: 'visited_profile',
          seen: 0,
          notifier: { user_id: 12, name: 'Người xem' },
        },
        {
          id: 9,
          type: 'following',
          seen: 0,
          notifier: { user_id: 13, name: 'Bạn mới' },
        },
      ],
      count_new_messages: 0,
      group_chat_requests: [],
    });

    const result = await createNotificationsRepository().getNotifications();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: '9', type: 'following' });
    expect(result.unreadCount).toBe(1);
  });

  it('requests and merges pending group-chat invitations on the first page', async () => {
    mockedApiPost.mockResolvedValue({
      api_status: 200,
      notifications: [],
      count_new_messages: 0,
      group_chat_requests: [
        {
          group_id: 91,
          time: 123,
          group_tab: {
            group_id: 91,
            group_name: 'Nhóm dự án',
            user_id: 10,
          },
        },
      ],
    });

    const result = await createNotificationsRepository().getNotifications();

    expect(mockedApiPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fetch: 'notifications,count_new_messages,group_chat_requests',
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'group-chat-request:91',
      type: 'group_chat_invite',
      groupChatId: '91',
      createdAt: 123,
    });
    expect(result.unreadCount).toBe(1);
  });

  it('uses count-only fetch keys for the global unread badge', async () => {
    mockedApiPost.mockResolvedValue({
      api_status: 200,
      new_notifications_count: 5,
      count_new_messages: 3,
      new_group_chat_requests_count: 2,
    });

    const result = await createNotificationsRepository().getUnreadCounts();

    expect(mockedApiPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fetch:
          'count_notifications,count_new_messages,count_group_chat_requests',
      }),
    );
    expect(mockedApiPost.mock.calls[0][1].fetch.split(',')).not.toContain(
      'notifications',
    );
    expect(result).toEqual({ notificationCount: 7, messageCount: 3 });
  });

  it('falls back to the full payload while an older backend is rolling out', async () => {
    mockedApiPost
      .mockResolvedValueOnce({ api_status: 200, count_new_messages: 1 })
      .mockResolvedValueOnce({
        api_status: 200,
        notifications: [
          { id: 1, type: 'following', seen: 0 },
          { id: 2, type: 'visited_profile', seen: 0 },
        ],
        count_new_messages: 1,
        group_chat_requests: [],
      });

    const result = await createNotificationsRepository().getUnreadCounts();

    expect(mockedApiPost).toHaveBeenCalledTimes(2);
    expect(mockedApiPost.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        fetch: 'notifications,count_new_messages,group_chat_requests',
      }),
    );
    expect(result).toEqual({ notificationCount: 1, messageCount: 1 });
  });
});
