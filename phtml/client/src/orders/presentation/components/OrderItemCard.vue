<!-- English description: Order item card with shared locale-aware currency formatting. -->
<template>
  <article
    v-if="variant === 'detail'"
    class="surface-card group order-item-article-detail bg-secondary-50/10 p-4 ring-1 ring-secondary-100 transition-all duration-500 hover:bg-white hover:ring-primary-100 sm:p-5"
  >
    <div class="order-item-image-wrapper">
      <div class="order-item-image-bg" :style="{ backgroundImage: item.imageStyle || orderItemFallbackBackground }" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      <div class="absolute inset-0 ring-1 ring-inset ring-black/5" />
      
      <div class="absolute left-2.5 top-2.5 rounded-lg bg-black/60 shadow-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/10 z-10">
        {{ variant === 'detail' ? $t('orders.card.itemLabel') : $t('orders.card.qtyCompact', { count: item.quantity }) }}
      </div>
    </div>

    <div class="min-w-0 flex-1 space-y-4">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 space-y-1">
          <p class="break-words text-base font-extrabold text-secondary-900 transition-colors group-hover:text-secondary-900 sm:text-lg">
            {{ $t(item.name) }}
          </p>
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <div class="h-1.5 w-1.5 rounded-full bg-primary-500" />
            <p class="min-w-0 break-words text-[11px] font-bold uppercase tracking-[0.06em] text-secondary-400">
              {{ detailMetaText }}
            </p>
          </div>
        </div>

        <p class="break-words text-lg font-extrabold text-secondary-900 sm:text-xl">
          {{ formatOrderCurrency(item.price * item.quantity) }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        <UBadge color="white" variant="soft" class="rounded-lg bg-white ring-1 ring-secondary-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-500 shadow-sm">
          <Icon name="i-ph-hash-duotone" class="mr-1.5 h-3.5 w-3.5" />
          {{ $t("orders.card.qty", { count: item.quantity }) }}
        </UBadge>
        <UBadge v-if="paymentMethod" color="white" variant="soft" class="rounded-lg bg-white ring-1 ring-secondary-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-500 shadow-sm">
          <Icon name="i-ph-credit-card-duotone" class="mr-1.5 h-3.5 w-3.5" />
          {{ $t(paymentMethod) }}
        </UBadge>
      </div>
    </div>
  </article>

  <div
    v-else
    class="surface-card group flex gap-4 p-3.5 transition-all duration-300 ring-1 ring-secondary-100 bg-white hover:ring-primary-100 hover:shadow-lg"
  >
    <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-secondary-100 bg-secondary-100 shadow-sm transition-transform group-hover:scale-105">
      <div
        class="absolute inset-0 bg-cover bg-no-repeat bg-center"
        :style="{ backgroundImage: item.imageStyle || orderItemFallbackBackground }"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>

    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-black text-secondary-900 group-hover:text-secondary-900 transition-colors">
            {{ $t(item.name) }}
          </p>
          <p class="text-[10px] font-black uppercase tracking-widest text-secondary-900">
            {{ $t("orders.card.qtyCompact", { count: item.quantity }) }}
          </p>
        </div>

        <p class="text-sm font-black text-secondary-900 tracking-tight">
          {{ formatOrderCurrency(item.price * item.quantity) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { orderItemFallbackBackground } from "../../application/composables/useOrderPresentation"
import type { OrderItem } from "../../domain/types/orders.types"

const props = withDefaults(defineProps<{
  item: OrderItem
  seller?: string
  paymentMethod?: string
  metaText?: string
  variant?: "compact" | "detail"
}>(), {
  seller: "",
  paymentMethod: "",
  metaText: "",
  variant: "compact",
})

const { t, locale } = useI18n()

const formatOrderCurrency = (value: number) =>
  formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })

const detailMetaText = computed(() =>
  props.metaText
    || (props.seller
      ? t("orders.card.orderedFrom", {
          seller: props.seller,
          price: formatOrderCurrency(props.item.price),
        })
      : t("orders.card.unitPrice", {
          price: formatOrderCurrency(props.item.price),
        })),
)
</script>

<style scoped>
.order-item-article-detail {
  display: grid;
  gap: 24px;
}

.order-item-image-wrapper {
  position: relative;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  max-width: 240px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background-color: #f1f5f9;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.order-item-image-wrapper:hover {
  transform: scale(1.02);
}

.order-item-image-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.group:hover .order-item-image-bg {
  transform: scale(1.1);
}

@media (min-width: 768px) {
  .order-item-article-detail {
    grid-template-columns: 140px 1fr;
    align-items: start;
  }

  .order-item-image-wrapper {
    margin-left: 0;
    margin-right: 0;
    width: 140px !important;
    height: 140px !important;
    max-width: none !important;
  }
}
</style>
