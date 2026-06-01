<template>
  <article class="forum-thread-card" :class="{ 'forum-thread-card--selected': selected }">
    <button
      class="forum-thread-card__button"
      type="button"
      :aria-pressed="selected"
      aria-controls="forum-thread-detail"
      @click="$emit('select', thread.id)"
    >
      <div class="forum-thread-card__main">
        <div class="forum-thread-card__avatar">
          <img v-if="thread.authorAvatarUrl" :src="thread.authorAvatarUrl" :alt="thread.author" loading="lazy">
          <span v-else>{{ thread.authorInitials }}</span>
        </div>

        <div class="forum-thread-card__content">
          <div class="forum-thread-card__meta">
            <span class="forum-thread-card__forum">{{ thread.sectionLabel }}</span>
            <span class="forum-thread-card__status">{{ statusLabel }}</span>
            <span v-if="selected" class="forum-thread-card__selected">
              {{ t("pages.forumPage.selectedThreadAction") }}
            </span>
          </div>

          <h3>{{ thread.title }}</h3>
          <p v-if="thread.excerpt">{{ thread.excerpt }}</p>

          <div class="forum-thread-card__author">
            <strong>{{ thread.author }}</strong>
            <span>{{ thread.authorRole }} · {{ thread.createdAt }}</span>
          </div>
        </div>
      </div>

      <div class="forum-thread-card__stats" aria-hidden="true">
        <span>
          <Icon name="i-ph-eye-duotone" />
          {{ formatForumNumber(thread.views, locale.value) }}
        </span>
        <span>
          <Icon name="i-ph-chat-circle-text-duotone" />
          {{ displayReplyCount }}
        </span>
        <Icon name="i-ph-caret-right-bold" class="forum-thread-card__arrow" />
      </div>
    </button>
  </article>
</template>

<script setup lang="ts">
import type { ForumThread } from "../../domain/types/forum.types"

const props = defineProps<{
  thread: ForumThread
  selected: boolean
  localReplyCount: number
}>()

defineEmits<{
  select: [id: number]
}>()

const { t, locale } = useI18n()

const displayReplyCount = computed(() =>
  props.thread.repliesCount + props.localReplyCount,
)

const formatForumNumber = (value: number, localeCode = "vi") =>
  new Intl.NumberFormat(localeCode === "vi" ? "vi-VN" : "en-US", {
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value)

const statusLabel = computed(() => {
  if (props.thread.status === "pinned") return t("pages.forumPage.statusPinned")
  if (props.thread.status === "solved") return t("pages.forumPage.statusSolved")
  return t("pages.forumPage.statusOpen")
})
</script>

<style scoped>
.forum-thread-card {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.forum-thread-card:hover {
  border-color: rgba(0, 0, 255, 0.16);
  box-shadow: 0 6px 22px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.forum-thread-card--selected {
  border-color: rgba(0, 0, 255, 0.24);
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.06);
}

.forum-thread-card__button {
  display: grid;
  width: 100%;
  gap: 14px;
  border: 0;
  background: transparent;
  padding: 14px;
  text-align: left;
  cursor: pointer;
}

.forum-thread-card__main {
  display: flex;
  min-width: 0;
  gap: 12px;
}

.forum-thread-card__avatar {
  display: flex;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(145deg, #3333ff 0%, #0000ff 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.forum-thread-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.forum-thread-card__content {
  min-width: 0;
}

.forum-thread-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 7px;
}

.forum-thread-card__forum,
.forum-thread-card__status,
.forum-thread-card__selected {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
}

.forum-thread-card__forum {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.forum-thread-card__status {
  background: #f1f5f9;
  color: #64748b;
}

.forum-thread-card__selected {
  background: #eef2ff;
  color: #334155;
}

.forum-thread-card h3 {
  overflow-wrap: anywhere;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
}

.forum-thread-card p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 6px;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.forum-thread-card__author {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.forum-thread-card__author strong {
  color: #1e293b;
  font-weight: 700;
}

.forum-thread-card__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.forum-thread-card__stats span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.forum-thread-card__stats :deep(svg) {
  width: 15px;
  height: 15px;
}

.forum-thread-card__arrow {
  margin-left: auto;
  color: #0000ff;
}

@media (min-width: 720px) {
  .forum-thread-card__button {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding: 16px;
  }

  .forum-thread-card__stats {
    min-width: 132px;
    justify-content: flex-end;
  }
}
</style>
