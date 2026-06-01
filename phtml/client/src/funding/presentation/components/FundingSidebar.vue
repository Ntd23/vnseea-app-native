<template>
  <aside class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.fundingPage.sidebarOverview") }}
          </p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">
            {{ t("pages.fundingPage.results") }}
          </h2>
        </div>

        <UButton
          v-if="hasActiveFilters"
          type="button"
          color="neutral"
          variant="outline"
          size="sm"
          class="rounded-full"
          @click="emit('reset')"
        >
          {{ t("pages.fundingPage.reset") }}
        </UButton>
      </div>

      <UAlert
        class="mt-4 rounded-[22px]"
        :color="hasActiveFilters ? 'primary' : 'neutral'"
        variant="subtle"
        icon="i-ph-chart-bar-horizontal-fill"
        :title="t('pages.fundingPage.filterStatusTitle')"
        :description="statusLabel"
      />

      <div class="mt-4 grid gap-3">
        <div
          v-for="item in stats"
          :key="item.label"
          class="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] px-4 py-3"
        >
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ item.label }}
          </p>
          <p class="mt-1 text-[1.35rem] font-black text-[var(--text-primary)]">
            {{ item.value }}
          </p>
        </div>
      </div>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ t("pages.fundingPage.sidebarCategories") }}
      </p>
      <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {{ t("pages.fundingPage.categoryHelper") }}
      </p>

      <div class="mt-4 space-y-2" role="list">
        <UButton
          v-for="category in categories"
          :key="category.value"
          :color="selectedCategory === category.value ? 'primary' : 'neutral'"
          :variant="selectedCategory === category.value ? 'solid' : 'soft'"
          size="lg"
          class="w-full justify-between rounded-[20px] px-3 py-3 text-left"
          type="button"
          :aria-pressed="selectedCategory === category.value"
          @click="emit('selectCategory', category.value)"
        >
          <span class="inline-flex min-w-0 items-center gap-3">
            <Icon :name="category.icon" class="h-5 w-5 shrink-0" />
            <span class="min-w-0 truncate text-[13px] font-bold">
              {{ category.label }}
            </span>
          </span>

          <UBadge
            :color="selectedCategory === category.value ? 'neutral' : 'primary'"
            :variant="selectedCategory === category.value ? 'soft' : 'subtle'"
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
          >
            {{ category.count }}
          </UBadge>
        </UButton>
      </div>
    </UCard>
  </aside>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  stats: ReadonlyArray<{ label: string; value: string | number }>
  categories: ReadonlyArray<{ label: string; value: string; icon: string; count: number }>
  selectedCategory: string
  statusLabel: string
  hasActiveFilters?: boolean
}>()

const emit = defineEmits<{
  selectCategory: [value: string]
  reset: []
}>()
</script>
