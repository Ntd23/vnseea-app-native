<template>
  <div class="movie-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="movie-tabs__button"
      :class="{ 'movie-tabs__button--active': modelValue === tab.id }"
      @click="$emit('update:modelValue', tab.id)"
    >
      <Icon :name="tab.icon" class="movie-tabs__icon" />
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
export type MovieTabId = "new" | "recommended" | "watched"

interface Tab {
  id: MovieTabId
  label: string
  icon: string
}

defineProps<{
  modelValue: MovieTabId
  tabs: Tab[]
}>()

defineEmits<{
  "update:modelValue": [value: MovieTabId]
}>()
</script>

<style scoped>
.movie-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.movie-tabs__button {
  display: inline-flex;
  min-height: 44px;
  min-width: 142px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 2px;
  background: #ffffff;
  padding: 10px 18px;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.movie-tabs__icon {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
}

.movie-tabs__button:hover,
.movie-tabs__button--active {
  border-color: #0a58ca;
  background: #0a58ca;
  color: #ffffff;
}
</style>
