// English description: Order repository contract for buyer and seller order screens.

import type { BuyerOrder, BuyerOrderFilter, BuyerOrderStatus, SellerOrder } from "../types/orders.types"

export interface GetBuyerOrdersQuery {
  status?: BuyerOrderFilter
  search?: string
}

export interface OrderRepository {
  getBuyerOrders(query?: GetBuyerOrdersQuery): Promise<BuyerOrder[]>
  getSellerOrders(query?: GetBuyerOrdersQuery): Promise<SellerOrder[]>
  getBuyerOrderById(id: string): Promise<BuyerOrder | null>
  getSellerOrderById(id: string): Promise<SellerOrder | null>
  markBuyerOrderReceived(id: string): Promise<{ success: boolean }>
  updateSellerOrderStatus(id: string, status: BuyerOrderStatus): Promise<{ success: boolean }>
}
