import {
  getUnreadBadgeCountsSnapshot,
  setUnreadBadgeCounts,
} from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { createNotificationsRepository } from '../../../notifications/infrastructure/repositories/ApiNotificationsRepository';
import {
  beginMarkOrderNotificationModeRead,
  settleOrderNotificationModeRead,
} from './orderNotificationBadgeStore';
import type { OrderNotificationMode } from './orderNotificationBadges';
import type { NotificationsRepository } from '../../../notifications/domain/repositories/NotificationsRepository';

const MARK_SEEN_CONCURRENCY = 4;

export async function markOrderNotificationModeRead(
  mode: OrderNotificationMode,
  repository: Pick<NotificationsRepository, 'markAsSeen'> =
    createNotificationsRepository(),
) {
  const targets = beginMarkOrderNotificationModeRead(mode);
  if (targets.length === 0) {
    return { markedCount: 0, failedCount: 0 };
  }

  const unreadBefore = getUnreadBadgeCountsSnapshot();
  setUnreadBadgeCounts({
    notificationCount: unreadBefore.notificationCount - targets.length,
  });

  const failedIds = new Set<string>();
  let nextTargetIndex = 0;
  const workerCount = Math.min(MARK_SEEN_CONCURRENCY, targets.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextTargetIndex < targets.length) {
        const target = targets[nextTargetIndex];
        nextTargetIndex += 1;
        try {
          await repository.markAsSeen(target.id);
        } catch {
          failedIds.add(target.id);
        }
      }
    }),
  );

  settleOrderNotificationModeRead(targets, failedIds);
  if (failedIds.size > 0) {
    const currentUnread = getUnreadBadgeCountsSnapshot();
    setUnreadBadgeCounts({
      notificationCount: currentUnread.notificationCount + failedIds.size,
    });
  }

  return {
    markedCount: targets.length - failedIds.size,
    failedCount: failedIds.size,
  };
}
