<template>
  <section class="surface-card group p-6 sm:p-8 space-y-8 ring-1 ring-secondary-100 shadow-xl">
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between border-b border-secondary-50 pb-6">
      <div class="space-y-1">
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
          {{ $t("orders.filter.title") }}
        </p>
        <h2 class="text-2xl font-black tracking-tight text-secondary-900 leading-tight">
          {{ $t("orders.filter.matched", { count: visibleCount }) }}
        </h2>
        <p class="text-sm font-medium leading-relaxed text-secondary-500">
          {{ $t("orders.filter.current", { label: $t(activeFilterLabel) }) }}
        </p>
      </div>

      <div class="w-full lg:max-w-[340px]">
        <UInput
          v-model="searchModel"
          icon="i-ph-magnifying-glass-duotone"
          size="xl"
          :placeholder="$t('orders.filter.placeholder')"
          :ui="{ 
            rounded: 'rounded-2xl', 
            size: { xl: 'h-[56px] px-6 text-base' }, 
            base: 'bg-secondary-50/50 hover:bg-white focus:bg-white ring-1 ring-secondary-200 focus:ring-primary-500 transition-all duration-300' 
          }"
        />
      </div>
    </div>

    <!-- Filter Buttons Grid -->
    <div class="flex flex-wrap gap-2.5">
      <UButton
        v-for="filter in filters"
        :key="filter.key"
        variant="soft"
        size="md"
        class="rounded-xl font-black text-[10px] uppercase tracking-widest px-4 py-2.5 transition-all active:scale-95 border"
        :class="activeFilterModel === filter.key
          ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/30'
          : 'bg-white text-secondary-500 border-secondary-100 hover:border-primary-200 hover:bg-primary-50/10 hover:text-secondary-900'"
        @click="activeFilterModel = filter.key"
      >
        <span>{{ $t(filter.label) }}</span>
        <UBadge
          variant="soft"
          :color="activeFilterModel === filter.key ? 'white' : 'primary'"
          class="rounded-lg font-black text-[9px] min-w-[20px] justify-center transition-colors px-1.5 py-0.5"
          :class="activeFilterModel === filter.key ? 'bg-white/20 text-white' : 'bg-primary-50 text-secondary-900'"
        >
          {{ filter.count }}
        </UBadge>
      </UButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BuyerOrderFilter, OrdersFilterOption } from "../../domain/types/orders.types"

defineProps<{
  filters: OrdersFilterOption[]
  visibleCount: number
  activeFilterLabel: string
}>()

const searchModel = defineModel<string>("search", { required: true })
const activeFilterModel = defineModel<BuyerOrderFilter>("activeFilter", { required: true })
</script>
