<!-- English description: Buyer order detail sidebar with payment summary and follow-up actions. -->
<template>
  <div class="min-w-0 space-y-4 sm:space-y-6">
    <section class="surface-card min-w-0 space-y-5 bg-white p-4 ring-1 ring-secondary-100 shadow-xl sm:space-y-6 sm:p-6 lg:p-8">
      <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-900">
        {{ $t("orders.sidebar.overview") }}
      </p>

      <div class="space-y-4">
        <OrdersOrderPriceSummary
          :order="order"
          card-class="surface-card min-w-0 p-4 sm:p-6 bg-primary-50/30 ring-1 ring-primary-100 shadow-sm"
        />

        <div class="surface-card min-w-0 space-y-3 bg-white p-4 ring-1 ring-secondary-100 group/info sm:space-y-4 sm:p-5">
          <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-400">
            {{ $t("orders.summary.totalPayment") }}
          </p>
          <div class="flex flex-col gap-2">
            <p class="text-sm font-black text-secondary-900 group-hover/info:text-secondary-900 transition-colors">
              {{ $t('orders.payment.' + order.paymentMethod.toLowerCase(), order.paymentMethod) }}
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <UBadge
                variant="soft"
                class="rounded-lg font-black text-[9px] uppercase tracking-widest px-2.5 py-1 ring-1 ring-inset"
                :class="paymentMeta.badgeClass"
              >
                {{ $t(paymentMeta.label) }}
              </UBadge>
              <span class="break-all text-[10px] font-bold tracking-[0.06em] text-secondary-400">
                #{{ order.paymentReference }}
              </span>
            </div>
          </div>
        </div>

        <div class="surface-card min-w-0 space-y-3 bg-white p-4 ring-1 ring-secondary-100 group/ship sm:space-y-4 sm:p-5">
          <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-400">
            {{ $t("orders.detail.shippingProvider") }}
          </p>
          <div class="space-y-2">
            <p class="text-sm font-black text-secondary-900 group-hover/ship:text-secondary-900 transition-colors">
              {{ order.shippingProvider || $t('orders.detail.noShippingProvider', 'Chưa xác định') }}
            </p>
            <div class="flex min-w-0 items-center gap-2 rounded-lg border border-secondary-100 bg-secondary-50 px-3 py-2">
              <Icon name="i-ph-hash-duotone" class="h-3.5 w-3.5 text-secondary-400" />
              <p class="min-w-0 break-all text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-600">
                {{ order.trackingCode || $t('orders.detail.noTrackingCode', 'Chưa có') }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="surface-card p-5 text-xs font-black uppercase tracking-widest leading-relaxed text-center"
          :class="statusMeta.panelClass"
        >
          {{ $t(statusMeta.description) }}
        </div>
      </div>
    </section>

    <section class="surface-card min-w-0 space-y-5 bg-white p-4 ring-1 ring-secondary-100 shadow-xl sm:space-y-6 sm:p-6 lg:p-8">
      <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-900">
        {{ $t("orders.sidebar.tasks") }}
      </p>

      <div class="flex flex-col gap-3">
        <UButton
          color="white"
          variant="soft"
          size="xl"
          icon="i-ph-chat-circle-dots-duotone"
          class="rounded-2xl border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-900 font-black text-xs uppercase tracking-widest h-12 shadow-sm transition-all active:scale-95"
        >
          {{ $t("orders.card.contactShop") }}
        </UButton>

        <UButton
          to="/products"
          size="xl"
          icon="i-ph-shopping-cart-duotone"
          class="rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black text-xs uppercase tracking-widest h-12 shadow-xl shadow-primary-500/30 transition-all active:scale-95"
        >
          {{ $t("orders.sidebar.continueShopping") }}
        </UButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  useOrderPresentation,
} from "../../application/composables/useOrderPresentation"
import type { BuyerOrder } from "../../domain/types/orders.types"
import OrdersOrderPriceSummary from "./OrderPriceSummary.vue"

const props = defineProps<{
  order: BuyerOrder
}>()

const { paymentMeta, statusMeta } = useOrderPresentation(computed(() => props.order))
</script>
