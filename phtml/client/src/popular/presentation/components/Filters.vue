<!-- Description: Renders popular-page filters backed by normalized category options instead of mock-specific types. -->
<template>
  <section class="rounded-[20px] border border-[#dbe3f2] bg-white p-2.5 shadow-[0_8px_22px_rgba(15,35,110,0.04)] sm:p-3">
    <div class="grid min-w-0 gap-3 lg:grid-cols-[minmax(260px,380px)_minmax(0,1fr)] lg:items-center">
      <label class="relative block min-w-0">
        <Icon name="i-ph-magnifying-glass-duotone" class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-600" />
        <input
          :value="search"
          class="h-11 w-full rounded-[14px] border border-secondary-100 bg-secondary-50/70 py-2.5 pl-11 pr-4 text-[13px] font-semibold text-[var(--text-primary)] outline-none transition placeholder:text-slate-400 focus:border-primary-200 focus:bg-white focus:ring-4 focus:ring-primary-500/10 sm:h-12"
          :placeholder="placeholder"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        >
      </label>

      <div class="min-w-0 overflow-hidden">
        <div class="scrollbar-hide flex min-w-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-0.5">
          <button
            v-for="category in categories"
            :key="category.value"
            class="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[14px] px-3.5 text-[12px] font-extrabold transition active:scale-95 sm:h-11 sm:px-4"
            :class="selectedCategory === category.value
              ? 'bg-primary-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.16)]'
              : 'bg-secondary-50 text-[var(--text-primary)] ring-1 ring-secondary-100 hover:bg-white hover:text-primary-700 hover:ring-primary-200'"
            :aria-pressed="selectedCategory === category.value"
            type="button"
            @click="$emit('update:selectedCategory', category.value)"
          >
            <Icon :name="category.icon.includes('duotone') ? category.icon : category.icon.replace('-bold', '-duotone')" class="h-4.5 w-4.5 shrink-0" />
            {{ category.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PopularCategory, PopularCategoryKey } from "../../application/composables/usePopularData"

defineProps<{
  categories: ReadonlyArray<PopularCategory>
  placeholder: string
  search: string
  selectedCategory: PopularCategoryKey
}>()

defineEmits<{
  "update:search": [value: string]
  "update:selectedCategory": [value: PopularCategoryKey]
}>()
</script>

<style scoped>
.scrollbar-hide {
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
