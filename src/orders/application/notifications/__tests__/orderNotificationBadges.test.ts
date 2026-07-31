import type { NotificationsItem } from '../../../../notifications/domain/types/notifications.types';
import {
  buildOrderNotificationBadgeSnapshot,
  collectOrderNotificationRecords,
} from '../orderNotificationBadges';

function notification(
  overrides: Partial<NotificationsItem>,
): NotificationsItem {
  return {
    id: 'notification-1',
    notification_id: 'notification-1',
    recipientId: '1',
    notifierId: '2',
    type: 'unknown',
    text: 'Thong bao',
    url: '',
    seen: false,
    createdAt: 1,
    timeText: '',
    notifier: {
      id: '2',
      name: 'Nguoi gui',
      avatarUrl: '',
      username: 'sender',
      verified: false,
    },
    ...overrides,
  };
}

describe('order notification badges', () => {
  it('separates purchased and seller notifications and ignores unrelated items', () => {
    const records = collectOrderNotificationRecords([
      notification({
        id: 'seller-1',
        notification_id: 'seller-1',
        type: 'new_orders',
        createdAt: 100,
      }),
      notification({
        id: 'purchased-1',
        notification_id: 'purchased-1',
        type: 'status_changed',
        orderMode: 'purchased',
        createdAt: 200,
      }),
      notification({
        id: 'post-1',
        notification_id: 'post-1',
        type: 'liked_post',
        createdAt: 300,
      }),
    ]);

    expect(records).toEqual([
      {
        id: 'seller-1',
        mode: 'seller',
        createdAt: 100,
        seen: false,
      },
      {
        id: 'purchased-1',
        mode: 'purchased',
        createdAt: 200,
        seen: false,
      },
    ]);
  });

  it('uses unread counts and opens the category with the newest unread event', () => {
    const snapshot = buildOrderNotificationBadgeSnapshot([
      {
        id: 'seller-1',
        mode: 'seller',
        createdAt: 100,
        seen: false,
      },
      {
        id: 'purchased-1',
        mode: 'purchased',
        createdAt: 200,
        seen: false,
      },
      {
        id: 'purchased-seen',
        mode: 'purchased',
        createdAt: 300,
        seen: true,
      },
    ]);

    expect(snapshot).toMatchObject({
      purchasedCount: 1,
      sellerCount: 1,
      totalCount: 2,
      preferredMode: 'purchased',
    });
  });

  it('falls back to the newest historical order category when all events are read', () => {
    const snapshot = buildOrderNotificationBadgeSnapshot([
      {
        id: 'purchased-seen',
        mode: 'purchased',
        createdAt: 100,
        seen: true,
      },
      {
        id: 'seller-seen',
        mode: 'seller',
        createdAt: 200,
        seen: true,
      },
    ]);

    expect(snapshot.totalCount).toBe(0);
    expect(snapshot.preferredMode).toBe('seller');
  });

  it('deduplicates notifications before calculating badges', () => {
    const duplicated = {
      id: 'seller-1',
      mode: 'seller' as const,
      createdAt: 100,
      seen: false,
    };

    expect(
      buildOrderNotificationBadgeSnapshot([duplicated, duplicated]),
    ).toMatchObject({
      purchasedCount: 0,
      sellerCount: 1,
      totalCount: 1,
    });
  });
});
