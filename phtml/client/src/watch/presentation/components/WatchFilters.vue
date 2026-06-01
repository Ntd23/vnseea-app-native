<!-- Description: Renders watch filters using API-backed category options for the watch listing. -->
<template>
  <section class="watch-filters">
    <div class="watch-filters__inner">
      <div class="watch-filters__search-wrap">
        <Icon name="i-ph-magnifying-glass-bold" class="watch-filters__search-icon" />
        <input
          :value="search"
          class="watch-filters__search"
          :placeholder="$t('pages.watchPage.searchPlaceholder')"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div class="watch-filters__cats">
        <button
          v-for="category in categories"
          :key="category.value"
          class="watch-filter-cat"
          :class="{ 'watch-filter-cat--active': selectedCategory === category.value }"
          type="button"
          @click="$emit('update:selectedCategory', category.value)"
        >
          <Icon v-if="category.icon" :name="category.icon" class="h-4 w-4" />
          {{ category.label }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WatchCategoryKey } from "../../application/composables/useWatchData"

defineProps<{
  search: string
  selectedCategory: WatchCategoryKey
  categories: ReadonlyArray<{ label: string; value: WatchCategoryKey; icon: string }>
}>()

defineEmits<{
  'update:search': [value: string]
  'update:selectedCategory': [value: WatchCategoryKey]
}>()
</script>

<style scoped>
.watch-filters {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 16px;
}

@media (min-width: 640px) {
  .watch-filters { padding: 20px; }
}

.watch-filters__inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1024px) {
  .watch-filters__inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

/* Search */
.watch-filters__search-wrap {
  position: relative;
  max-width: 480px;
  flex: 1;
}

.watch-filters__search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}

.watch-filters__search {
  width: 100%;
  padding: 10px 14px 10px 42px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fafbfe;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}

.watch-filters__search:focus {
  border-color: rgba(0, 0, 255, 0.25);
}

.watch-filters__search::placeholder {
  color: #94a3b8;
}

/* Category pills */
.watch-filters__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.watch-filters__cats::-webkit-scrollbar {
  display: none;
}

.watch-filter-cat {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.watch-filter-cat:hover {
  border-color: rgba(0, 0, 255, 0.2);
  color: #0000ff;
  background: rgba(0, 0, 255, 0.03);
}

.watch-filter-cat--active {
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  border-color: #0000ff;
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
  transform: translateY(-1px);
}

.watch-filter-cat--active:hover {
  color: #ffffff;
  background: linear-gradient(180deg, #3344ff 0%, #1111ff 100%);
}
</style>
