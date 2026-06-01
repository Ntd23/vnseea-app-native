import type { OrderRepository, GetBuyerOrdersQuery } from "../../domain/repositories/OrderRepository"
import type { BuyerOrder, BuyerOrderStatus, SellerOrder } from "../../domain/types/orders.types"
import { buyerOrdersMock } from "../mocks/buyerOrders.mock"
import { sellerOrdersMock } from "../mocks/sellerOrders.mock"

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const buyerOrdersState = buyerOrdersMock.map(order => clone(order))
const sellerOrdersState = sellerOrdersMock.map(order => clone(order))

const matchesSearch = (order: BuyerOrder, search?: string) => {
  const keyword = search?.trim().toLowerCase()

  if (!keyword) {
    return true
  }

  return [
    order.orderNumber,
    order.seller,
    order.shippingAddress,
    ...order.items.map(item => item.name),
  ].some(field => field.toLowerCase().includes(keyword))
}

export function createMockOrderRepository(): OrderRepository {
  return {
    async getBuyerOrders(query?: GetBuyerOrdersQuery) {
      return buyerOrdersState
        .filter((order) => {
          const matchesFilter = !query?.status || query.status === "all" || order.status === query.status
          return matchesFilter && matchesSearch(order, query.search)
        })
        .map(order => clone(order))
    },
    async getSellerOrders(query?: GetBuyerOrdersQuery) {
      return sellerOrdersState
        .filter((order) => {
          const matchesFilter = !query?.status || query.status === "all" || order.status === query.status
          return matchesFilter && matchesSearch(order as unknown as BuyerOrder, query.search)
        })
        .map(order => clone(order))
    },
    async getBuyerOrderById(id: string) {
      const order = buyerOrdersState.find(entry => entry.id === id) ?? null
      return order ? clone(order) : null
    },
    async getSellerOrderById(id: string) {
      const order = sellerOrdersState.find(entry => entry.id === id) ?? null
      return order ? clone(order) : null
    },
    async markBuyerOrderReceived(id: string) {
      const order = buyerOrdersState.find(entry => entry.id === id)

      if (order) {
        order.status = "delivered"
      }

      return { success: true }
    },
    async updateSellerOrderStatus(id: string, status: BuyerOrderStatus) {
      const order = sellerOrdersState.find(entry => entry.id === id)

      if (order) {
        order.status = status
      }

      return { success: true }
    },
  }
}
