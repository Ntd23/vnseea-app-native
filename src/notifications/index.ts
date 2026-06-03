// Description: Exposes the public Notifications context API and route screens.
export * from './domain/types/notifications.types';
export * from './domain/repositories/NotificationsRepository';
export { createNotificationsRepository } from './infrastructure/repositories/ApiNotificationsRepository';
export { useNotificationsViewModel } from './application/view-models/useNotificationsViewModel';
export { useNotificationBadgeViewModel } from './application/view-models/useNotificationBadgeViewModel';
export { default as NotificationsScreen } from './presentation/screens/NotificationsScreen';
