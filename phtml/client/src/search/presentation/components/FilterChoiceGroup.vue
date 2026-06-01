<template>
  <div class="filter-choice">
    <p class="filter-choice__title">
      {{ label }}
    </p>

    <div class="filter-choice__pills">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="pillClass(modelValue === option.value)"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchOption } from "../../domain/types/search.types"

defineProps<{
  label: string
  modelValue: string
  options: SearchOption<string>[]
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const pillClass = (active: boolean) => [
  "filter-choice__pill",
  active ? "filter-choice__pill--active" : "",
]
</script>

<style scoped>
.filter-choice {
  display: grid;
  gap: 10px;
}

.filter-choice__title {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.filter-choice__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-choice__pill {
  min-height: 32px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.filter-choice__pill--active {
  border-color: #0000ff;
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
  box-shadow: 0 4px 12px rgba(0, 0, 255, 0.12);
}

.filter-choice__pill:hover {
  background: rgba(0, 0, 255, 0.03);
  color: #0000ff;
}

.filter-choice__pill--active:hover {
  background: rgba(0, 0, 255, 0.08);
}

@media (max-width: 640px) {
  .filter-choice__title {
    font-size: 13px;
  }

  .filter-choice__pill {
    min-height: 30px;
    padding-inline: 12px;
    font-size: 12px;
  }
}
</style>
