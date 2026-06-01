import { computed, toValue } from "vue"
import {
  buyerOrderPaymentStatusMeta,
  buyerOrderStatusMeta,
} from "../../domain/types/orders.types"
import type {
  BuyerOrderStatus,
  OrderPresentationShape,
} from "../../domain/types/orders.types"
import type { MaybeRefOrGetter } from "vue"

export const orderItemFallbackBackground = [
  "radial-gradient(circle at 78% 12%, rgba(255,214,182,0.5), transparent 18%)",
  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.26), transparent 22%)",
  "linear-gradient(150deg, #243b63 0%, #f1959b 42%, #f8c184 100%)",
].join(", ")

export function getOrderSubtotal(order?: OrderPresentationShape | null) {
  return order
    ? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0
}

export function getOrderTotalItems(order?: OrderPresentationShape | null) {
  return order
    ? order.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0
}

export function getActiveOrderProgressStep(status?: BuyerOrderStatus | null) {
  if (!status || status === "cancelled") {
    return 0
  }

  return buyerOrderStatusMeta[status].progress
}

export function getRepeatOrderActionLabel(status?: BuyerOrderStatus | null) {
  if (status === "delivered") return "orders.card.buyAgain"
  if (status === "cancelled") return "orders.card.chooseOther"
  return "orders.card.viewMore"
}

export function useOrderPresentation(
  order: MaybeRefOrGetter<OrderPresentationShape | null | undefined>,
) {
  const currentOrder = computed(() => toValue(order))

  const subtotal = computed(() => getOrderSubtotal(currentOrder.value))
  const totalItems = computed(() => getOrderTotalItems(currentOrder.value))
  const statusMeta = computed(() =>
    currentOrder.value ? buyerOrderStatusMeta[currentOrder.value.status] : null,
  )
  const paymentMeta = computed(() =>
    currentOrder.value
      ? buyerOrderPaymentStatusMeta[currentOrder.value.paymentStatus]
      : null,
  )
  const activeProgressStep = computed(() =>
    getActiveOrderProgressStep(currentOrder.value?.status),
  )

  return {
    subtotal,
    totalItems,
    statusMeta,
    paymentMeta,
    activeProgressStep,
  }
}
