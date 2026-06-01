<!-- English description: Wowonder-aligned marketplace order list for purchased and store orders. -->

<template>
  <div class="market-orders-page mx-auto w-full max-w-[1520px] px-3 pb-12 pt-4 sm:px-4">
    <section class="market-orders-heading">
      <div class="market-orders-heading__inner">
        <span class="market-orders-heading__icon">
          <Icon name="i-ph-storefront-fill" class="h-5 w-5" />
        </span>
        <div>
          <p class="market-orders-heading__eyebrow">
            {{ $t("pages.myProductsPage.eyebrow") }}
          </p>
          <h1 class="market-orders-heading__title">
            {{ pageTitle }}
          </h1>
        </div>
      </div>
    </section>

    <section class="market-orders-nav">
      <nav class="market-orders-tabs" aria-label="Marketplace sections">
        <NuxtLink
          v-for="item in storeTabs"
          :key="item.to"
          :to="item.to"
          class="market-orders-tab"
          :class="{ 'market-orders-tab--active': item.active }"
        >
          <Icon :name="item.icon" class="market-orders-tab__icon" />
          {{ item.label }}
        </NuxtLink>
      </nav>
    </section>

    <section class="market-orders-filter">
      <label class="market-orders-search">
        <Icon name="i-ph-magnifying-glass" class="h-5 w-5 text-[#8b9bb2]" />
        <input
          v-model="search"
          type="search"
          :placeholder="$t('orders.filter.placeholder')"
        >
      </label>

      <div class="market-orders-filter__buttons">
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          class="market-orders-filter__button"
          :class="{ 'market-orders-filter__button--active': activeFilter === filter.key }"
          @click="activeFilter = filter.key"
        >
          {{ $t(filter.label) }}
          <span>{{ filter.count }}</span>
        </button>
      </div>
    </section>

    <section class="market-orders-content">
      <div v-if="status === 'pending'" class="market-orders-list">
        <div
          v-for="index in 4"
          :key="index"
          class="market-order-card"
        >
          <USkeleton class="h-16 w-16 shrink-0 rounded" />
          <div class="min-w-0 flex-1">
            <USkeleton class="h-5 w-2/3 rounded" />
            <USkeleton class="mt-3 h-4 w-1/2 rounded" />
            <USkeleton class="mt-3 h-4 w-1/3 rounded" />
          </div>
        </div>
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-ph-warning-circle-duotone"
        :title="$t('orders.empty.noMatchedTitle')"
        :description="String(error)"
      />

      <div v-else-if="visibleOrders.length" class="market-orders-list">
        <article
          v-for="order in visibleOrders"
          :key="order.id"
          class="market-order-card"
        >
          <NuxtLink :to="props.activeSection === 'purchased' ? appRoutes.orderDetail(order.id) : appRoutes.customerOrder(order.id)" class="market-order-card__image">
            <div
              v-if="order.items[0]"
              class="market-order-card__image-bg"
              :style="{ backgroundImage: order.items[0].imageStyle || orderItemFallbackBackground }"
            />
            <Icon v-else name="i-ph-package-fill" class="h-7 w-7 text-white" />
          </NuxtLink>

          <div class="market-order-card__body">
            <div class="market-order-card__top">
              <div class="min-w-0">
                <p class="market-order-card__number">
                  {{ order.orderNumber }}
                </p>
                <h2 class="market-order-card__title">
                  {{ props.activeSection === 'purchased' ? order.seller : ((order as any).buyerName || (order as any).storeName || "Buyer") }}
                </h2>
              </div>
              <span class="market-order-card__status" :class="buyerOrderStatusMeta[order.status].badgeClass">
                <Icon :name="buyerOrderStatusMeta[order.status].icon" class="h-3.5 w-3.5" />
                {{ $t(buyerOrderStatusMeta[order.status].label) }}
              </span>
            </div>

            <div class="market-order-card__meta">
              <span>{{ order.placedAt }}</span>
              <span>{{ $t("orders.card.items", { count: totalItems(order) }) }}</span>
              <span>{{ $t(order.paymentMethod) }}</span>
            </div>

            <div class="market-order-card__items">
              <span
                v-for="item in order.items.slice(0, 3)"
                :key="item.id"
              >
                {{ $t(item.name) }} x{{ item.quantity }}
              </span>
            </div>
          </div>

          <div class="market-order-card__side">
            <strong>{{ formatOrderCurrency(order.total) }}</strong>
            <NuxtLink :to="props.activeSection === 'purchased' ? appRoutes.orderDetail(order.id) : appRoutes.customerOrder(order.id)">
              {{ $t("orders.card.viewDetail") }}
            </NuxtLink>
          </div>
        </article>
      </div>

      <div v-else class="market-orders-empty">
        <Icon name="i-ph-shopping-cart-simple" class="h-7 w-7" />
        <span>{{ $t("orders.empty.noMatchedTitle") }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { orderItemFallbackBackground } from "../../application/composables/useOrderPresentation"
import { useOrdersPageVM } from "../../application/view-models/useOrdersPageVM"
import { buyerOrderStatusMeta, type BuyerOrder } from "../../domain/types/orders.types"

const props = withDefaults(defineProps<{
  activeSection?: "purchased" | "orders"
}>(), {
  activeSection: "orders",
})

const { t, locale } = useI18n()

useSeoMeta({
  title: t("orders.page.title"),
  description: t("orders.page.description"),
})

const {
  search,
  activeFilter,
  filters,
  visibleOrders,
  status,
  error,
} = useOrdersPageVM(props.activeSection)

const pageTitle = computed(() =>
  props.activeSection === "purchased"
    ? t("pages.myProductsPage.purchased")
    : t("pages.myProductsPage.orders"),
)

const storeTabs = computed(() => [
  {
    label: t("pages.myProductsPage.myProducts"),
    to: appRoutes.myProducts,
    icon: "i-ph-shopping-bag",
    active: false,
  },
  {
    label: t("pages.myProductsPage.purchased"),
    to: appRoutes.purchased,
    icon: "i-ph-receipt",
    active: props.activeSection === "purchased",
  },
  {
    label: t("pages.myProductsPage.orders"),
    to: appRoutes.orders,
    icon: "i-ph-list-checks",
    active: props.activeSection === "orders",
  },
  {
    label: t("pages.myProductsPage.marketplace"),
    to: appRoutes.products,
    icon: "i-ph-planet",
    active: false,
  },
])

const totalItems = (order: BuyerOrder) =>
  order.items.reduce((total, item) => total + item.quantity, 0)

const formatOrderCurrency = (value: number) =>
  formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })
</script>

<style scoped>
.market-orders-page {
  --wowonder-blue: #0000ff;
  --wowonder-card: #ffffff;
  --wowonder-border: #dbe3f2;
  --wowonder-text: #111827;
  --wowonder-muted: #66758b;
}

.market-orders-heading,
.market-orders-nav,
.market-orders-filter,
.market-orders-content {
  border: 1px solid var(--wowonder-border);
  border-radius: 12px;
  background: var(--wowonder-card);
  box-shadow: 0 2px 6px rgba(13, 38, 76, 0.08);
}

.market-orders-heading__inner {
  display: flex;
  min-height: 80px;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
}

.market-orders-heading__icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #ffffff;
  background: var(--wowonder-blue);
}

.market-orders-heading__eyebrow {
  margin: 0;
  color: var(--wowonder-text);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.market-orders-heading__title {
  margin: 7px 0 0;
  color: var(--wowonder-text);
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
}

.market-orders-nav {
  display: flex;
  min-height: 74px;
  align-items: center;
  margin-top: 22px;
  padding: 0 12px;
}

.market-orders-tabs {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
}

.market-orders-tab {
  position: relative;
  display: inline-flex;
  min-height: 74px;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  border-radius: 8px 8px 0 0;
  color: #555555;
  font-size: 18px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.16s ease, background 0.16s ease;
}

.market-orders-tab:hover {
  color: var(--wowonder-blue);
  background: rgba(0, 0, 255, 0.04);
}

.market-orders-tab--active {
  color: #555555;
  font-weight: 800;
}

.market-orders-tab--active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 4px;
  background: var(--wowonder-blue);
  content: "";
}

.market-orders-tab__icon {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
}

.market-orders-filter {
  display: grid;
  grid-template-columns: minmax(260px, 380px) minmax(0, 1fr);
  gap: 14px;
  margin-top: 18px;
  padding: 14px;
}

.market-orders-search {
  display: flex;
  height: 42px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--wowonder-border);
  border-radius: 8px;
  padding: 0 12px;
}

.market-orders-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--wowonder-text);
  background: transparent;
  font-size: 15px;
}

.market-orders-filter__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.market-orders-filter__button {
  display: inline-flex;
  height: 42px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--wowonder-border);
  border-radius: 8px;
  background: #ffffff;
  padding: 0 13px;
  color: #555555;
  font-size: 14px;
  font-weight: 700;
}

.market-orders-filter__button span {
  min-width: 22px;
  border-radius: 999px;
  background: #eef3fb;
  padding: 2px 6px;
  color: #66758b;
  font-size: 12px;
}

.market-orders-filter__button--active {
  border-color: var(--wowonder-blue);
  color: #ffffff;
  background: var(--wowonder-blue);
}

.market-orders-filter__button--active span {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.market-orders-content {
  margin-top: 22px;
  padding: 14px;
}

.market-orders-list {
  display: grid;
  gap: 12px;
}

.market-order-card {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid var(--wowonder-border);
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.market-order-card__image {
  position: relative;
  display: flex;
  width: 76px;
  height: 76px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #e8eef8;
}

.market-order-card__image-bg {
  position: absolute;
  inset: 0;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

.market-order-card__body {
  min-width: 0;
}

.market-order-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.market-order-card__number {
  margin: 0;
  color: #8b9bb2;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.market-order-card__title {
  overflow: hidden;
  margin: 3px 0 0;
  color: #333333;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-order-card__status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border: 1px solid;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 800;
}

.market-order-card__meta,
.market-order-card__items {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
  color: #66758b;
  font-size: 13px;
  font-weight: 600;
}

.market-order-card__meta span,
.market-order-card__items span {
  border-radius: 6px;
  background: #f4f7fb;
  padding: 4px 8px;
}

.market-order-card__side {
  display: flex;
  min-width: 136px;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;
}

.market-order-card__side strong {
  color: #4caf50;
  font-size: 16px;
  font-weight: 800;
}

.market-order-card__side a {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--wowonder-blue);
  padding: 0 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.market-orders-empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--wowonder-muted);
  font-size: 18px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .market-orders-filter {
    grid-template-columns: 1fr;
  }

  .market-orders-filter__buttons {
    justify-content: flex-start;
  }
}

@media (max-width: 700px) {
  .market-order-card {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .market-order-card__image {
    width: 64px;
    height: 64px;
  }

  .market-order-card__side {
    grid-column: 1 / -1;
    min-width: 0;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .market-order-card__top {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
