<!-- Description: Displays real backend comments with compact sorting and optional inline reply threads. -->
<template>
  <section class="comment-list">
    <div class="comment-list__header">
      <p class="comment-list__title">{{ t("feed.commentList.title") }}</p>
      <div v-if="comments.length > 1" class="comment-list__sort">
        <button
          type="button"
          class="comment-list__sort-button"
          :class="{ 'comment-list__sort-button--active': sort === 'top' }"
          @click="sort = 'top'"
        >
          <Icon name="i-ph-trend-up-bold" class="comment-list__sort-icon" />
          <span>{{ t("feed.commentList.sortTop") }}</span>
        </button>
        <button
          type="button"
          class="comment-list__sort-button"
          :class="{ 'comment-list__sort-button--active': sort === 'newest' }"
          @click="sort = 'newest'"
        >
          <Icon name="i-ph-clock-clockwise-bold" class="comment-list__sort-icon" />
          <span>{{ t("feed.commentList.sortNewest") }}</span>
        </button>
      </div>
    </div>

    <UAlert
      v-if="visibleComments.length === 0"
      class="comment-list__empty"
      color="neutral"
      variant="soft"
      icon="i-ph-chat-centered-dots"
      :description="t('feed.commentList.emptyDescription')"
    />

    <div v-else class="comment-list__items">
      <FeedCommentItem
        v-for="comment in visibleComments"
        :key="comment.id"
        :id="comment.id"
        :author="comment.author"
        :author-avatar-url="comment.authorAvatarUrl"
        :author-path="comment.authorPath"
        :role="comment.role"
        :text="comment.text"
        :time="comment.time"
        :attachment="comment.attachment"
        :reactions-count="comment.reactionsCount"
        :selected-reaction="comment.selectedReaction"
        :replies="comment.replies"
        :replies-count="comment.repliesCount"
        :enable-reply="enableReply"
        :enable-reaction="enableReaction"
        :current-user-name="currentUserName"
        :current-user-avatar-url="currentUserAvatarUrl"
        :comment-action-repository="commentActionRepository"
      />
    </div>

    <button
      v-if="visibleComments.length < sortedComments.length"
      type="button"
      class="comment-list__more"
      @click.stop="loadMoreComments"
    >
      <Icon name="i-ph-arrow-down-bold" class="comment-list__more-icon" />
      <span class="comment-list__more-label">{{ t("feed.commentList.loadMore") }}</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import type { FeedCommentRecord } from "../../domain/types/feed.types"
import type { FeedCommentActionRepository } from "../../application/view-models/useFeedCommentItemVM"
import FeedCommentItem from "./CommentItem.vue"

const { t } = useI18n()

const props = withDefaults(defineProps<{
  comments: FeedCommentRecord[]
  enableReply?: boolean
  enableReaction?: boolean
  currentUserName?: string
  currentUserAvatarUrl?: string
  commentActionRepository?: FeedCommentActionRepository
}>(), {
  enableReaction: true,
})

const sort = ref<"top" | "newest">("top")
const initialVisibleCount = 5
const visibleCount = ref(initialVisibleCount)

watch(
  () => props.comments.length,
  (count) => {
    visibleCount.value = Math.min(
      Math.max(visibleCount.value, initialVisibleCount),
      Math.max(count, initialVisibleCount),
    )
  },
  { immediate: true },
)

const sortedComments = computed<FeedCommentRecord[]>(() =>
  sort.value === "newest" ? [...props.comments].reverse() : props.comments,
)

const visibleComments = computed(() =>
  sortedComments.value.slice(0, visibleCount.value),
)

function loadMoreComments() {
  visibleCount.value = Math.min(visibleCount.value + 10, sortedComments.value.length)
}
</script>

<style scoped>
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.comment-list__title {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.comment-list__sort {
  display: flex;
  align-items: center;
  gap: 4px;
}

.comment-list__sort-button {
  position: relative;
  z-index: 20;
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.comment-list__sort-button > * {
  pointer-events: none;
}

.comment-list__sort-button:hover,
.comment-list__sort-button--active {
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.comment-list__sort-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.comment-list__empty {
  border-radius: 16px;
}

.comment-list__items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-list__more {
  position: relative;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  min-height: 34px;
  min-width: 150px;
  border: 0;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.comment-list__more > * {
  pointer-events: none;
}

.comment-list__more-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.comment-list__more-label {
  display: inline-flex;
  align-items: center;
}

.comment-list__more:hover {
  background: rgba(0, 0, 255, 0.1);
}
</style>
