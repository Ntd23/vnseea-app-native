// Orders domain barrel exports
export * from './domain/types/orders.types';
export * from './domain/repositories/OrdersRepository';
export { createOrdersRepository } from './infrastructure/repositories/ApiOrdersRepository';
export { useOrdersViewModel } from './application/view-models/useOrdersViewModel';
export {
  getOrderNotificationBadgeSnapshot,
  replaceOrderNotificationBadges,
  setOrderNotificationBadgeOwner,
  useOrderNotificationBadges,
} from './application/notifications/orderNotificationBadgeStore';
export { markOrderNotificationModeRead } from './application/notifications/orderNotificationBadgeActions';
export type { OrderNotificationMode } from './application/notifications/orderNotificationBadges';
export { default as OrderDetailScreen } from './presentation/screens/OrderDetailScreen';
