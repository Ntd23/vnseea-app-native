<template>
  <aside class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-label-secondary text-[var(--text-tertiary)]">{{ t("pages.directoryPage.sidebarCategoriesEyebrow") }}</p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">{{ t("pages.directoryPage.sidebarCategoriesTitle") }}</h2>
        </div>

        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="outline"
          size="sm"
          class="rounded-full"
          @click="emit('reset')"
        >
          {{ t("pages.directoryPage.resetFilters") }}
        </UButton>
      </div>

      <UAlert
        class="mt-4 rounded-[24px]"
        color="neutral"
        variant="subtle"
        icon="i-ph-chart-bar-bold"
        :title="t('pages.directoryPage.filtersStatusTitle')"
        :description="statusLabel"
      />

      <div class="mt-4 space-y-2">
        <UButton
          v-for="category in categories"
          :key="category.value"
          :color="selectedCategory === category.value ? 'primary' : 'neutral'"
          :variant="selectedCategory === category.value ? 'solid' : 'soft'"
          size="lg"
          class="w-full justify-between rounded-[20px] px-3 py-3 text-left"
          type="button"
          @click="emit('selectCategory', category.value)"
        >
          <span class="flex min-w-0 items-center gap-3">
            <Icon :name="category.icon" class="h-5 w-5 shrink-0" />
            <span class="min-w-0">
              <span class="block truncate text-[13px] font-extrabold">{{ category.label }}</span>
              <span class="block truncate text-[11px] font-semibold opacity-70">{{ category.description }}</span>
            </span>
          </span>
          <UBadge
            :color="selectedCategory === category.value ? 'neutral' : 'primary'"
            :variant="selectedCategory === category.value ? 'soft' : 'subtle'"
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
          >
            {{ counts[category.value] ?? 0 }}
          </UBadge>
        </UButton>
      </div>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <p class="text-label-secondary text-[var(--text-tertiary)]">{{ t("pages.directoryPage.sidebarFeaturedEyebrow") }}</p>
      <h2 class="mt-1 text-heading text-[var(--text-primary)]">{{ t("pages.directoryPage.sidebarFeaturedTitle") }}</h2>

      <div v-if="featured.length > 0" class="mt-4 space-y-2">
        <NuxtLink
          v-for="item in featured"
          :key="item.id"
          :to="item.href"
          class="block rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--color-primary-50)]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-[13px] font-extrabold text-[var(--text-primary)]">{{ item.title }}</p>
              <p class="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[var(--text-secondary)]">{{ item.description }}</p>
            </div>

            <UBadge color="primary" variant="subtle" class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold">
              {{ item.categoryLabel }}
            </UBadge>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold text-[var(--text-tertiary)]">
            <span>{{ item.count }}</span>
            <span class="truncate">{{ item.meta }}</span>
          </div>
        </NuxtLink>
      </div>

      <UAlert
        v-else
        class="mt-4 rounded-[24px]"
        color="neutral"
        variant="subtle"
        icon="i-ph-star-four-bold"
        :title="t('pages.directoryPage.sidebarFeaturedEmptyTitle')"
        :description="t('pages.directoryPage.sidebarFeaturedEmptyDescription')"
      />
    </UCard>
  </aside>
</template>

<script setup lang="ts">
import type {
  DirectoryCategory,
  DirectoryCategoryKey,
  DirectoryItem,
} from "../../domain/types/directory.types"

const { t } = useI18n()

defineProps<{
  categories: ReadonlyArray<DirectoryCategory>
  selectedCategory: DirectoryCategoryKey
  counts: Record<string, number>
  featured: ReadonlyArray<DirectoryItem>
  statusLabel: string
  hasActiveFilters?: boolean
}>()

const emit = defineEmits<{
  selectCategory: [value: DirectoryCategoryKey]
  reset: []
}>()
</script>
