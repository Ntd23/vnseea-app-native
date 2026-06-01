<template>
  <div class="flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-white p-2 shadow-sm sm:flex-row sm:items-center">
    <!-- Search Input -->
    <div class="relative flex-1">
      <Icon name="i-ph-magnifying-glass-bold" class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <input
        :value="search"
        class="h-12 w-full rounded-xl bg-[var(--bg-surface-hover)] py-2 pr-4 text-[14px] font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:bg-white focus:ring-1 focus:ring-[var(--color-primary-500)]"
        style="padding-left: 56px !important;"
        :placeholder="placeholder"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <div class="flex h-12 shrink-0 items-center gap-3">
      <!-- Category Dropdown -->
      <div ref="filterDropdownRef" class="relative flex items-center">
        <button
          class="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] bg-white px-3 text-[14px] font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-hover)]"
          type="button"
          @click="isOpen = !isOpen"
        >
          <Icon name="i-ph-funnel-bold" class="h-4 w-4" />
          <span class="hidden sm:inline">{{ selectedCategoryLabel }}</span>
          <Icon name="i-ph-caret-down-bold" class="h-3 w-3 transition-transform" :class="{ 'rotate-180': isOpen }" />
        </button>

        <div
          v-if="isOpen"
          class="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--border-default)] bg-white p-2 shadow-xl space-y-1"
        >
          <button
            v-for="cat in categories"
            :key="cat.value"
            class="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[14px] font-bold transition hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
            :class="selectedCategory === cat.value ? 'bg-[var(--color-primary-50)] text-[#0a58ca]' : 'text-[var(--text-secondary)]'"
            @click="selectCategory(cat.value)"
          >
            <Icon :name="cat.icon" class="h-5 w-5" />
            {{ cat.label }}
          </button>
        </div>
      </div>

      <button
        class="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-white px-3 text-[14px] font-bold text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface-hover)] hover:text-[var(--color-primary-600)] sm:min-w-[132px]"
        type="button"
        @click="resetFilters"
      >
        <Icon name="i-ph-arrow-counter-clockwise-bold" class="h-4 w-4" />
        <span>{{ resetLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import type { MovieCategory, MovieCategoryKey } from "../../application/composables/useMockMoviesData"

const props = withDefaults(defineProps<{
  categories: ReadonlyArray<MovieCategory>
  placeholder: string
  resetLabel?: string
  search: string
  selectedCategory: MovieCategoryKey
}>(), {
  resetLabel: "Reset filters",
})

const emit = defineEmits<{
  reset: []
  "update:search": [value: string]
  "update:selectedCategory": [value: MovieCategoryKey]
}>()

const isOpen = ref(false)
const filterDropdownRef = ref<HTMLElement | null>(null)

const selectedCategoryLabel = computed(() => {
  const cat = props.categories.find(c => c.value === props.selectedCategory)
  return cat ? cat.label : "Categories"
})

const selectCategory = (value: MovieCategoryKey) => {
  emit("update:selectedCategory", value)
  isOpen.value = false
}

const resetFilters = () => {
  emit("reset")
  isOpen.value = false
}

// Close dropdown on click outside
const closeOnOutsideClick = (event: MouseEvent) => {
  const target = event.target as Node | null

  if (isOpen.value && target && !filterDropdownRef.value?.contains(target)) {
    isOpen.value = false
  }
}

onMounted(() => window.addEventListener("click", closeOnOutsideClick))
onUnmounted(() => window.removeEventListener("click", closeOnOutsideClick))
</script>

