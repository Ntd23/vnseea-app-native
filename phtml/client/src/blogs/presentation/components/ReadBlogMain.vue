<template>
  <section class="read-blog-main">
    <div class="read-blog-main__toolbar">
      <div class="read-blog-main__actions">
        <button
          class="read-blog-main__action"
          :class="{ 'read-blog-main__action--active': liked }"
          :aria-pressed="liked"
          type="button"
          @click="$emit('toggleLike')"
        >
          <Icon :name="liked ? 'i-ph-thumbs-up-fill' : 'i-ph-thumbs-up-duotone'" class="read-blog-main__action-icon" />
          <span>{{ formatCompact(displayedLikes) }}</span>
        </button>

        <button
          class="read-blog-main__action"
          :class="{ 'read-blog-main__action--active': shareOpen }"
          :aria-pressed="shareOpen"
          type="button"
          @click="$emit('toggleShare')"
        >
          <Icon name="i-ph-share-network-duotone" class="read-blog-main__action-icon" />
          <span>{{ $t("pages.readBlogPage.share") }}</span>
        </button>
      </div>

      <div v-if="article.tags.length > 0" class="read-blog-main__tags" aria-label="Article tags">
        <span v-for="tag in article.tags" :key="tag" class="read-blog-main__tag">
          #{{ tag }}
        </span>
      </div>
    </div>

    <div v-if="shareOpen" class="read-blog-main__share" role="status" aria-live="polite">
      <span class="read-blog-main__share-label">{{ $t("pages.readBlogPage.shareLink") }}</span>
      <span class="read-blog-main__share-url">{{ shareUrl }}</span>
    </div>

    <article class="read-blog-main__article">
      <div class="read-blog-main__body">
        <p
          v-for="(paragraph, index) in article.body"
          :key="`${index}-${paragraph}`"
          class="read-blog-main__paragraph"
          :class="{ 'read-blog-main__paragraph--lead': index === 0 }"
        >
          {{ paragraph }}
        </p>
      </div>
    </article>

    <section class="read-blog-main__comments" aria-labelledby="read-blog-comments-title">
      <div class="read-blog-main__comments-header">
        <span class="read-blog-main__comments-icon">
          <Icon name="i-ph-chat-circle-dots-fill" />
        </span>
        <div>
          <p class="read-blog-main__eyebrow">{{ $t("pages.readBlogPage.comments") }}</p>
          <h2 id="read-blog-comments-title" class="read-blog-main__comments-title">
            {{ $t("pages.readBlogPage.responses", { count: comments.length }) }}
          </h2>
        </div>
      </div>

      <div class="read-blog-main__comment-list">
        <div v-if="commentsLoading" class="read-blog-main__comments-loading" role="status" aria-live="polite">
          <Icon name="i-ph-circle-notch-bold" />
          <span>{{ $t("pages.readBlogPage.loading") }}</span>
        </div>

        <FeedCommentList
          v-else
          :comments="comments"
          enable-reply
          enable-reaction
          :current-user-name="currentUserName"
          :current-user-avatar-url="currentUserAvatarUrl"
          :comment-action-repository="commentActionRepository"
        />
      </div>

      <div class="read-blog-main__composer">
        <FeedCommentComposer
          :current-user-name="currentUserName"
          :current-user-avatar-url="currentUserAvatarUrl"
          :submitting="commenting"
          :enable-attachments="false"
          @submit="$emit('addComment', $event)"
        />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import FeedCommentComposer from "../../../feed/presentation/components/CommentComposer.vue"
import FeedCommentList from "../../../feed/presentation/components/CommentList.vue"
import type { FeedCommentActionRepository } from "../../../feed/application/view-models/useFeedCommentItemVM"
import type { FeedCommentRecord, FeedCommentSubmitPayload } from "../../../feed/domain/types/feed.types"

defineProps<{
  article: {
    tags: string[]
    body: string[]
  }
  liked: boolean
  displayedLikes: number
  shareOpen: boolean
  shareUrl: string
  comments: FeedCommentRecord[]
  commentsLoading: boolean
  commenting: boolean
  currentUserName: string
  currentUserAvatarUrl: string
  commentActionRepository: FeedCommentActionRepository
  formatCompact: (value: number) => string
}>()

defineEmits<{
  toggleLike: []
  toggleShare: []
  addComment: [payload: FeedCommentSubmitPayload]
}>()
</script>

<style scoped>
.read-blog-main {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.read-blog-main__toolbar,
.read-blog-main__article,
.read-blog-main__comments,
.read-blog-main__share {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.read-blog-main__toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.read-blog-main__actions,
.read-blog-main__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.read-blog-main__action {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 0 13px;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.read-blog-main__action > * {
  pointer-events: none;
}

.read-blog-main__action:hover,
.read-blog-main__action--active {
  border-color: rgba(0, 0, 255, 0.18);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.read-blog-main__action-icon,
.read-blog-main__submit-icon {
  height: 16px;
  width: 16px;
}

.read-blog-main__tag {
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
}

.read-blog-main__share {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.read-blog-main__share-label {
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.read-blog-main__share-url {
  overflow-wrap: anywhere;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.6;
  padding: 10px 12px;
}

.read-blog-main__article {
  padding: 20px;
}

.read-blog-main__body {
  display: grid;
  gap: 20px;
  max-width: 760px;
  margin: 0 auto;
}

.read-blog-main__paragraph {
  margin: 0;
  color: #334155;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.9;
}

.read-blog-main__paragraph--lead {
  color: #1e293b;
  font-size: 17px;
}

.read-blog-main__comments {
  overflow: hidden;
}

.read-blog-main__comments-header,
.read-blog-main__composer,
.read-blog-main__comments-loading {
  display: flex;
}

.read-blog-main__comments-header {
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #f1f5f9;
  padding: 14px 16px;
}

.read-blog-main__comments-icon {
  display: flex;
  height: 34px;
  width: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.read-blog-main__eyebrow {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.read-blog-main__comments-title {
  margin: 2px 0 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
}

.read-blog-main__comment-list {
  display: grid;
  padding: 16px;
}

.read-blog-main__comments-loading {
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.read-blog-main__comments-loading :deep(svg) {
  height: 16px;
  width: 16px;
  animation: read-blog-comment-spin 0.8s linear infinite;
}

.read-blog-main__composer {
  border-top: 1px solid #f1f5f9;
  padding: 16px;
}

.read-blog-main__comment-list :deep(.comment-list) {
  gap: 14px;
}

.read-blog-main__comment-list :deep(.comment-list__header) {
  align-items: center;
}

.read-blog-main__comment-list :deep(.comment-list__sort) {
  overflow: hidden;
  border-radius: 999px;
  background: #f8fafc;
  padding: 3px;
}

.read-blog-main__comment-list :deep(.comment-list__items) {
  display: grid;
  gap: 14px;
}

.read-blog-main__comment-list :deep(.comment-item) {
  width: 100%;
}

.read-blog-main__comment-list :deep(.comment-item__bubble) {
  max-width: min(100%, 680px);
  border: 1px solid #eef2f7;
  background: #f8fafc;
}

.read-blog-main__comment-list :deep(.comment-item__footer) {
  gap: 12px;
  margin-left: 10px;
}

.read-blog-main__comment-list :deep(.comment-item__footer-action) {
  border-radius: 999px;
  padding: 3px 7px;
}

.read-blog-main__comment-list :deep(.comment-item__footer-action:hover),
.read-blog-main__comment-list :deep(.comment-item__footer-action--active) {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.read-blog-main__comment-list :deep(.comment-item__replies) {
  margin-top: 10px;
  padding-left: 14px;
  border-left-color: rgba(0, 0, 255, 0.14);
}

.read-blog-main__composer :deep(.comment-composer) {
  width: 100%;
}

.read-blog-main__composer :deep(.comment-composer__shell) {
  min-width: 0;
}

.read-blog-main__composer :deep(.comment-composer__toolbar) {
  justify-content: flex-start;
}

@keyframes read-blog-comment-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 640px) {
  .read-blog-main__toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .read-blog-main__article {
    padding: 28px;
  }
}
</style>
