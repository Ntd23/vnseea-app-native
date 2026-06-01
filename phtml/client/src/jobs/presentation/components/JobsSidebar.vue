<template>
  <aside class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ $t("pages.jobsPage.sidebarStatusEyebrow") }}
          </p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">
            {{ $t("pages.jobsPage.sidebarStatusTitle") }}
          </h2>
        </div>

        <UButton
          v-if="hasActiveFilters"
          type="button"
          color="neutral"
          variant="outline"
          size="sm"
          class="rounded-full"
          @click="$emit('reset')"
        >
          {{ $t("pages.jobsPage.reset") }}
        </UButton>
      </div>

      <UAlert
        class="mt-4 rounded-[24px]"
        :color="hasActiveFilters ? 'primary' : 'neutral'"
        variant="subtle"
        icon="i-ph-faders-horizontal-fill"
        :title="$t('pages.jobsPage.filterStatusTitle')"
        :description="statusLabel"
      />
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ $t("pages.jobsPage.sidebarQuickStats") }}
      </p>

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
        {{ $t("pages.jobsPage.sidebarHiringCategories") }}
      </p>
      <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {{ $t("pages.jobsPage.sidebarCategoryDescription") }}
      </p>

      <div v-if="categories.length > 0" class="mt-4 space-y-2">
        <UButton
          v-for="category in categories"
          :key="category.value"
          type="button"
          color="neutral"
          variant="outline"
          size="lg"
          class="w-full justify-between rounded-[20px] px-4"
          @click="$emit('selectCategory', category.value)"
        >
          <span class="inline-flex min-w-0 items-center gap-2 text-left">
            <Icon :name="category.icon" class="h-4 w-4 shrink-0 text-[var(--text-primary)]" />
            <span class="truncate">{{ category.label }}</span>
          </span>
          <UBadge color="primary" variant="subtle" class="rounded-full px-2.5 py-1 text-[11px] font-bold">
            {{ category.count }}
          </UBadge>
        </UButton>
      </div>

      <FoundationEmptyState
        v-else
        compact
        align="start"
        class="mt-4 border-none shadow-none"
        icon="i-ph-squares-four-fill"
        :title="$t('pages.jobsPage.sidebarNoCategoriesTitle')"
        :description="$t('pages.jobsPage.sidebarNoCategoriesDescription')"
      />
    </UCard>
  </aside>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"

withDefaults(defineProps<{
  stats: ReadonlyArray<{ label: string; value: string | number }>
  categories: ReadonlyArray<{ label: string; value: string; icon: string; count: number }>
  statusLabel: string
  hasActiveFilters?: boolean
}>(), {
  hasActiveFilters: false,
})

defineEmits<{
  selectCategory: [value: string]
  reset: []
}>()
</script>
