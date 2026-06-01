<template>
  <section class="watch-hero">
    <div class="watch-hero__inner">
      <div class="watch-hero__copy">
        <p class="watch-hero__eyebrow">{{ $t("pages.watchPage.heroEyebrow") }}</p>
        <h1 class="watch-hero__title">{{ $t("pages.watchPage.heroTitle") }}</h1>
        <p class="watch-hero__desc">{{ $t("pages.watchPage.heroDescription") }}</p>
      </div>

      <div class="watch-hero__stats">
        <div v-for="item in stats" :key="item.label" class="watch-stat">
          <p class="watch-stat__label">{{ item.label }}</p>
          <p class="watch-stat__value">{{ item.value }}</p>
          <p class="watch-stat__desc">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
}>()
</script>

<style scoped>
.watch-hero {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

@media (min-width: 640px) {
  .watch-hero { padding: 32px; }
}

.watch-hero__inner {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

@media (min-width: 1280px) {
  .watch-hero__inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.watch-hero__copy {
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.watch-hero__eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.watch-hero__title {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1.1;
  color: #0f172a;
  letter-spacing: -0.01em;
}

@media (min-width: 640px) {
  .watch-hero__title { font-size: 3.5rem; }
}

.watch-hero__desc {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  color: #64748b;
  max-width: 640px;
}

/* Stats grid */
.watch-hero__stats {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
}

@media (min-width: 1280px) {
  .watch-hero__stats { width: 540px; }
}

.watch-stat {
  background: rgba(0, 0, 255, 0.03);
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.watch-stat__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

.watch-stat__value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.watch-stat__desc {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
</style>
