<template>
  <div class="space-y-6">
    <section class="surface-card p-6 sm:p-8 space-y-6 ring-1 ring-secondary-100 shadow-xl">
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
        {{ $t("orders.sidebar.overview") }}
      </p>

      <div class="grid gap-4">
        <div
          v-for="card in cards"
          :key="card.label"
          class="group/stat rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg"
          :class="toneClassMap[card.tone]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                {{ $t(card.label) }}
              </p>
              <p class="text-3xl font-black leading-none tracking-tight">
                {{ card.value }}
              </p>
            </div>

            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition-transform group-hover/stat:scale-110 group-hover/stat:rotate-3">
              <Icon :name="card.icon.includes('duotone') ? card.icon : card.icon.replace('-fill', '-duotone')" class="h-6 w-6" />
            </div>
          </div>

          <p class="mt-4 text-xs font-semibold leading-relaxed opacity-70">
            {{ $t(card.description) }}
          </p>
        </div>
      </div>
    </section>

    <section class="surface-card p-6 sm:p-8 space-y-6 ring-1 ring-secondary-100 shadow-xl">
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
        {{ $t("orders.sidebar.trackRecent") }}
      </p>

      <template v-if="nextOrder">
        <div class="surface-card p-5 bg-secondary-50/50 ring-1 ring-secondary-100 space-y-5 group/recent hover:bg-white transition-colors duration-500">
          <div class="flex flex-wrap items-center gap-3 border-b border-secondary-100 pb-4">
            <p class="text-sm font-black text-secondary-900">
              {{ nextOrder.orderNumber }}
            </p>
            <UBadge
              variant="soft"
              class="rounded-lg font-black text-[9px] uppercase tracking-widest px-2.5 py-1 ring-1 ring-inset"
              :class="nextStatusMeta.badgeClass"
            >
              <template #leading>
                <Icon :name="nextStatusMeta.icon.includes('duotone') ? nextStatusMeta.icon : nextStatusMeta.icon.replace('-fill', '-duotone')" class="h-3 w-3 mr-1" />
              </template>
              {{ $t(nextStatusMeta.label) }}
            </UBadge>
          </div>

          <div class="space-y-1">
            <p class="text-sm font-black text-secondary-900 group-hover/recent:text-secondary-900 transition-colors">
              {{ nextOrder.seller }}
            </p>
            <p class="text-xs font-medium text-secondary-500 leading-relaxed italic">
              {{ $t(nextOrder.deliveryWindow) }}
            </p>
          </div>

          <UButton
            :to="appRoutes.orderDetail(nextOrder.id)"
            size="xl"
            block
            variant="solid"
            color="primary"
            class="rounded-2xl font-black text-xs uppercase tracking-widest h-12 shadow-lg shadow-primary-500/20"
          >
            {{ $t("orders.sidebar.viewStatus") }}
          </UButton>
        </div>
      </template>

      <div v-else class="surface-card p-8 border-dashed border-2 border-secondary-200 bg-secondary-50/30 text-center">
        <p class="text-xs font-black uppercase tracking-widest text-secondary-400">
          {{ $t("orders.sidebar.noRecent") }}
        </p>
      </div>
    </section>

    <section class="surface-card p-6 sm:p-8 space-y-6 ring-1 ring-primary-100 bg-gradient-to-br from-primary-50/30 via-white to-white shadow-xl relative overflow-hidden">
      <div class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Icon name="i-ph-shopping-cart-duotone" class="h-32 w-32 -mr-12 -mt-12" />
      </div>

      <p class="relative z-10 text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
        {{ $t("orders.sidebar.currentFilter") }}
      </p>
      
      <div class="relative z-10 space-y-5">
        <div class="surface-card p-5 bg-white ring-1 ring-primary-100 shadow-sm space-y-2">
          <p class="text-sm font-black text-secondary-900">
            {{ $t(activeFilterLabel) }}
          </p>
          <p class="text-[11px] font-medium leading-relaxed text-secondary-500">
            {{ $t("orders.sidebar.filterHint", { count: visibleCount }) }}
          </p>
        </div>

        <div class="space-y-3">
          <div class="flex gap-3 items-start p-3 rounded-xl bg-white/50 border border-primary-50">
            <Icon name="i-ph-info-duotone" class="h-4 w-4 shrink-0 text-secondary-900 mt-0.5" />
            <p class="text-[11px] font-medium leading-relaxed text-secondary-600">
              {{ $t("orders.sidebar.flowHintReal") }}
            </p>
          </div>
          <div class="flex gap-3 items-start p-3 rounded-xl bg-white/50 border border-primary-50">
            <Icon name="i-ph-lightbulb-duotone" class="h-4 w-4 shrink-0 text-secondary-900 mt-0.5" />
            <p class="text-[11px] font-medium leading-relaxed text-secondary-600">
              {{ $t("orders.sidebar.flowHintMarketplace") }}
            </p>
          </div>
        </div>

        <UButton
          :to="appRoutes.products"
          block
          size="xl"
          icon="i-ph-bag-duotone"
          class="rounded-2xl bg-secondary-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest h-12 shadow-xl shadow-secondary-900/10 transition-all active:scale-95 mt-2"
        >
          {{ $t("orders.sidebar.continueShopping") }}
        </UButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { buyerOrderStatusMeta } from "../../domain/types/orders.types"
import type { BuyerOrder, OrdersOverviewCard } from "../../domain/types/orders.types"

const props = defineProps<{
  cards: OrdersOverviewCard[]
  nextOrder: BuyerOrder | null
  activeFilterLabel: string
  visibleCount: number
}>()

const toneClassMap = {
  amber: "border-[#fde7b2] bg-[#fff8ea] text-[#9a5b00]",
  blue: "border-[#cfe0ff] bg-[#eef4ff] text-[#1d4ed8]",
  green: "border-[#c7ebd0] bg-[#effaf3] text-[#1f7a38]",
  rose: "border-[#fecdd3] bg-[#fff1f3] text-[#be123c]",
} as const

const nextStatusMeta = computed(() =>
  props.nextOrder ? buyerOrderStatusMeta[props.nextOrder.status] : null,
)
</script>
