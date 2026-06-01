<template>
  <section
    class="blogs-hero"
    aria-labelledby="blogs-hero-title"
  >
    <div class="blogs-hero__content">
      <span class="blogs-hero__eyebrow">
        <Icon name="i-ph-newspaper-clipping-fill" class="h-4 w-4" />
        {{ articleCount }} {{ $t("pages.blogsPage.results") }}
      </span>

      <h1
        id="blogs-hero-title"
        class="blogs-hero__title"
      >
        {{ $t("pages.blogsPage.heroTitle") }}
      </h1>

      <div class="blogs-hero__actions">
        <button
          type="button"
          class="blogs-hero__button"
          :class="{ 'blogs-hero__button--active': mineOnly }"
          :aria-pressed="mineOnly"
          @click="$emit('toggleMine')"
        >
          <Icon :name="mineOnly ? 'i-ph-toggle-right-fill' : 'i-ph-article-fill'" class="h-4 w-4 shrink-0" />
          <span>{{ $t("pages.blogsPage.myArticles") }}</span>
        </button>

        <NuxtLink
          to="/create-blog"
          class="blogs-hero__primary"
        >
          <Icon name="i-ph-pencil-simple-line-fill" class="h-4 w-4 shrink-0" />
          <span>{{ $t("pages.blogsPage.writeBlog") }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="blogs-hero__stats" aria-label="Blog statistics">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="blogs-hero__stat"
      >
        <strong>{{ stat.value }}</strong>
        <span>{{ stat.label }}</span>
        <small>{{ stat.description }}</small>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  articleCount: number
  mineOnly: boolean
  stats: ReadonlyArray<{
    label: string
    value: string
    description: string
  }>
}>()

defineEmits<{
  toggleMine: []
}>()
</script>

<style scoped>
.blogs-hero {
  display: grid;
  gap: 18px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background:
    linear-gradient(120deg, rgba(0, 0, 255, 0.08), transparent 48%),
    #ffffff;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.blogs-hero__content {
  min-width: 0;
}

.blogs-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
}

.blogs-hero__title {
  max-width: 720px;
  margin: 14px 0 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.12;
}

.blogs-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.blogs-hero__button,
.blogs-hero__primary {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  padding: 10px 15px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  text-decoration: none;
  transition: all 0.15s ease;
}

.blogs-hero__button > *,
.blogs-hero__primary > * {
  pointer-events: none;
}

.blogs-hero__button {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
}

.blogs-hero__button:hover,
.blogs-hero__button--active {
  border-color: rgba(0, 0, 255, 0.16);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.blogs-hero__primary {
  border: 1px solid #0000ff;
  background: #0000ff;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
}

.blogs-hero__button:hover,
.blogs-hero__primary:hover {
  transform: translateY(-1px);
}

.blogs-hero__stats {
  display: grid;
  gap: 10px;
}

.blogs-hero__stat {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  padding: 13px;
}

.blogs-hero__stat strong,
.blogs-hero__stat span,
.blogs-hero__stat small {
  display: block;
}

.blogs-hero__stat strong {
  color: #0f172a;
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.blogs-hero__stat span {
  margin-top: 6px;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
}

.blogs-hero__stat small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

@media (min-width: 768px) {
  .blogs-hero {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: end;
    padding: 26px;
  }

  .blogs-hero__title {
    font-size: 40px;
  }
}

@media (min-width: 1024px) {
  .blogs-hero__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
