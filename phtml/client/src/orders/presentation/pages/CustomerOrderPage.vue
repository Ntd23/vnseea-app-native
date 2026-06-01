<!-- English description: Seller-facing order detail page with locale-aware payout and total values. -->
<template>
  <div class="space-y-5 pb-10">
    <CheckoutLayout
      :eyebrow="$t('orders.page.customerEyebrow')"
      :title="pageTitle"
      :description="$t('orders.page.customerDescription')"
    >
      <template #left>
        <div v-if="order" class="space-y-5">
          <section class="rounded-[30px] border border-[#dbe3f2] bg-white p-5 shadow-[0_14px_34px_rgba(15,35,110,0.07)] sm:p-6">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-[12px] font-bold uppercase tracking-[0.24em] text-[#0000ff]/70">
                    {{ order.orderNumber }}
                  </p>
                  <span
                    class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold"
                    :class="statusMeta.badgeClass"
                  >
                    <Icon :name="statusMeta.icon" class="h-3.5 w-3.5" />
                    {{ $t(statusMeta.label) }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold"
                    :class="payoutMeta.badgeClass"
                  >
                    {{ $t(payoutMeta.label) }}
                  </span>
                </div>

                <h2 class="mt-2 text-[1.55rem] font-black tracking-[-0.05em] text-[#243b63]">
                  {{ $t("orders.card.contactBuyer", { buyer: order.buyerName }) }}
                </h2>
                <p class="mt-2 max-w-[720px] text-[14px] leading-7 text-slate-500">
                  {{ $t(statusMeta.description) }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <div class="rounded-full bg-[#f7f9ff] px-3 py-2 text-[12px] font-semibold text-slate-500">
                  {{ order.placedAt }}
                </div>
                <div class="rounded-full bg-[#f7f9ff] px-3 py-2 text-[12px] font-semibold text-slate-500">
                  {{ $t("orders.card.items", { count: totalItems }) }}
                </div>
                <div class="rounded-full bg-[#f7f9ff] px-3 py-2 text-[12px] font-semibold text-slate-500">
                  {{ order.storeName }}
                </div>
              </div>
            </div>

            <div class="mt-5 grid gap-3 md:grid-cols-3">
              <div class="rounded-[20px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {{ $t("orders.detail.buyer") }}
                </p>
                <p class="mt-2 text-[15px] font-black text-[#243b63]">
                  {{ order.buyerName }}
                </p>
                <p class="mt-1 text-[13px] text-slate-500">
                  {{ order.buyerPhone }}
                </p>
              </div>

              <div class="rounded-[20px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {{ $t("orders.detail.shippingProvider") }}
                </p>
                <p class="mt-2 text-[15px] font-black text-[#243b63]">
                  {{ order.shippingProvider }}
                </p>
                <p class="mt-2 text-[12px] text-slate-500">
                  {{ $t("orders.detail.trackingCodeLabel", { code: $t(order.trackingCode) }) }}
                </p>
              </div>

              <div class="rounded-[20px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {{ $t("orders.detail.payout") }}
                </p>
                <p class="mt-2 text-[15px] font-black text-[#243b63]">
                  {{ formatOrderCurrency(order.payoutAmount) }}
                </p>
                <p class="mt-1 text-[13px] text-slate-500">
                  {{ $t(order.payoutWindow) }}
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-[30px] border border-[#dbe3f2] bg-white p-5 shadow-[0_14px_34px_rgba(15,35,110,0.07)] sm:p-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-[12px] font-bold uppercase tracking-[0.26em] text-[#0000ff]/70">
                  {{ $t("orders.card.customerProducts") }}
                </p>
                <h2 class="mt-1 text-[1.3rem] font-black tracking-[-0.04em] text-[#243b63]">
                  {{ $t("orders.card.productsRemaining", { count: totalItems }) }}
                </h2>
              </div>

              <div class="rounded-full bg-[#f7f9ff] px-3 py-2 text-[12px] font-semibold text-slate-500">
                {{ $t("orders.card.total", { total: formatOrderCurrency(order.total) }) }}
              </div>
            </div>

            <div class="mt-5 space-y-3">
              <OrdersOrderItemCard
                v-for="item in order.items"
                :key="item.id"
                 :item="item"
                 :meta-text="$t('orders.card.belongsToStore', { store: order.storeName, price: formatOrderCurrency(item.price) })"
                 :payment-method="order.paymentMethod"
                 variant="detail"
              />
            </div>
          </section>

          <div class="grid gap-5 xl:grid-cols-2">
            <section class="rounded-[28px] border border-[#dbe3f2] bg-white p-5 shadow-[0_14px_34px_rgba(15,35,110,0.07)] sm:p-6">
              <p class="text-[12px] font-bold uppercase tracking-[0.26em] text-[#0000ff]/70">
                {{ $t("orders.detail.buyerAndNotes") }}
              </p>

              <div class="mt-5 grid gap-4">
                <div class="rounded-[22px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {{ $t("orders.card.shippingAddress") }}
                  </p>
                  <p class="mt-2 text-[14px] leading-7 text-slate-600">
                    {{ order.buyerAddress }}
                  </p>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="rounded-[22px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {{ $t("orders.summary.totalPayment") }}
                    </p>
                    <p class="mt-2 text-[14px] font-black text-[#243b63]">
                    {{ $t(order.paymentMethod) }}
                    </p>
                    <p class="mt-2 text-[13px] text-slate-500">
                      {{ order.paymentReference }}
                    </p>
                    <span
                      class="mt-3 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold"
                      :class="paymentMeta.badgeClass"
                    >
                      {{ $t(paymentMeta.label) }}
                    </span>
                  </div>

                  <div class="rounded-[22px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {{ $t("orders.detail.estimatedWindow") }}
                    </p>
                    <p class="mt-2 text-[14px] font-black text-[#243b63]">
                      {{ $t(order.deliveryWindow) }}
                    </p>
                    <p class="mt-2 text-[13px] text-slate-500">
                      {{ $t("orders.detail.buyer") }}: {{ order.buyerPhone }}
                    </p>
                  </div>
                </div>

                <div class="rounded-[22px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {{ $t("orders.detail.buyerNote") }}
                  </p>
                  <p class="mt-2 text-[14px] leading-7 text-slate-600">
                    {{ order.buyerNote || $t("orders.detail.noBuyerNote") }}
                  </p>
                </div>

                <div class="rounded-[22px] border border-[#eef2f8] bg-[#fbfcff] p-4">
                  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {{ $t("orders.detail.internalNote") }}
                  </p>
                  <p class="mt-2 text-[14px] leading-7 text-slate-600">
                    {{ order.sellerNote || $t("orders.detail.noInternalNote") }}
                  </p>
                </div>
              </div>
            </section>

            <OrdersSellerOrderChecklistCard :order="order" />
          </div>

          <OrdersDetailTimelineCard :events="order.timeline" />
        </div>

        <FoundationEmptyState
          v-else
          icon="i-ph-package-fill"
          :title="$t('orders.detail.sellerNotFound')"
          :description="$t('orders.detail.sellerNotFoundDesc')"
        />
      </template>

      <template #right>
        <OrdersSellerOrderSidebar
          v-if="order"
          :order="order"
        />

        <section
          v-else
          class="rounded-[28px] border border-[#dbe3f2] bg-white p-5 shadow-[0_14px_34px_rgba(15,35,110,0.07)]"
        >
          <p class="text-[12px] font-bold uppercase tracking-[0.26em] text-[#0000ff]/70">
            {{ $t("orders.sidebar.tasks") }}
          </p>
          <p class="mt-3 text-[14px] leading-7 text-slate-500">
            {{ $t("orders.sidebar.sellerTasksAction") }}
          </p>
          <NuxtLink
            to="/my-products"
            class="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#243b63] px-5 text-[14px] font-extrabold text-white shadow-[0_10px_22px_rgba(36,59,99,0.18)] transition hover:-translate-y-0.5"
          >
            {{ $t("orders.sidebar.backToProducts") }}
          </NuxtLink>
        </section>
      </template>
    </CheckoutLayout>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import CheckoutLayout from "../../../checkout/presentation/components/CheckoutLayout.vue"
import { useOrderPresentation } from "../../application/composables/useOrderPresentation"
import { useSellerOrderDetailVM } from "../../application/view-models/useSellerOrderDetailVM"
import {
  sellerOrderPayoutStatusMeta,
} from "../../domain/types/orders.types"
import OrdersDetailTimelineCard from "../components/DetailTimelineCard.vue"
import OrdersOrderItemCard from "../components/OrderItemCard.vue"
import OrdersSellerOrderChecklistCard from "../components/SellerOrderChecklistCard.vue"
import OrdersSellerOrderSidebar from "../components/SellerOrderSidebar.vue"

const props = defineProps<{
  orderId: string
}>()

const { order } = useSellerOrderDetailVM(() => props.orderId)
const { paymentMeta, statusMeta, totalItems } = useOrderPresentation(order)

const payoutMeta = computed(() =>
  order.value
    ? sellerOrderPayoutStatusMeta[order.value.payoutStatus]
    : sellerOrderPayoutStatusMeta.queued,
)

const { t, locale } = useI18n()

const formatOrderCurrency = (value: number) =>
  formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })

useSeoMeta({
  title: t("orders.page.title"),
  description: t("orders.page.description"),
})

const pageTitle = computed(() =>
  order.value
    ? t("orders.page.customerTitle", { id: order.value.orderNumber })
    : t("orders.page.customerFallbackTitle"),
)
</script>
