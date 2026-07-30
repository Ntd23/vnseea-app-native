import type { NotificationsItem } from '../../../domain/types/notifications.types';
import {
  GROUP_CHAT_INVITE_NOTIFICATION,
  resolveNotificationDestination,
} from '../resolveNotificationDestination';

function notification(
  overrides: Partial<NotificationsItem>,
): NotificationsItem {
  return {
    id: 'notification-1',
    notification_id: 'notification-1',
    recipientId: '1',
    notifierId: '2',
    type: 'unknown',
    text: 'Thông báo',
    url: '',
    seen: false,
    createdAt: 1,
    timeText: '',
    notifier: {
      id: '2',
      name: 'Người gửi',
      avatarUrl: '',
      username: 'sender',
      verified: false,
    },
    ...overrides,
  };
}

describe('resolveNotificationDestination', () => {
  it.each([
    ['following', 'profile'],
    ['friends_request', 'profile'],
    ['added_u_as', 'profile'],
    ['memory', 'memories'],
    ['sent_u_money', 'points'],
    ['subscribed_to_you', 'balance'],
  ])('routes %s to %s', (type, expectedKind) => {
    expect(resolveNotificationDestination(notification({ type })).kind).toBe(
      expectedKind,
    );
  });

  it.each(['viewed_story', 'reaction'])(
    'opens the exact Story for %s when story_id is available',
    type => {
      expect(
        resolveNotificationDestination(
          notification({
            type,
            text: type === 'reaction' ? 'story' : '',
            storyId: '145',
            url: 'https://v2.vnseea.vn/timeline?story=true&story_id=145',
          }),
        ),
      ).toEqual({ kind: 'story', storyId: '145' });
    },
  );

  it('falls back to the Story list when a Story target is unavailable', () => {
    expect(
      resolveNotificationDestination(
        notification({ type: 'viewed_story' }),
      ),
    ).toEqual({ kind: 'stories' });
  });

  it.each(['forum_reply', 'thread_reply'])(
    'opens the exact forum link for %s when the backend provides one',
    type => {
      expect(
        resolveNotificationDestination(
          notification({
            type,
            url: 'https://v2.vnseea.vn/forums/thread/123',
          }),
        ),
      ).toEqual({
        kind: 'external',
        url: 'https://v2.vnseea.vn/forums/thread/123',
      });
    },
  );

  it('falls back to the forum list when a reply has no link', () => {
    expect(
      resolveNotificationDestination(notification({ type: 'forum_reply' })),
    ).toEqual({ kind: 'forum' });
  });

  it('keeps community group notifications separate from chat invitations', () => {
    expect(
      resolveNotificationDestination(
        notification({ type: 'added_you_to_group', groupId: '42' }),
      ),
    ).toEqual({ kind: 'group' });

    expect(
      resolveNotificationDestination(
        notification({
          type: GROUP_CHAT_INVITE_NOTIFICATION,
          groupChatId: '9',
        }),
      ),
    ).toEqual({ kind: 'messages' });
  });

  it.each(['message', 'chat', 'chat_message', 'new_message'])(
    'routes push-only message type %s to messages',
    type => {
      expect(resolveNotificationDestination(notification({ type }))).toEqual({
        kind: 'messages',
      });
    },
  );

  it('uses the exact group link when the API only provides a group slug', () => {
    expect(
      resolveNotificationDestination(
        notification({
          type: 'group_admin',
          groupName: 'nhom-cong-dong',
          url: 'https://v2.vnseea.vn/nhom-cong-dong',
        }),
      ),
    ).toEqual({
      kind: 'external',
      url: 'https://v2.vnseea.vn/nhom-cong-dong',
    });
  });

  it('opens accepted group chat notifications in the matching chat', () => {
    expect(
      resolveNotificationDestination(
        notification({
          type: 'accept_group_chat_request',
          groupChatId: '99',
        }),
      ),
    ).toEqual({ kind: 'groupChat', groupChatId: '99' });
  });

  it('opens the exact event when event data is available', () => {
    const event = { id: '8', name: 'Sự kiện' };
    expect(
      resolveNotificationDestination(
        notification({ type: 'invited_event', eventId: '8', event }),
      ),
    ).toEqual({ kind: 'event', eventId: '8', event });
  });

  it.each(['liked_page', 'invited_page', 'accepted_invite', 'page_admin'])(
    'opens page notification %s in page detail',
    type => {
      expect(
        resolveNotificationDestination(
          notification({ type, pageName: 'vnseea-page' }),
        ),
      ).toEqual({ kind: 'page' });
    },
  );

  it('routes marketplace notifications to their matching targets', () => {
    expect(
      resolveNotificationDestination(notification({ type: 'new_orders' })),
    ).toEqual({ kind: 'orders', mode: 'seller' });

    expect(
      resolveNotificationDestination(
        notification({
          type: 'status_changed',
          orderId: 'order-hash',
          orderMode: 'purchased',
        }),
      ),
    ).toEqual({
      kind: 'orders',
      orderId: 'order-hash',
      mode: 'purchased',
    });

    expect(
      resolveNotificationDestination(
        notification({
          type: 'new_review',
          productId: '12',
          url: 'https://v2.vnseea.vn/product/12',
        }),
      ),
    ).toEqual({
      kind: 'product',
      productId: '12',
      fallbackUrl: 'https://v2.vnseea.vn/product/12',
    });
  });

  it.each([
    ['withdraw_approve', 'withdrawal'],
    ['withdraw_declined', 'withdrawal'],
    ['coinpayments_approved', 'balance'],
    ['coinpayments_canceled', 'balance'],
  ])('routes admin notification subtype %s to %s', (type2, expectedKind) => {
    expect(
      resolveNotificationDestination(
        notification({ type: 'admin_notification', type2 }),
      ).kind,
    ).toBe(expectedKind);
  });

  it.each(['approve_post', 'approve_blog', 'approve_product'])(
    'uses mapped content identifiers for admin subtype %s',
    type2 => {
      const item =
        type2 === 'approve_post'
          ? notification({ type: 'admin_notification', type2, postId: '5' })
          : type2 === 'approve_blog'
          ? notification({ type: 'admin_notification', type2, blogId: '6' })
          : notification({
              type: 'admin_notification',
              type2,
              productId: '7',
            });

      expect(resolveNotificationDestination(item).kind).toBe(
        type2 === 'approve_post'
          ? 'post'
          : type2 === 'approve_blog'
          ? 'blog'
          : 'product',
      );
    },
  );

  it('uses the backend link instead of silently falling back to feed', () => {
    expect(
      resolveNotificationDestination(
        notification({
          type: 'custom_type',
          url: 'https://v2.vnseea.vn/custom',
        }),
      ),
    ).toEqual({ kind: 'external', url: 'https://v2.vnseea.vn/custom' });
  });
});
