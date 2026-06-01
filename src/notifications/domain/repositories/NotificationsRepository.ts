// Notifications Repository Interface
// Port từ: client/src/notifications/domain/repositories/

import type {
  NotificationsItem,
  NotificationsListOptions,
  NotificationsListPage,
} from '../types/notifications.types';

export interface NotificationsRepository {
  getNotifications(options?: NotificationsListOptions): Promise<NotificationsListPage>;
  markAsSeen(notificationId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
}
