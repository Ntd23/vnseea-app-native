<template>
  <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4 sm:p-5' }">
    <div class="space-y-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-[640px]">
          <p class="text-label-secondary text-[var(--text-primary)]">{{ t("pages.directoryPage.filtersEyebrow") }}</p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">{{ t("pages.directoryPage.filtersTitle") }}</h2>
          <p class="mt-1 text-body-secondary">{{ t("pages.directoryPage.filtersDescription") }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1.5 text-[12px] font-semibold">
            {{ t("pages.directoryPage.matchingItems", { count: resultCount }) }}
          </UBadge>
          <UButton
            v-if="canReset"
            color="neutral"
            variant="outline"
            size="sm"
            class="rounded-full"
            @click="emit('reset')"
          >
            <Icon name="i-ph-x-circle-bold" class="mr-1.5 h-4 w-4" />
            {{ t("pages.directoryPage.resetFilters") }}
          </UButton>
        </div>
      </div>

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-ph-faders-horizontal-bold"
        :title="t('pages.directoryPage.filtersStatusTitle')"
        :description="statusLabel"
        class="rounded-[24px]"
      />

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <UInput
          v-model="searchModel"
          :placeholder="t('pages.directoryPage.searchPlaceholder')"
          :aria-label="t('pages.directoryPage.searchLabel')"
          icon="i-ph-magnifying-glass-bold"
          size="xl"
          class="flex-1"
        />

        <UButton
          v-if="searchModel"
          color="neutral"
          variant="outline"
          size="xl"
          class="rounded-full"
          @click="searchModel = ''"
        >
          <Icon name="i-ph-x-bold" class="mr-1.5 h-4 w-4" />
          {{ t("pages.directoryPage.clearSearch") }}
        </UButton>
      </div>

      <div class="flex flex-wrap gap-2" role="tablist" :aria-label="t('pages.directoryPage.categoryTabsAria')">
        <UButton
          v-for="category in categories"
          :key="category.value"
          :color="selectedCategoryModel === category.value ? 'primary' : 'neutral'"
          :variant="selectedCategoryModel === category.value ? 'solid' : 'soft'"
          size="md"
          class="rounded-full px-4 text-[13px] font-bold"
          type="button"
          role="tab"
          :aria-selected="selectedCategoryModel === category.value"
          @click="selectedCategoryModel = category.value"
        >
          <Icon :name="category.icon" class="mr-2 h-4 w-4" />
          <span class="truncate">{{ category.label }}</span>
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type {
  DirectoryCategory,
  DirectoryCategoryKey,
} from "../../domain/types/directory.types"

const { t } = useI18n()

defineProps<{
  categories: ReadonlyArray<DirectoryCategory>
  resultCount: number
  statusLabel: string
  canReset?: boolean
}>()

const searchModel = defineModel<string>("search", {
  default: "",
})

const selectedCategoryModel = defineModel<DirectoryCategoryKey>("selectedCategory", {
  default: "all",
})

const emit = defineEmits<{
  reset: []
}>()
</script>
