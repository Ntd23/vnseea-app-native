import { buyerOrderFilterLabels } from "../../domain/types/orders.types"
import type {
  BuyerOrderFilter,
  OrdersFilterOption,
  OrdersOverviewCard,
} from "../../domain/types/orders.types"
import { createApiOrderRepository } from "../../infrastructure/repositories/ApiOrderRepository"

export function useOrdersPageVM(
  sectionMode: "purchased" | "orders" = "orders",
  repository = createApiOrderRepository(),
) {
  const search = ref("")
  const activeFilter = ref<BuyerOrderFilter>("all")

  const { data: ordersData, status, error, refresh } = useAsyncData(
    `orders:list:${sectionMode}`,
    () => sectionMode === "purchased" ? repository.getBuyerOrders() : repository.getSellerOrders(),
    {
      default: () => [],
    },
  )

  const orders = computed(() => ordersData.value ?? [])

  const filters = computed<OrdersFilterOption[]>(() => [
    { key: "all", label: buyerOrderFilterLabels.all, count: orders.value.length },
    { key: "pending", label: buyerOrderFilterLabels.pending, count: orders.value.filter(order => order.status === "pending").length },
    { key: "shipping", label: buyerOrderFilterLabels.shipping, count: orders.value.filter(order => order.status === "shipping").length },
    { key: "delivered", label: buyerOrderFilterLabels.delivered, count: orders.value.filter(order => order.status === "delivered").length },
    { key: "cancelled", label: buyerOrderFilterLabels.cancelled, count: orders.value.filter(order => order.status === "cancelled").length },
  ])

  const activeFilterLabel = computed(() => buyerOrderFilterLabels[activeFilter.value])

  const visibleOrders = computed(() => {
    const keyword = search.value.trim().toLowerCase()

    return orders.value.filter((order) => {
      const matchesFilter = activeFilter.value === "all" || order.status === activeFilter.value

      if (!matchesFilter) {
        return false
      }

      if (!keyword) {
        return true
      }

      const sellerOrBuyer = sectionMode === "purchased" ? order.seller : ((order as any).buyerName || (order as any).storeName || "")
      const address = sectionMode === "purchased" ? order.shippingAddress : ((order as any).buyerAddress || "")

      return [
        order.orderNumber,
        sellerOrBuyer,
        address,
        ...order.items.map(item => item.name),
      ].filter(Boolean).some(field => field.toLowerCase().includes(keyword))
    })
  })

  const overviewCards = computed<OrdersOverviewCard[]>(() => [
    {
      label: "orders.status.pending.label",
      value: String(orders.value.filter(order => order.status === "pending").length),
      description: "orders.status.pending.description",
      icon: "i-ph-hourglass-medium-fill",
      tone: "amber",
    },
    {
      label: "orders.status.shipping.label",
      value: String(orders.value.filter(order => order.status === "shipping").length),
      description: "orders.status.shipping.description",
      icon: "i-ph-truck-fill",
      tone: "blue",
    },
    {
      label: "orders.status.delivered.label",
      value: String(orders.value.filter(order => order.status === "delivered").length),
      description: "orders.status.delivered.description",
      icon: "i-ph-check-circle-fill",
      tone: "green",
    },
    {
      label: "orders.status.cancelled.label",
      value: String(orders.value.filter(order => order.status === "cancelled").length),
      description: "orders.status.cancelled.description",
      icon: "i-ph-x-circle-fill",
      tone: "rose",
    },
  ])

  const nextDeliveryOrder = computed(() =>
    orders.value.find(order => order.status === "shipping")
    ?? orders.value.find(order => order.status === "pending")
    ?? null,
  )

  return {
    search,
    activeFilter,
    orders,
    filters,
    activeFilterLabel,
    visibleOrders,
    overviewCards,
    nextDeliveryOrder,
    status,
    error,
    refresh,
  }
}
