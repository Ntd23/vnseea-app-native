<!-- Description: Renders watch comments and emits backend-bound comment submissions for the selected video post. -->
<template>
  <section class="watch-comments">
    <div class="watch-comments__header">
      <div>
        <p class="watch-comments__eyebrow">{{ $t("pages.watchPage.commentsEyebrow") }}</p>
        <h2 class="watch-comments__title">{{ $t("pages.watchPage.commentsTitle") }}</h2>
      </div>
      <span class="watch-comments__count">{{ comments.length }}</span>
    </div>

    <form class="watch-comments__form" @submit.prevent="submit">
      <input
        v-model="message"
        class="watch-comments__input"
        :placeholder="$t('pages.watchPage.commentPlaceholder')"
      >
      <button
        class="watch-comments__submit"
        type="submit"
        :disabled="message.trim().length === 0"
      >
        <Icon name="i-ph-paper-plane-tilt-fill" class="h-5 w-5" />
      </button>
    </form>

    <div class="watch-comments__list">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="watch-comment"
      >
        <div class="watch-comment__avatar">{{ comment.initials }}</div>
        <div class="watch-comment__body">
          <div class="watch-comment__meta">
            <p class="watch-comment__author">{{ comment.author }}</p>
            <span class="watch-comment__role">{{ comment.role }}</span>
            <span class="watch-comment__time">· {{ comment.time }}</span>
          </div>
          <p class="watch-comment__text">{{ comment.message }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WatchComment } from "../../application/composables/useWatchData"

defineProps<{
  comments: ReadonlyArray<WatchComment>
}>()

const emit = defineEmits<{ send: [message: string] }>()

const message = ref('')

const submit = () => {
  const value = message.value.trim()
  if (value.length === 0) return
  emit('send', value)
  message.value = ''
}
</script>

<style scoped>
.watch-comments {
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
  .watch-comments { padding: 24px; }
}

.watch-comments__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.watch-comments__eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.watch-comments__title {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.watch-comments__count {
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

/* Form */
.watch-comments__form {
  display: flex;
  gap: 10px;
}

.watch-comments__input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fafbfe;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}

.watch-comments__input:focus {
  border-color: rgba(0, 0, 255, 0.25);
}

.watch-comments__input::placeholder {
  color: #94a3b8;
}

.watch-comments__submit {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: none;
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
  transition: all 0.15s ease;
}

.watch-comments__submit:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 255, 0.28);
  transform: translateY(-1px);
}

.watch-comments__submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Comment list */
.watch-comments__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.watch-comment {
  display: flex;
  gap: 14px;
  border-radius: 14px;
  background: rgba(0, 0, 255, 0.02);
  border: 1px solid rgba(0, 0, 255, 0.04);
  padding: 14px;
  transition: background 0.12s ease;
}

.watch-comment:hover {
  background: rgba(0, 0, 255, 0.04);
}

.watch-comment__avatar {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #3333ff 0%, #0000ff 100%);
  font-size: 11px;
  font-weight: 800;
  color: #ffffff;
}

.watch-comment__body {
  min-width: 0;
  flex: 1;
}

.watch-comment__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.watch-comment__author {
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
}

.watch-comment__role {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 999px;
}

.watch-comment__time {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.watch-comment__text {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
  color: #475569;
}
</style>
