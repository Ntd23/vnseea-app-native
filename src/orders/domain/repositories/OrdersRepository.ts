// Description: Repository contract for marketplace purchased and seller orders.

import type { OrdersPage } from '../types/orders.types';

export interface OrdersRepository {
  getPurchasedOrders(input?: {
    limit?: number;
    offset?: number;
  }): Promise<OrdersPage>;
  getSellerOrders(input?: { limit?: number; offset?: number }): Promise<OrdersPage>;
  changeOrderStatus(hashId: string, status: string): Promise<void>;
  requestRefund(hashId: string, message: string): Promise<void>;
}
