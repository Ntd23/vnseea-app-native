<!-- English description: Order price summary card with shared locale-aware currency formatting. -->
<template>
  <div :class="cardClass">
    <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
      {{ $t("orders.summary.totalPayment") }}
    </p>

    <div class="mt-5 space-y-4">
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs font-black uppercase tracking-widest text-secondary-500">{{ $t("orders.summary.subtotal") }}</span>
        <span class="text-sm font-black text-secondary-900">{{ formatOrderCurrency(subtotal) }}</span>
      </div>
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs font-black uppercase tracking-widest text-secondary-500">{{ $t("orders.summary.shippingFee") }}</span>
        <span class="text-sm font-black text-secondary-900">
          {{ order.shippingFee > 0 ? formatOrderCurrency(order.shippingFee) : $t("orders.summary.free") }}
        </span>
      </div>
    </div>

    <div class="mt-6 border-t border-secondary-100" />

    <div class="mt-6 flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">
          {{ $t("orders.summary.totalOrder") }}
        </p>
        <p class="text-3xl font-black tracking-tight text-secondary-900 leading-none">
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
