<!-- English description: Renders a pages-directory-style jobs filter bar with backend-backed type, category, distance, and search controls. -->
<template>
  <section class="jobs-tabs-bar">
    <div class="jobs-tabs-bar__search">
      <Icon name="i-ph-magnifying-glass" class="jobs-tabs-bar__search-icon" />
      <input
        v-model="localSearch"
        type="text"
        :placeholder="$t('pages.jobsPage.searchPlaceholder')"
        class="jobs-tabs-bar__search-input"
      >
      <button
        v-if="localSearch"
        type="button"
        class="jobs-tabs-bar__search-clear"
        @click="localSearch = ''"
      >
        <Icon name="i-ph-x" class="h-4 w-4" />
      </button>
    </div>

    <div class="jobs-tabs-bar__filters">
      <USelect
        v-model="typeModel"
        :items="typeOptions"
        value-key="value"
        label-key="label"
        size="lg"
        class="jobs-tabs-bar__select"
        :ui="{ base: 'h-12 rounded-[10px] bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] font-bold' }"
      />

      <USelect
        v-model="categoryModel"
        :items="categoryOptions"
        value-key="value"
        label-key="label"
        size="lg"
        class="jobs-tabs-bar__select"
        :ui="{ base: 'h-12 rounded-[10px] bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] font-bold' }"
      />

      <USelect
        v-model="distanceModel"
        :items="distanceSelectOptions"
        value-key="value"
        label-key="label"
        size="lg"
        class="jobs-tabs-bar__select"
        :disabled="!distanceEnabled"
        :ui="{ base: 'h-12 rounded-[10px] bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] font-bold' }"
      />

      <button
        type="button"
        class="jobs-tabs-bar__create"
        :disabled="!canCreate"
        @click="emit('openCreate')"
      >
        <Icon name="i-ph-plus-bold" class="h-4 w-4" />
        <span>{{ $t("pages.jobsPage.postJob") }}</span>
      </button>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="jobs-tabs-bar__reset"
        @click="emit('reset')"
      >
        {{ $t("pages.jobsPage.reset") }}
      </button>
    </div>

    <div v-if="statusLabel" class="jobs-tabs-bar__status">
      {{ statusLabel }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { watchDebounced } from "@vueuse/core"
import type { JobsSelectOption } from "../../domain/types/jobs.types"

const ALL_CATEGORY_VALUE = "__all_categories__"
const ALL_TYPE_VALUE = "__all_types__"
const ALL_DISTANCE_VALUE = "__all_distances__"

const props = defineProps<{
  search: string
  selectedType: string
  selectedCategory: string
  selectedDistance: string
  types: JobsSelectOption[]
  categories: JobsSelectOption[]
  distanceOptions: JobsSelectOption[]
  distanceEnabled: boolean
  canCreate: boolean
  createDisabledReason: string
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{
  "update:search": [value: string]
  "update:selectedType": [value: string]
  "update:selectedCategory": [value: string]
  "update:selectedDistance": [value: string]
  openCreate: []
  reset: []
}>()

const { t } = useI18n()
const localSearch = ref(props.search)

const typeOptions = computed(() => Array.isArray(props.types) ? props.types : [])
const categoryOptions = computed(() => Array.isArray(props.categories) ? props.categories : [])
const distanceSelectOptions = computed(() => Array.isArray(props.distanceOptions) ? props.distanceOptions : [])

const typeModel = computed({
  get: () => props.selectedType || ALL_TYPE_VALUE,
  set: value => emit("update:selectedType", String(value) === ALL_TYPE_VALUE ? "" : String(value)),
})

const categoryModel = computed({
  get: () => props.selectedCategory || ALL_CATEGORY_VALUE,
  set: value => emit("update:selectedCategory", String(value) === ALL_CATEGORY_VALUE ? "" : String(value)),
})

const distanceModel = computed({
  get: () => props.selectedDistance || ALL_DISTANCE_VALUE,
  set: value => emit("update:selectedDistance", String(value) === ALL_DISTANCE_VALUE ? "" : String(value)),
})

const statusLabel = computed(() => {
  if (!props.distanceEnabled) {
    return t("pages.jobsPage.distanceDisabled")
  }

  if (!props.canCreate || props.createDisabledReason) {
    return props.createDisabledReason || t("pages.jobsPage.noOwnedPagesDescription")
  }

  return ""
})

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
    emit("update:search", value)
  },
  {
    debounce: 240,
    maxWait: 700,
  },
)
</script>

<style scoped>
.jobs-tabs-bar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}

.jobs-tabs-bar__create {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: var(--bg-brand);
  padding: 0 18px;
  color: var(--text-inverse);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--shadow-brand);
  transition: transform var(--duration-fast) var(--ease-default), background-color var(--duration-fast) var(--ease-default);
}

.jobs-tabs-bar__create:hover:not(:disabled) {
  transform: translateY(-1px);
  background: var(--bg-brand-hover);
}

.jobs-tabs-bar__create:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.jobs-tabs-bar__filters {
  display: grid;
  gap: 12px;
}

.jobs-tabs-bar__search {
  position: relative;
  flex: 1;
}

.jobs-tabs-bar__search-input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 10px;
  background: var(--bg-muted);
  padding: 0 40px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all var(--duration-fast) var(--ease-default);
}

.jobs-tabs-bar__search-input:focus {
  outline: none;
  border-color: var(--border-strong);
  background: var(--bg-surface);
  box-shadow: 0 0 0 3px var(--bg-surface-active);
}

.jobs-tabs-bar__search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: var(--text-tertiary);
  font-size: 18px;
  transform: translateY(-50%);
}

.jobs-tabs-bar__search-clear {
  position: absolute;
  top: 50%;
  right: 10px;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transform: translateY(-50%);
  transition: all var(--duration-fast) var(--ease-default);
}

.jobs-tabs-bar__search-clear:hover {
  background: var(--bg-surface-active);
  color: var(--text-secondary);
}

.jobs-tabs-bar__select {
  width: 100%;
}

.jobs-tabs-bar__reset {
  min-height: 40px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-brand);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.jobs-tabs-bar__status {
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
}

@media (min-width: 768px) {
  .jobs-tabs-bar__filters {
    align-items: center;
    grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) auto;
  }
}
</style>
