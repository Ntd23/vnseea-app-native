<!-- English description: Buyer order detail page with locale-aware price formatting. -->
<template>
  <div class="order-detail-page mx-auto w-full max-w-[1280px] overflow-x-hidden px-0 pb-16 pt-4 sm:px-6 sm:pt-6">
    <!-- Header / Navigation section -->
    <div class="order-detail-header mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3 sm:gap-4">
        <NuxtLink
          to="/purchased"
          class="back-btn"
          aria-label="Quay lại"
        >
          <Icon name="i-ph-arrow-left-bold" class="h-5 w-5" />
        </NuxtLink>
        <div class="min-w-0">
          <p class="order-detail-eyebrow">
            {{ $t('orders.page.detailEyebrow') }}
          </p>
          <h1 class="order-detail-title">
            {{ pageTitle }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Main Grid Content -->
    <div class="order-detail-grid grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:gap-8">
      <!-- Left side: Order details -->
      <div class="min-w-0 space-y-4 sm:space-y-6">
        <div v-if="order" class="min-w-0 space-y-4 sm:space-y-6">
          <!-- Overview Card -->
          <section class="order-detail-card surface-card space-y-6 p-4 ring-1 ring-secondary-100 shadow-xl transition-all duration-500 sm:space-y-8 sm:p-6 lg:p-8">
            <div class="flex min-w-0 flex-col gap-5 border-b border-secondary-50 pb-5 sm:gap-6 sm:pb-6 xl:flex-row xl:items-start xl:justify-between">
              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-3">
                  <p class="order-detail-order-number pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                    {{ order.orderNumber }}
                  </p>
                  <UBadge
                    variant="soft"
                    class="rounded-lg font-black text-[10px] uppercase tracking-widest px-3 py-1 ring-1 ring-inset"
                    :class="statusMeta.badgeClass"
                  >
                    <template #leading>
                      <Icon :name="statusMeta.icon.includes('duotone') ? statusMeta.icon : statusMeta.icon.replace('-fill', '-duotone')" class="h-3.5 w-3.5 mr-1" />
                    </template>
                    {{ $t(statusMeta.label) }}
                  </UBadge>
                </div>

                <h2 class="break-words text-xl font-extrabold text-[var(--text-primary)] leading-tight sm:text-2xl">
                  {{ $t("orders.card.orderedFrom", { seller: order.seller, price: formatOrderCurrency(order.total) }).split(' • ')[0] }}
                </h2>
                <p class="text-sm font-medium leading-relaxed text-[var(--text-primary)] max-w-2xl">
                  {{ $t(statusMeta.description) }}
                </p>
              </div>

              <div class="flex min-w-0 flex-wrap gap-2 pt-1 sm:pt-2 xl:pt-1">
                <UBadge color="white" variant="soft" size="lg" class="rounded-xl border border-secondary-100 bg-secondary-50 px-4 py-2 font-black text-[10px] uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
                  {{ order.placedAt }}
                </UBadge>
                <UBadge color="white" variant="soft" size="lg" class="rounded-xl border border-secondary-100 bg-secondary-50 px-4 py-2 font-black text-[10px] uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
                  {{ $t("orders.card.items", { count: totalItems }) }}
                </UBadge>
              </div>
            </div>

            <!-- Recipient & Provider info grid -->
            <div class="grid min-w-0 gap-3 sm:grid-cols-3 sm:gap-4">
              <div class="surface-card min-w-0 space-y-3 bg-secondary-50/50 p-4 ring-1 ring-secondary-100 transition-colors duration-500 group/info hover:bg-white sm:space-y-4 sm:p-5">
                <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                  {{ $t("orders.detail.recipient") }}
                </p>
                <div class="space-y-1">
                  <p class="text-sm font-black text-[var(--text-primary)] group-hover/info:text-secondary-900 transition-colors">
                    {{ order.recipientName }}
                  </p>
                  <p class="text-[11px] font-medium leading-relaxed text-[var(--text-primary)]">
                    {{ order.recipientPhone }}
                  </p>
                </div>
              </div>

              <div class="surface-card min-w-0 space-y-3 bg-secondary-50/50 p-4 ring-1 ring-secondary-100 transition-colors duration-500 group/ship-provider hover:bg-white sm:space-y-4 sm:p-5">
                <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                  {{ $t("orders.detail.shippingProvider") }}
                </p>
                <div class="space-y-1">
                  <p class="text-sm font-black text-[var(--text-primary)] group-hover/ship-provider:text-secondary-900 transition-colors">
                    {{ order.shippingProvider || $t('orders.detail.noShippingProvider', 'Chưa xác định') }}
                  </p>
                  <p class="break-words text-[11px] font-medium uppercase tracking-[0.06em] leading-relaxed text-[var(--text-primary)]">
                    #{{ order.trackingCode || $t('orders.detail.noTrackingCode', 'Chưa có') }}
                  </p>
                </div>
              </div>

              <div class="surface-card min-w-0 space-y-3 bg-secondary-50/50 p-4 ring-1 ring-secondary-100 transition-colors duration-500 group/est hover:bg-white sm:space-y-4 sm:p-5">
                <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                  {{ $t("orders.detail.estimatedProcess") }}
                </p>
                <div class="space-y-1">
                  <p class="text-sm font-black text-[var(--text-primary)] group-hover/est:text-secondary-900 transition-colors">
                    {{ order.deliveryWindow }}
                  </p>
                  <p class="text-[11px] font-medium leading-relaxed text-[var(--text-primary)] italic">
                    {{ $t('orders.payment.' + order.paymentMethod.toLowerCase(), order.paymentMethod) }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Products Card -->
          <section class="order-detail-card surface-card space-y-6 p-4 ring-1 ring-secondary-100 shadow-xl transition-all duration-500 sm:space-y-8 sm:p-6 lg:p-8">
            <div class="flex min-w-0 flex-col gap-4 border-b border-secondary-50 pb-5 sm:flex-row sm:items-start sm:justify-between sm:pb-6">
              <div class="min-w-0 space-y-1">
                <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                  {{ $t("orders.card.productsInOrder") }}
                </p>
                <h3 class="break-words text-xl font-extrabold text-[var(--text-primary)] leading-tight sm:text-2xl">
                  {{ $t("orders.card.productsSummary", { count: totalItems }) }}
                </h3>
              </div>

              <UBadge color="white" variant="soft" size="lg" class="rounded-xl border border-secondary-100 bg-secondary-50 px-4 py-2 font-black text-[10px] uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
                {{ $t("orders.card.total", { total: formatOrderCurrency(order.total) }) }}
              </UBadge>
            </div>

            <div class="space-y-4">
              <OrdersOrderItemCard
                v-for="item in order.items"
                :key="item.id"
                :item="item"
                :seller="order.seller"
                :payment-method="order.paymentMethod"
                variant="detail"
              />
            </div>
          </section>

          <!-- Bottom Columns: Address & Timeline -->
          <div class="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-2">
            <!-- Notes & Delivery Card -->
            <section class="order-detail-card surface-card space-y-6 p-4 ring-1 ring-secondary-100 shadow-xl transition-all duration-500 sm:space-y-8 sm:p-6 lg:p-8">
              <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                {{ $t("orders.detail.deliveryAndNotes") }}
              </p>

              <div class="grid gap-4">
                <div class="surface-card min-w-0 space-y-3 bg-secondary-50/50 p-4 ring-1 ring-secondary-100 transition-colors duration-500 group/address hover:bg-white sm:p-5">
                  <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                    {{ $t("orders.card.shippingAddress") }}
                  </p>
                  <p class="break-words text-sm font-semibold leading-relaxed text-[var(--text-primary)] transition-colors group-hover/address:text-secondary-900">
                    {{ order.shippingAddress }}
                  </p>
                </div>

                <div class="surface-card min-w-0 space-y-3 bg-secondary-50/50 p-4 ring-1 ring-secondary-100 transition-colors duration-500 group/note hover:bg-white sm:p-5">
                  <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
                    {{ $t("orders.detail.orderNote") }}
                  </p>
                  <p class="break-words text-sm font-semibold italic leading-relaxed text-[var(--text-primary)] transition-colors group-hover/note:text-secondary-900">
                    {{ order.note || $t("orders.detail.noNote") }}
                  </p>
                </div>
              </div>
            </section>

            <!-- Timeline Progress Card -->
            <OrdersDetailTimelineCard :events="order.timeline" />
          </div>
        </div>

        <FoundationEmptyState
          v-else
          icon="i-ph-package-fill"
          :title="$t('orders.detail.notFound')"
          :description="$t('orders.detail.notFoundDesc')"
        />
      </div>

      <!-- Right side: Sidebar (totals, receipts, tasks) -->
      <div class="min-w-0 space-y-4 sm:space-y-6 lg:sticky lg:top-6">
        <OrdersDetailSidebar
          v-if="order"
          :order="order"
        />

        <section
          v-else
          class="order-detail-card surface-card space-y-6 bg-white p-4 ring-1 ring-secondary-100 shadow-xl sm:p-6 lg:p-8"
        >
          <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)]">
            {{ $t("orders.sidebar.tasks") }}
          </p>
          <p class="text-sm font-medium leading-relaxed text-[var(--text-primary)]">
            {{ $t("orders.sidebar.tasksAction") }}
          </p>
          <UButton
            to="/orders"
            color="white"
            variant="soft"
            size="xl"
            block
            icon="i-ph-arrow-left-duotone"
            class="rounded-2xl border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-900 font-black text-xs uppercase tracking-widest h-12 shadow-sm transition-all active:scale-95 mt-2"
          >
            {{ $t("orders.sidebar.backToOrders") }}
          </UButton>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import {
  useOrderPresentation,
} from "../../application/composables/useOrderPresentation"
import { useBuyerOrderDetailVM } from "../../application/view-models/useBuyerOrderDetailVM"
import OrdersDetailSidebar from "../components/DetailSidebar.vue"
import OrdersDetailTimelineCard from "../components/DetailTimelineCard.vue"
import OrdersOrderItemCard from "../components/OrderItemCard.vue"

const props = defineProps<{
  orderId: string
}>()

const { order } = useBuyerOrderDetailVM(() => props.orderId)
const { statusMeta, totalItems } = useOrderPresentation(order)

const { t, locale } = useI18n()

const formatOrderCurrency = (value: number) =>
  formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })

const pageTitle = computed(() =>
  order.value
    ? t("orders.page.detailTitle", { id: order.value.orderNumber })
    : t("orders.page.detailFallbackTitle"),
)

useSeoMeta({
  title: pageTitle,
  description: t("orders.page.detailDescription"),
})
</script>

<style scoped>
.order-detail-page {
  box-sizing: border-box;
  max-width: min(100%, 1280px);
  overflow-wrap: anywhere;
}

.order-detail-grid,
.order-detail-card {
  min-width: 0;
}

/* ── Custom Elegant Header ── */
.order-detail-header {
  background: #ffffff;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.03);
  margin-bottom: 32px;
  min-width: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.back-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
  transform: translateX(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.order-detail-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.order-detail-title {
  margin: 4px 0 0;
  font-size: 26px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
  overflow-wrap: anywhere;
}

.order-detail-order-number {
  overflow-wrap: anywhere;
}

/* ── Sticky Sidebar ── */
@media (min-width: 1024px) {
  .lg\:sticky {
    position: sticky;
    top: 24px;
  }
}

@media (max-width: 640px) {
  .order-detail-header {
    padding: 14px;
    border-radius: 16px;
    margin-bottom: 16px;
  }

  .back-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .order-detail-eyebrow {
    font-size: 10px;
    letter-spacing: 0.06em;
  }

  .order-detail-title {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0;
  }
}
</style>
