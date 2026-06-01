// English description: Order repository implementation that calls Nuxt API bridges without mock fallback.

import type { OrderRepository, GetBuyerOrdersQuery } from "../../domain/repositories/OrderRepository"
import type { BuyerOrder, BuyerOrderStatus, SellerOrder } from "../../domain/types/orders.types"
import { apiRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"

export function createApiOrderRepository(): OrderRepository {
  const client = useNuxtApiClient()

  return {
    async getBuyerOrders(query?: GetBuyerOrdersQuery) {
      return await client.get<BuyerOrder[]>(apiRoutes.orders.list, query)
    },
    async getSellerOrders(query?: GetBuyerOrdersQuery) {
      return await client.get<SellerOrder[]>(apiRoutes.customerOrders.list, query)
    },
    async getBuyerOrderById(id: string) {
      return await client.get<BuyerOrder | null>(apiRoutes.orders.detail(id))
    },
    async getSellerOrderById(id: string) {
      return await client.get<SellerOrder | null>(apiRoutes.customerOrders.detail(id))
    },
    async markBuyerOrderReceived(id: string) {
      return await client.post<{ success: boolean }>(apiRoutes.orders.received(id))
    },
    async updateSellerOrderStatus(id: string, status: BuyerOrderStatus) {
      return await client.post<{ success: boolean }, { status: BuyerOrderStatus }>(
        apiRoutes.customerOrders.status(id),
        { status },
      )
    },
  }
}
