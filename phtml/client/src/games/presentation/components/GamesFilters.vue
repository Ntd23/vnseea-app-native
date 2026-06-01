<template>
  <UCard
    class="relative z-10 overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-[var(--shadow-xl)] backdrop-blur"
    :ui="{ body: 'p-4 sm:p-5' }"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-label-secondary text-[var(--text-primary)]">
          {{ t("pages.gamesPage.filtersEyebrow") }}
        </p>
        <h2 class="mt-1 text-heading text-[var(--text-primary)]">
          {{ t("pages.gamesPage.filtersTitle") }}
        </h2>
        <p class="mt-1 max-w-[680px] text-body-secondary">
          {{ t("pages.gamesPage.filtersDescription") }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UBadge
          color="primary"
          variant="subtle"
          class="justify-center rounded-full px-4 py-2 text-[12px] font-semibold"
        >
          {{ t("pages.gamesPage.resultMeta", { count: resultCount }) }}
        </UBadge>

        <UButton
          v-if="hasActiveFilters"
          type="button"
          color="neutral"
          variant="outline"
          class="justify-center rounded-full"
          @click="resetFilters"
        >
          {{ t("pages.gamesPage.resetFilters") }}
        </UButton>
      </div>
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_320px]">
      <UFormField
        :label="t('pages.gamesPage.searchLabel')"
        size="xl"
        class="space-y-2"
      >
        <UInput
          v-model="localSearch"
          size="xl"
          color="primary"
          class="w-full"
          :leading-icon="'i-ph-magnifying-glass'"
          :placeholder="t('pages.gamesPage.searchPlaceholder')"
          :ui="{ base: 'h-14 rounded-[22px] px-4 text-[15px] font-semibold' }"
        />
      </UFormField>

      <UAlert
        :color="hasActiveFilters ? 'primary' : 'neutral'"
        variant="subtle"
        icon="i-ph-faders-horizontal-fill"
        :title="t('pages.gamesPage.filterStatusTitle')"
        :description="statusLabel"
        class="rounded-[24px]"
      />
    </div>

    <UCard
      class="mt-5 rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]"
      :ui="{ body: 'p-4' }"
    >
      <p class="text-label-secondary text-[var(--text-tertiary)]">
        {{ t("pages.gamesPage.categoryLabel") }}
      </p>
      <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {{ t("pages.gamesPage.categoryHelper") }}
      </p>

      <div class="mt-4 flex flex-wrap gap-2">
        <UButton
          v-for="category in categories"
          :key="category.value"
          type="button"
          :color="selectedCategory === category.value ? 'primary' : 'neutral'"
          :variant="selectedCategory === category.value ? 'solid' : 'outline'"
          class="rounded-full"
          :aria-pressed="selectedCategory === category.value"
          @click="emit('update:selectedCategory', category.value)"
        >
          <Icon :name="category.icon" class="mr-2 h-4 w-4" />
          {{ category.label }}
        </UButton>
      </div>
    </UCard>
  </UCard>
</template>

<script setup lang="ts">
import { watchDebounced } from "@vueuse/core"
import type { GameCategory, GameCategoryKey } from "../../domain/types/games.types"

const props = withDefaults(defineProps<{
  search: string
  selectedCategory: GameCategoryKey
  categories: ReadonlyArray<GameCategory>
  resultCount?: number
  statusLabel?: string
  hasActiveFilters?: boolean
}>(), {
  resultCount: 0,
  statusLabel: "",
  hasActiveFilters: false,
})

const emit = defineEmits<{
  "update:search": [value: string]
  "update:selectedCategory": [value: GameCategoryKey]
  reset: []
}>()

const { t } = useI18n()

const localSearch = ref(props.search)

watch(
  () => props.search,
  (value) => {
    if (value !== localSearch.value) {
      localSearch.value = value
    }
  },
)

watchDebounced(
  localSearch,
  (value) => {
    if (value !== props.search) {
      emit("update:search", value)
    }
  },
  {
    debounce: 240,
    maxWait: 600,
  },
)

function resetFilters() {
  localSearch.value = ""
  emit("reset")
}
</script>
