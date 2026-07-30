import type { NotificationsItem } from '../../../../notifications/domain/types/notifications.types';

jest.mock(
  '../../../../notifications/infrastructure/repositories/ApiNotificationsRepository',
  () => ({
    createNotificationsRepository: jest.fn(() => ({
      markAsSeen: jest.fn(),
    })),
  }),
);

import {
  getUnreadBadgeCountsSnapshot,
  setUnreadBadgeCounts,
} from '../../../../shared-kernel/application/stores/unreadBadgeStore';
import { markOrderNotificationModeRead } from '../orderNotificationBadgeActions';
import {
  getOrderNotificationBadgeSnapshot,
  replaceOrderNotificationBadges,
  setOrderNotificationBadgeOwner,
} from '../orderNotificationBadgeStore';

function notification(
  id: string,
  type: string,
  createdAt: number,
): NotificationsItem {
  return {
    id,
    notification_id: id,
    recipientId: '1',
    notifierId: '2',
    type,
    text: 'Thong bao',
    url: '',
    seen: false,
    createdAt,
    timeText: '',
    notifier: {
      id: '2',
      name: 'Nguoi gui',
      avatarUrl: '',
      username: 'sender',
      verified: false,
    },
  };
}

describe('markOrderNotificationModeRead', () => {
  beforeEach(() => {
    setOrderNotificationBadgeOwner(undefined);
    setOrderNotificationBadgeOwner('1');
    setUnreadBadgeCounts({ notificationCount: 2, messageCount: 0 });
    replaceOrderNotificationBadges(
      [
        notification('seller-1', 'new_orders', 100),
        notification('purchased-1', 'status_changed', 200),
      ],
      '1',
    );
  });

  it('clears only the opened category and reduces the aggregate badge', async () => {
    const repository = {
      markAsSeen: jest.fn().mockResolvedValue(undefined),
    };

    await markOrderNotificationModeRead('purchased', repository);

    expect(repository.markAsSeen).toHaveBeenCalledWith('purchased-1');
    expect(getOrderNotificationBadgeSnapshot()).toMatchObject({
      purchasedCount: 0,
      sellerCount: 1,
      totalCount: 1,
    });
    expect(getUnreadBadgeCountsSnapshot().notificationCount).toBe(1);
  });

  it('restores the category badge when marking the backend notification fails', async () => {
    const repository = {
      markAsSeen: jest.fn().mockRejectedValue(new Error('network')),
    };

    const result = await markOrderNotificationModeRead(
      'purchased',
      repository,
    );

    expect(result).toEqual({ markedCount: 0, failedCount: 1 });
    expect(getOrderNotificationBadgeSnapshot()).toMatchObject({
      purchasedCount: 1,
      sellerCount: 1,
      totalCount: 2,
    });
    expect(getUnreadBadgeCountsSnapshot().notificationCount).toBe(2);
  });
});
