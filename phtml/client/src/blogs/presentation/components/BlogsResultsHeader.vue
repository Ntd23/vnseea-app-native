<template>
  <div
    class="blogs-results"
    role="region"
    aria-labelledby="blogs-results-heading"
    aria-live="polite"
  >
    <div class="blogs-results__main">
      <span class="blogs-results__icon">
        <Icon name="i-ph-article-fill" class="h-3.5 w-3.5" />
      </span>
      <div class="min-w-0">
        <p class="blogs-results__eyebrow">{{ $t("pages.blogsPage.results") }}</p>
        <h2 id="blogs-results-heading" class="blogs-results__heading">{{ heading }}</h2>
        <p class="blogs-results__meta">
          {{ $t("pages.blogsPage.resultMeta", { count, sort: sortLabel }) }}
        </p>
      </div>
    </div>

    <button class="blogs-results__reset" type="button" @click="$emit('reset')">
      <Icon name="i-ph-arrow-counter-clockwise" class="h-3.5 w-3.5" />
      <span>{{ $t("pages.blogsPage.reset") }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  heading: string
  count: number
  sortLabel: string
}>()

defineEmits<{
  reset: []
}>()
</script>

<style scoped>
.blogs-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #ffffff;
  padding: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.blogs-results__main {
  display: flex;
  min-width: 0;
  gap: 10px;
}

.blogs-results__icon {
  display: flex;
  height: 32px;
  width: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.blogs-results__eyebrow {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.blogs-results__heading {
  margin: 2px 0 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.blogs-results__meta {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 600;
}

.blogs-results__reset {
  position: relative;
  z-index: 2;
  display: inline-flex;
  width: fit-content;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  padding: 9px 12px;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.blogs-results__reset > * {
  pointer-events: none;
}

.blogs-results__reset:hover {
  border-color: rgba(0, 0, 255, 0.14);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

@media (min-width: 640px) {
  .blogs-results {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
