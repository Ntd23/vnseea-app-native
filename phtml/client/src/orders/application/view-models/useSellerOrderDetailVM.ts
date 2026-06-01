import type { MaybeRefOrGetter } from "vue"
import { createApiOrderRepository } from "../../infrastructure/repositories/ApiOrderRepository"

export function useSellerOrderDetailVM(
  orderId: MaybeRefOrGetter<string>,
  repository = createApiOrderRepository(),
) {
  const resolvedOrderId = computed(() => toValue(orderId))

  const { data: order, status, error, refresh } = useAsyncData(
    () => `orders:seller:${resolvedOrderId.value}`,
    () => repository.getSellerOrderById(resolvedOrderId.value),
    {
      watch: [resolvedOrderId],
      default: () => null,
    },
  )

  return {
    order,
    status,
    error,
    refresh,
  }
}
