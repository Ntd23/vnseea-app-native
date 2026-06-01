<template>
  <article class="shared-post-card">
    <div class="shared-post-card__header">
      <img
        v-if="post.authorAvatarUrl"
        :src="post.authorAvatarUrl"
        :alt="post.author"
        class="shared-post-card__avatar"
      >
      <div v-else class="shared-post-card__avatar shared-post-card__avatar--fallback">
        {{ authorInitials }}
      </div>
      <div class="shared-post-card__meta">
        <NuxtLink :to="post.authorPath || '/home'" class="shared-post-card__author">
          {{ post.author }}
        </NuxtLink>
        <p class="shared-post-card__time">{{ post.time || post.audience }}</p>
      </div>
    </div>

    <p v-if="post.text" class="shared-post-card__text">{{ post.text }}</p>
    <FeedPostMediaGrid
      v-if="post.mediaItems.length"
      class="shared-post-card__media"
      :items="post.mediaItems"
    />
  </article>
</template>

<script setup lang="ts">
import type { FeedPostRecord } from "../../domain/types/feed.types"
import FeedPostMediaGrid from "./PostMediaGrid.vue"

const props = defineProps<{
  post: FeedPostRecord
}>()

const authorInitials = computed(() => {
  const initials = props.post.author
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.slice(0, 1).toUpperCase())
    .join("")

  return initials || "VN"
})
</script>

<style scoped>
.shared-post-card {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 14px;
  background: #ffffff;
}

.shared-post-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 0;
}

.shared-post-card__avatar {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: 999px;
  object-fit: cover;
}

.shared-post-card__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.shared-post-card__meta {
  min-width: 0;
}

.shared-post-card__author {
  display: block;
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shared-post-card__time {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.shared-post-card__text {
  padding: 10px 12px 0;
  color: #334155;
  font-size: 13.5px;
  line-height: 1.65;
  white-space: pre-line;
}

.shared-post-card__media {
  margin-top: 12px;
}
</style>
