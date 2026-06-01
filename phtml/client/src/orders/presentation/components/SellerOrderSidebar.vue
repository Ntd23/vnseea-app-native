<!-- English description: Seller order sidebar with locale-aware payout totals and order actions. -->
<template>
  <div class="space-y-6">
    <section class="surface-card p-6 sm:p-8 space-y-6 ring-1 ring-secondary-100 bg-white shadow-xl">
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
        {{ $t("orders.sidebar.coordination") }}
      </p>

      <div class="space-y-4">
        <OrdersOrderPriceSummary
          :order="order"
          card-class="surface-card p-6 bg-primary-50/30 ring-1 ring-primary-100 shadow-sm"
        />

        <!-- Payment Info Card -->
        <div class="surface-card p-5 bg-white ring-1 ring-secondary-100 space-y-4 group/info">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">
            {{ $t("orders.summary.totalPayment") }}
          </p>
          <div class="flex flex-col gap-2">
            <p class="text-sm font-black text-secondary-900 group-hover/info:text-secondary-900 transition-colors">
              {{ $t(order.paymentMethod) }}
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <UBadge
                variant="soft"
                class="rounded-lg font-black text-[9px] uppercase tracking-widest px-2.5 py-1 ring-1 ring-inset"
                :class="paymentMeta.badgeClass"
              >
                {{ $t(paymentMeta.label) }}
              </UBadge>
              <span class="text-[10px] font-bold text-secondary-400 tracking-wider">
                #{{ order.paymentReference }}
              </span>
            </div>
          </div>
        </div>

        <!-- Payout Info Card -->
        <div class="surface-card p-5 bg-white ring-1 ring-secondary-100 space-y-4 group/payout">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400 pl-1">
            {{ $t("orders.sidebar.payoutShop") }}
          </p>
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-base font-black text-secondary-900 group-hover/payout:text-secondary-900 transition-colors">
                {{ formatOrderCurrency(order.payoutAmount) }}
              </p>
              <UBadge
                variant="soft"
                class="rounded-lg font-black text-[9px] uppercase tracking-widest px-2.5 py-1 ring-1 ring-inset"
                :class="payoutMeta.badgeClass"
              >
                {{ $t(payoutMeta.label) }}
              </UBadge>
            </div>
            <div class="space-y-1">
              <p class="text-[11px] font-semibold text-secondary-500 leading-relaxed italic">
                {{ $t(order.payoutWindow) }}
              </p>
              <p class="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                ID: {{ order.payoutReference }}
              </p>
            </div>
          </div>
        </div>

        <!-- Shipping Info Card -->
        <div class="surface-card p-5 bg-white ring-1 ring-secondary-100 space-y-4 group/ship">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400 pl-1">
            {{ $t("orders.detail.shippingProvider") }}
          </p>
          <div class="space-y-2">
            <p class="text-sm font-black text-secondary-900 group-hover/ship:text-secondary-900 transition-colors">
              {{ order.shippingProvider }}
            </p>
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-50 border border-secondary-100">
              <Icon name="i-ph-package-duotone" class="h-3.5 w-3.5 text-secondary-400" />
              <p class="text-[10px] font-black text-secondary-600 uppercase tracking-widest">
                {{ $t(order.trackingCode) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Payout Status Hint -->
        <div
          class="surface-card p-5 text-xs font-black uppercase tracking-widest leading-relaxed text-center"
          :class="payoutMeta.panelClass"
        >
          {{ $t(payoutMeta.description) }}
        </div>
      </div>
    </section>

    <!-- Task Section -->
    <section class="surface-card p-6 sm:p-8 space-y-6 ring-1 ring-secondary-100 bg-white shadow-xl">
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
        {{ $t("orders.sidebar.tasks") }}
      </p>

      <div class="flex flex-col gap-3">
        <UButton
          size="xl"
          icon="i-ph-lightning-duotone"
          class="rounded-2xl bg-secondary-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest h-12 shadow-lg transition-all active:scale-95"
        >
          {{ $t(primaryActionLabel) }}
        </UButton>

        <UButton
          color="white"
          variant="soft"
          size="xl"
          icon="i-ph-chat-circle-dots-duotone"
          class="rounded-2xl border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-900 font-black text-xs uppercase tracking-widest h-12 shadow-sm transition-all active:scale-95"
        >
          {{ $t("orders.card.contactBuyer", { buyer: order.buyerName }) }}
        </UButton>

        <UButton
          :to="appRoutes.myProducts"
          size="xl"
          icon="i-ph-arrow-left-duotone"
          class="rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black text-xs uppercase tracking-widest h-12 shadow-xl shadow-primary-500/30 transition-all active:scale-95"
        >
          {{ $t("orders.sidebar.backToProducts") }}
        </UButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useOrderPresentation } from "../../application/composables/useOrderPresentation"
import {
  sellerOrderPayoutStatusMeta,
} from "../../domain/types/orders.types"
import type { SellerOrder } from "../../domain/types/orders.types"
import OrdersOrderPriceSummary from "./OrderPriceSummary.vue"

const props = defineProps<{
  order: SellerOrder
}>()

const { paymentMeta } = useOrderPresentation(computed(() => props.order))
const { locale } = useI18n()

const formatOrderCurrency = (value: number) =>
  formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })

const payoutMeta = computed(() => sellerOrderPayoutStatusMeta[props.order.payoutStatus])

const primaryActionLabel = computed(() => {
  if (props.order.status === "pending") return "orders.sidebar.confirmOrder"
  if (props.order.status === "shipping") return "orders.sidebar.markDelivered"
  if (props.order.status === "delivered") return "orders.sidebar.viewPayout"
  return "orders.sidebar.viewCancelled"
})
</script>
