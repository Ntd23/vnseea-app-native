<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-16 sm:px-5 lg:px-6">
    <section class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <div class="space-y-1.5">
        <p class="text-label-secondary">
          {{ t("pages.explorePage.heroEyebrow") }}
        </p>
        <h1 class="text-heading text-[var(--text-primary)]">
          {{ t("pages.explorePage.heroTitle") }}
        </h1>
      </div>
    </section>

    <UAlert
      v-if="errorMessage"
      color="warning"
      variant="subtle"
      icon="i-ph-warning-circle-fill"
      class="rounded-[22px]"
      :description="errorMessage"
    />

    <div v-if="loading" class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="item in 12"
        :key="item"
        class="explore-skeleton-tile"
      >
        <USkeleton class="aspect-square w-full rounded-t-[14px]" />
        <div class="space-y-2 p-3">
          <USkeleton class="h-4 w-[60%] rounded-lg" />
          <USkeleton class="h-3 w-[40%] rounded-lg" />
        </div>
      </div>
    </div>

    <section
      v-else-if="mediaPosts.length === 0"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
    >
      <FoundationEmptyState
        icon="i-ph-compass-duotone"
        :title="t('pages.explorePage.emptyTitle')"
        :description="t('pages.explorePage.emptyDescription')"
      />
    </section>

    <div v-else class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <NuxtLink
        v-for="post in mediaPosts"
        :key="post.id"
        :to="post.sourcePath"
        class="explore-tile"
      >
        <div class="explore-tile__media">
          <NuxtImg
            v-if="post.mediaItems[0]?.type === 'image' && post.mediaItems[0]?.src"
            :src="post.mediaItems[0].src"
            :alt="post.mediaItems[0].alt || post.author"
            class="explore-tile__image"
            loading="lazy"
            @error="handleImageError"
          />
          <div
            v-else
            class="explore-tile__video"
            :style="post.mediaItems[0]?.thumb || post.mediaItems[0]?.src
              ? { backgroundImage: `url('${post.mediaItems[0]?.thumb || post.mediaItems[0]?.src}')` }
              : undefined"
          >
            <div class="explore-tile__play-overlay">
              <Icon name="i-ph-play-fill" class="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div class="explore-tile__meta">
          <p class="explore-tile__author">{{ post.author }}</p>
          <p class="explore-tile__time">{{ formatDisplayTime(post.time) }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core"
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import { useExplorePageVM } from "../../application/view-models/useExplorePageVM"

const { t } = useI18n()
const { loading, errorMessage, mediaPosts } = useExplorePageVM()
</script>

<style scoped>
.explore-tile,
.explore-skeleton-tile {
  display: block;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default);
  text-decoration: none;
}

.explore-tile:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.explore-tile__media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--bg-surface-hover);
  overflow: hidden;
}

.explore-tile__media--error::after {
  content: "";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface-hover) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E") no-repeat center;
  opacity: 0.5;
}

.explore-tile__image,
.explore-tile__video {
  display: block;
  width: 100%;
  height: 100%;
}

.explore-tile__image {
  object-fit: cover;
}

.explore-tile__video {
  background-color: #0f172a;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.explore-tile__play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(2px);
  transition: background var(--duration-fast) var(--ease-default);
}

.explore-tile:hover .explore-tile__play-overlay {
  background: rgba(15, 23, 42, 0.4);
}

.explore-tile__meta {
  padding: 10px 12px 12px;
}

.explore-tile__author {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.explore-tile__time {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
}
</style>
