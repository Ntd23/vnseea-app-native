import type { NotificationsItem } from '../../../notifications/domain/types/notifications.types';
import { resolveNotificationDestination } from '../../../notifications/application/navigation/resolveNotificationDestination';

export type OrderNotificationMode = 'purchased' | 'seller';

export type OrderNotificationRecord = {
  id: string;
  mode: OrderNotificationMode;
  createdAt: number;
  seen: boolean;
};

export type OrderNotificationBadgeSnapshot = {
  purchasedCount: number;
  sellerCount: number;
  totalCount: number;
  preferredMode: OrderNotificationMode;
};

function deduplicateRecords(records: OrderNotificationRecord[]) {
  const recordsById = new Map<string, OrderNotificationRecord>();

  records.forEach(record => {
    const existing = recordsById.get(record.id);
    if (!existing || record.createdAt >= existing.createdAt) {
      recordsById.set(record.id, record);
    }
  });

  return Array.from(recordsById.values());
}

export function collectOrderNotificationRecords(
  notifications: NotificationsItem[],
): OrderNotificationRecord[] {
  return deduplicateRecords(
    notifications.flatMap(notification => {
      const destination = resolveNotificationDestination(notification);
      const id = notification.id || notification.notification_id;

      if (destination.kind !== 'orders' || !id) {
        return [];
      }

      return [
        {
          id,
          mode: destination.mode,
          createdAt: Number(notification.createdAt) || 0,
          seen: notification.seen,
        },
      ];
    }),
  );
}

export function buildOrderNotificationBadgeSnapshot(
  records: OrderNotificationRecord[],
): OrderNotificationBadgeSnapshot {
  const uniqueRecords = deduplicateRecords(records);
  const unreadRecords = uniqueRecords.filter(record => !record.seen);
  const purchasedCount = unreadRecords.filter(
    record => record.mode === 'purchased',
  ).length;
  const sellerCount = unreadRecords.filter(
    record => record.mode === 'seller',
  ).length;
  const newestUnread = [...unreadRecords].sort(
    (left, right) => right.createdAt - left.createdAt,
  )[0];
  const newestOrder = [...uniqueRecords].sort(
    (left, right) => right.createdAt - left.createdAt,
  )[0];

  return {
    purchasedCount,
    sellerCount,
    totalCount: purchasedCount + sellerCount,
    preferredMode: newestUnread?.mode ?? newestOrder?.mode ?? 'purchased',
  };
}
