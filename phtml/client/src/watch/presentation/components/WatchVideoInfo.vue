<!-- Description: Renders API-backed watch metadata and actions without the previous mock follow control. -->
<template>
  <section class="watch-info">
    <div class="watch-info__header">
      <div class="watch-info__meta">
        <h2 class="watch-info__title">{{ video.title }}</h2>
        <div class="watch-info__subtitle">
          <span>{{ $t("pages.watchPage.viewsCount", { count: formatWatchNumber(video.views, locale) }) }}</span>
          <span class="watch-info__dot">•</span>
          <span>{{ video.date }}</span>
        </div>
      </div>

      <div class="watch-info__actions">
        <button
          class="watch-info__action-btn"
          :class="{ 'watch-info__action-btn--active': liked }"
          type="button"
          @click="$emit('like')"
        >
          <Icon name="i-ph-thumbs-up-fill" class="watch-info__action-icon" />
          {{ formatWatchNumber(video.likes + localLikes) }}
        </button>

        <button
          class="watch-info__action-btn"
          type="button"
          @click="$emit('share')"
        >
          <Icon name="i-ph-share-network-fill" class="watch-info__action-icon" />
          {{ $t("pages.watchPage.share") }}
        </button>
      </div>
    </div>

    <!-- Author card -->
    <div class="watch-author">
      <div class="watch-author__avatar" :style="{ background: video.authorGradient }">
        {{ video.authorInitials }}
      </div>
      <div class="watch-author__info">
        <p class="watch-author__name">{{ video.author }}</p>
        <p class="watch-author__role">{{ $t("pages.watchPage.creatorMeta") }}</p>
      </div>
      <NuxtLink :to="video.authorPath" class="watch-author__follow">
        {{ $t("pages.explorePage.viewProfile") }}
      </NuxtLink>
    </div>

    <!-- Description + tags -->
    <div class="watch-info__body">
      <p class="watch-info__desc">{{ video.description }}</p>

      <div class="watch-info__tags">
        <span v-for="tag in video.tags" :key="tag" class="watch-info__tag">{{ tag }}</span>
      </div>
    </div>

    <!-- Share success message -->
    <div v-if="shareMessage" class="watch-info__share-msg">
      <Icon name="i-ph-link-bold" class="h-4 w-4" />
      <span>{{ shareMessage }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WatchVideo } from "../../application/composables/useWatchData"
import { formatWatchNumber } from "../../application/composables/useWatchData"

const { locale } = useI18n()

defineProps<{
  video: WatchVideo
  liked: boolean
  localLikes: number
  shareMessage: string
}>()

defineEmits<{ like: []; share: [] }>()
</script>

<style scoped>
.watch-info {
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
  .watch-info { padding: 24px; }
}

/* Header */
.watch-info__header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1024px) {
  .watch-info__header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.watch-info__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.watch-info__title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

@media (min-width: 640px) {
  .watch-info__title { font-size: 1.65rem; }
}

.watch-info__subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.watch-info__dot {
  color: #cbd5e1;
}

/* Action buttons */
.watch-info__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.watch-info__action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.watch-info__action-btn:hover {
  border-color: #0000ff;
  color: #0000ff;
  background: rgba(0, 0, 255, 0.03);
}

.watch-info__action-btn--active {
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  border-color: #0000ff;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
}

.watch-info__action-btn--active:hover {
  background: linear-gradient(180deg, #3344ff 0%, #1111ff 100%);
  color: #ffffff;
}

.watch-info__action-icon {
  width: 18px;
  height: 18px;
}

/* Author card */
.watch-author {
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 14px;
  background: rgba(0, 0, 255, 0.03);
  border: 1px solid rgba(0, 0, 255, 0.06);
  padding: 14px 16px;
}

.watch-author__avatar {
  display: flex;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
}

.watch-author__info {
  min-width: 0;
  flex: 1;
}

.watch-author__name {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watch-author__role {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.watch-author__follow {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 255, 0.15);
  background: #ffffff;
  font-size: 13px;
  font-weight: 700;
  color: #0000ff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.watch-author__follow:hover {
  background: #0000ff;
  color: #ffffff;
}

/* Description & tags */
.watch-info__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.watch-info__desc {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
  color: #475569;
}

.watch-info__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.watch-info__tag {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  font-size: 12px;
  font-weight: 600;
}

/* Share msg */
.watch-info__share-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 255, 0.05);
  border: 1px solid rgba(0, 0, 255, 0.1);
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #0000ff;
}
</style>
