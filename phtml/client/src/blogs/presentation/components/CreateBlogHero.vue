<template>
  <section class="create-blog-hero" aria-labelledby="create-blog-hero-title">
    <div class="create-blog-hero__content">
      <p class="create-blog-hero__eyebrow">
        <Icon name="i-ph-note-pencil-fill" class="h-4 w-4" />
        {{ $t("pages.createBlogPage.heroEyebrow") }}
      </p>

      <h1 id="create-blog-hero-title" class="create-blog-hero__title">
        {{ $t("pages.createBlogPage.heroTitle") }}
      </h1>

      <p class="create-blog-hero__description">
        {{ $t("pages.createBlogPage.heroDescription") }}
      </p>

      <div class="create-blog-hero__actions">
        <NuxtLink to="/blogs" class="create-blog-hero__button create-blog-hero__button--secondary">
          <Icon name="i-ph-arrow-left" class="h-4 w-4" />
          <span>{{ $t("pages.createBlogPage.backToBlogs") }}</span>
        </NuxtLink>

        <button
          class="create-blog-hero__button create-blog-hero__button--primary"
          type="button"
          @click="$emit('quickFill')"
        >
          <Icon name="i-ph-magic-wand-fill" class="h-4 w-4" />
          <span>{{ $t("pages.createBlogPage.quickFill") }}</span>
        </button>
      </div>
    </div>

    <div class="create-blog-hero__panel" role="list">
      <div
        v-for="item in stats"
        :key="item.label"
        class="create-blog-hero__stat"
        role="listitem"
      >
        <span class="create-blog-hero__stat-label">{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.description }}</small>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  stats: ReadonlyArray<{
    label: string
    value: string
    description: string
  }>
}>()

defineEmits<{
  quickFill: []
}>()
</script>

<style scoped>
.create-blog-hero {
  display: grid;
  gap: 18px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background:
    linear-gradient(120deg, rgba(0, 0, 255, 0.08), transparent 48%),
    #ffffff;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.create-blog-hero__content {
  min-width: 0;
}

.create-blog-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
}

.create-blog-hero__title {
  max-width: 720px;
  margin: 14px 0 0;
  color: #0f172a;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.08;
}

.create-blog-hero__description {
  max-width: 640px;
  margin: 12px 0 0;
  color: #475569;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.7;
}

.create-blog-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.create-blog-hero__button {
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

.create-blog-hero__button > * {
  pointer-events: none;
}

.create-blog-hero__button:hover {
  transform: translateY(-1px);
}

.create-blog-hero__button--secondary {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
}

.create-blog-hero__button--secondary:hover {
  border-color: rgba(0, 0, 255, 0.16);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.create-blog-hero__button--primary {
  border: 1px solid #0000ff;
  background: #0000ff;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
}

.create-blog-hero__panel {
  display: grid;
  gap: 10px;
}

.create-blog-hero__stat {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  padding: 14px;
}

.create-blog-hero__stat-label,
.create-blog-hero__stat strong,
.create-blog-hero__stat small {
  display: block;
}

.create-blog-hero__stat-label {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.create-blog-hero__stat strong {
  margin-top: 7px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}

.create-blog-hero__stat small {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .create-blog-hero {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: end;
    padding: 26px;
  }

  .create-blog-hero__title {
    font-size: 42px;
  }
}

@media (min-width: 1024px) {
  .create-blog-hero__panel {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .create-blog-hero__panel {
    grid-template-columns: 1fr;
  }
}
</style>
