// Notifications Repository Interface
// Port từ: client/src/notifications/domain/repositories/

import type {
  NotificationsListOptions,
  NotificationsListPage,
  NotificationsUnreadCounts,
} from '../types/notifications.types';

export interface NotificationsRepository {
  getNotifications(options?: NotificationsListOptions): Promise<NotificationsListPage>;
  getUnreadCounts(): Promise<NotificationsUnreadCounts>;
  markAsSeen(notificationId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
}
