<!-- Description: Renders the related watch queue from API-backed video posts. -->
<template>
  <aside class="related">
    <div class="related__header">
      <div>
        <p class="related__eyebrow">{{ $t("pages.watchPage.relatedEyebrow") }}</p>
        <h2 class="related__title">{{ $t("pages.watchPage.relatedTitle") }}</h2>
      </div>
      <span class="related__count">{{ videos.length }}</span>
    </div>

    <div class="related__list">
      <button
        v-for="video in videos"
        :key="video.id"
        class="related-item"
        :class="{ 'related-item--active': video.id === selectedId }"
        type="button"
        @click="$emit('select', video.id)"
      >
        <div class="related-item__grid">
          <div class="related-item__thumb">
            <NuxtImg
              :alt="video.title"
              class="related-item__img"
              :src="video.cover"
              loading="lazy"
              format="webp"
            />
            <span class="related-item__duration">{{ video.duration }}</span>
          </div>
          <div class="related-item__info">
            <h3 class="related-item__name">{{ video.title }}</h3>
            <p class="related-item__author">{{ video.author }}</p>
            <div class="related-item__meta">
              <span>{{ $t("pages.watchPage.viewsCount", { count: formatWatchNumber(video.views, locale) }) }}</span>
              <span class="related-item__dot">•</span>
              <span>{{ video.date }}</span>
            </div>
            <span class="related-item__category">{{ video.categoryLabel }}</span>
          </div>
        </div>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { WatchVideo } from "../../application/composables/useWatchData"
import { formatWatchNumber } from "../../application/composables/useWatchData"

const { locale } = useI18n()

defineProps<{
  videos: ReadonlyArray<WatchVideo>
  selectedId: string
}>()

defineEmits<{ select: [id: string] }>()
</script>

<style scoped>
.related {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 640px) {
  .related { padding: 24px; }
}

.related__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.related__eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.related__title {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.related__count {
  display: inline-flex;
  min-width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: #0000ff;
}

.related__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Video item */
.related-item {
  width: 100%;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.related-item:hover {
  border-color: rgba(0, 0, 255, 0.2);
  background: rgba(0, 0, 255, 0.02);
}

.related-item--active {
  border-color: #0000ff;
  background: rgba(0, 0, 255, 0.03);
  box-shadow: 0 0 0 1px #0000ff;
}

.related-item__grid {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
}

@media (min-width: 640px) {
  .related-item__grid { grid-template-columns: 160px minmax(0, 1fr); }
}

@media (min-width: 1280px) {
  .related-item__grid { grid-template-columns: 1fr; }
}

/* Thumbnail */
.related-item__thumb {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
}

.related-item__img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform 500ms ease;
}

.related-item:hover .related-item__img {
  transform: scale(1.08);
}

.related-item__duration {
  position: absolute;
  bottom: 6px;
  right: 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.72);
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  backdrop-filter: blur(4px);
}

/* Info */
.related-item__info {
  min-width: 0;
  padding: 2px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}

.related-item__name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: #1e293b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.12s ease;
}

.related-item:hover .related-item__name {
  color: #0000ff;
}

.related-item__author {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.related-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
}

.related-item__dot {
  color: #cbd5e1;
}

.related-item__category {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  font-size: 10px;
  font-weight: 700;
  color: #0000ff;
}
</style>
