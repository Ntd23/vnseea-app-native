<!-- English description: Order price summary card with shared locale-aware currency formatting. -->
<template>
  <div class="min-w-0" :class="cardClass">
    <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-900">
      {{ $t("orders.summary.totalPayment") }}
    </p>

    <div class="mt-5 space-y-4">
      <div class="flex min-w-0 items-center justify-between gap-3">
        <span class="min-w-0 text-xs font-bold uppercase tracking-[0.06em] text-secondary-500">{{ $t("orders.summary.subtotal") }}</span>
        <span class="shrink-0 text-sm font-extrabold text-secondary-900">{{ formatOrderCurrency(subtotal) }}</span>
      </div>
      <div class="flex min-w-0 items-center justify-between gap-3">
        <span class="min-w-0 text-xs font-bold uppercase tracking-[0.06em] text-secondary-500">{{ $t("orders.summary.shippingFee") }}</span>
        <span class="shrink-0 text-sm font-extrabold text-secondary-900">
          {{ order.shippingFee > 0 ? formatOrderCurrency(order.shippingFee) : $t("orders.summary.free") }}
        </span>
      </div>
    </div>

    <div class="mt-6 border-t border-secondary-100" />

    <div class="mt-6 flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div class="min-w-0 space-y-1">
        <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-400">
          {{ $t("orders.summary.totalOrder") }}
        </p>
        <p class="break-words text-2xl font-extrabold text-secondary-900 leading-none sm:text-3xl">
          {{ formatOrderCurrency(order.total) }}
        </p>
      </div>

      <UBadge
        v-if="statusMeta"
        variant="soft"
        class="rounded-lg font-black text-[10px] uppercase tracking-widest px-3 py-1.5 ring-1 ring-inset"
        :class="statusMeta.badgeClass || statusMeta.panelClass"
      >
        {{ $t(statusMeta.label) }}
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { useOrderPresentation } from "../../application/composables/useOrderPresentation"
import type { OrderPresentationShape } from "../../domain/types/orders.types"

const props = withDefaults(defineProps<{
  order: OrderPresentationShape
  cardClass?: string
}>(), {
  cardClass: "rounded-[22px] bg-white/85 px-4 py-4 shadow-[0_8px_18px_rgba(15,35,110,0.04)]",
})

const { subtotal, statusMeta } = useOrderPresentation(computed(() => props.order))
const { locale } = useI18n()

const formatOrderCurrency = (value: number) =>
  formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })
</script>
