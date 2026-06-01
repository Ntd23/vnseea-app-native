<template>
  <div class="read-blog-page">
    <div
      class="read-blog-page__progress"
      :style="{ width: `${readingProgress}%` }"
      role="progressbar"
      :aria-valuenow="readingProgress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Reading progress"
    />

    <div v-if="isLoading" class="read-blog-page__state" role="status" aria-live="polite">
      <Icon name="i-ph-circle-notch" class="read-blog-page__state-icon" />
      <span>{{ $t("pages.readBlogPage.loading") }}</span>
    </div>

    <UAlert
      v-else-if="articleNotFound || !article"
      color="warning"
      variant="soft"
      icon="i-ph-warning-circle-fill"
      class="read-blog-page__alert"
    >
      {{ $t("pages.readBlogPage.notFound") }}
    </UAlert>

    <template v-else>
      <BlogsReadBlogHero
        :article="article"
        :format-compact="formatCompact"
      />

      <div class="read-blog-page__layout">
        <BlogsReadBlogMain
          class="read-blog-page__main"
          :article="article"
          :liked="liked"
          :displayed-likes="displayedLikes"
          :share-open="shareOpen"
          :share-url="shareUrl"
          :comments="comments"
          :comments-loading="commentsLoading"
          :commenting="commenting"
          :current-user-name="currentUserName"
          :current-user-avatar-url="currentUserAvatarUrl"
          :comment-action-repository="commentActionRepository"
          :format-compact="formatCompact"
          @toggle-like="liked = !liked"
          @toggle-share="shareOpen = !shareOpen"
          @add-comment="addComment"
        />

        <BlogsReadBlogSidebar
          class="read-blog-page__sidebar"
          :article="article"
          :related-articles="relatedArticles"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import BlogsReadBlogHero from "../components/ReadBlogHero.vue"
import BlogsReadBlogMain from "../components/ReadBlogMain.vue"
import BlogsReadBlogSidebar from "../components/ReadBlogSidebar.vue"
import { useReadBlogPageVM } from "../../application/view-models/useReadBlogPageVM"

const {
  article,
  articleNotFound,
  liked,
  shareOpen,
  comments,
  commentsLoading,
  commenting,
  displayedLikes,
  relatedArticles,
  shareUrl,
  formatCompact,
  addComment,
  readingProgress,
  isLoading,
  currentUserName,
  currentUserAvatarUrl,
  commentActionRepository,
} = useReadBlogPageVM()
</script>

<style scoped>
.read-blog-page {
  padding-bottom: 44px;
}

.read-blog-page__progress {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  height: 3px;
  background: linear-gradient(90deg, #0000ff, #0ea5e9);
  transition: width 0.1s ease;
}

.read-blog-page__state,
.read-blog-page__alert {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.read-blog-page__state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 240px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.read-blog-page__state-icon {
  height: 18px;
  width: 18px;
  animation: read-blog-spin 0.8s linear infinite;
}

.read-blog-page__layout {
  display: grid;
  gap: 18px;
  margin-top: 18px;
}

.read-blog-page__main {
  min-width: 0;
}

@keyframes read-blog-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 1024px) {
  .read-blog-page__layout {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: start;
  }

  .read-blog-page__sidebar {
    position: sticky;
    top: 82px;
  }
}
</style>
