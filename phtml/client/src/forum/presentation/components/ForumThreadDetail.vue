<template>
  <aside id="forum-thread-detail" class="forum-thread-detail">
    <section v-if="thread" class="forum-thread-detail__card">
      <div class="forum-thread-detail__header">
        <p>{{ t("pages.forumPage.threadDetailEyebrow") }}</p>
        <h2>{{ thread.title }}</h2>
        <span>{{ statusLabel }}</span>
      </div>

      <p v-if="thread.excerpt" class="forum-thread-detail__body">
        {{ thread.excerpt }}
      </p>

      <div class="forum-thread-detail__meta">
        <span>
          <Icon name="i-ph-chat-centered-text-duotone" />
          {{ thread.sectionLabel }}
        </span>
        <span>
          <Icon name="i-ph-eye-duotone" />
          {{ thread.views }}
        </span>
        <span>
          <Icon name="i-ph-clock-duotone" />
          {{ thread.createdAt }}
        </span>
      </div>
    </section>

    <section class="forum-thread-detail__card">
      <div class="forum-thread-detail__reply-head">
        <div>
          <p>{{ t("pages.forumPage.repliesLabel") }}</p>
          <h3>{{ t("pages.forumPage.repliesTitle") }}</h3>
        </div>
        <span>{{ replies.length }}</span>
      </div>

      <UAlert
        v-if="statusAlert"
        :color="statusAlert.color"
        variant="subtle"
        :icon="statusAlert.icon"
        :title="statusAlert.title"
        :description="statusAlert.description"
        class="forum-thread-detail__alert"
        aria-live="polite"
      />

      <UAlert
        v-if="!thread"
        class="forum-thread-detail__alert"
        color="neutral"
        variant="subtle"
        icon="i-ph-chat-circle-dots-fill"
        :title="t('pages.forumPage.detailEmptyTitle')"
        :description="t('pages.forumPage.detailEmptyDescription')"
      />

      <UAlert
        v-else-if="replies.length === 0"
        class="forum-thread-detail__alert"
        color="neutral"
        variant="subtle"
        icon="i-ph-chat-dots-bold"
        :title="t('pages.forumPage.repliesEmptyTitle')"
        :description="t('pages.forumPage.repliesEmptyDescription')"
      />

      <div v-else class="forum-thread-detail__replies" role="list" aria-live="polite">
        <article v-for="reply in replies" :key="reply.id" class="forum-thread-detail__reply" role="listitem">
          <div class="forum-thread-detail__avatar">
            <img v-if="reply.authorAvatarUrl" :src="reply.authorAvatarUrl" :alt="reply.author" loading="lazy">
            <span v-else>{{ reply.initials }}</span>
          </div>
          <div class="forum-thread-detail__reply-content">
            <div class="forum-thread-detail__reply-meta">
              <strong>{{ reply.author }}</strong>
              <span>{{ reply.role }}</span>
              <UBadge v-if="reply.accepted" color="success" variant="soft" class="forum-thread-detail__accepted">
                {{ t("pages.forumPage.acceptedLabel") }}
              </UBadge>
            </div>
            <p>{{ reply.message }}</p>
            <time>{{ reply.time }}</time>
          </div>
        </article>
      </div>

      <UForm :state="{ message }" class="forum-thread-detail__form" @submit="submit">
        <UFormField
          name="message"
          :label="t('pages.forumPage.replyFieldLabel')"
          :error="fieldError || undefined"
        >
          <UTextarea
            v-model="message"
            autoresize
            :rows="4"
            :disabled="isBusy || !thread"
            :placeholder="t('pages.forumPage.replyPlaceholder')"
            color="primary"
            class="forum-thread-detail__textarea"
            :ui="{
              base: 'min-h-[112px] resize-y rounded-[12px] border-[#e2e8f0] bg-[#fafbfe] px-3 py-3 text-[13px] leading-6 text-[#334155] placeholder:text-[#94a3b8]',
            }"
          />
        </UFormField>

        <div class="forum-thread-detail__actions">
          <p>{{ t("pages.forumPage.replyHelper", { count: message.trim().length }) }}</p>
          <UButton
            type="submit"
            color="primary"
            :loading="isBusy"
            :disabled="isBusy || !thread || message.trim().length === 0"
          >
            <Icon name="i-ph-paper-plane-tilt-fill" />
            {{ t("pages.forumPage.replySubmit") }}
          </UButton>
        </div>
      </UForm>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { ForumReply, ForumThread } from "../../domain/types/forum.types"

type ReplySubmitStatus = "idle" | "loading" | "success" | "error"

const props = defineProps<{
  thread: ForumThread | null
  replies: ReadonlyArray<ForumReply>
  statusLabel: string
  submitting?: boolean
}>()

const { t } = useI18n()

const emit = defineEmits<{
  reply: [message: string]
}>()

const message = ref("")
const fieldError = ref("")
const submitStatus = ref<ReplySubmitStatus>("idle")

const isBusy = computed(() => submitStatus.value === "loading" || props.submitting)

const statusAlert = computed(() => {
  if (submitStatus.value === "idle") return null

  if (submitStatus.value === "loading") {
    return {
      color: "primary" as const,
      icon: "i-ph-spinner-gap-bold",
      title: t("pages.forumPage.replyStatusLoadingTitle"),
      description: t("pages.forumPage.replyStatusLoadingDescription"),
    }
  }

  if (submitStatus.value === "success") {
    return {
      color: "success" as const,
      icon: "i-ph-check-circle-fill",
      title: t("pages.forumPage.replyStatusSuccessTitle"),
      description: t("pages.forumPage.replyStatusSuccessDescription"),
    }
  }

  return {
    color: "warning" as const,
    icon: "i-ph-warning-circle-fill",
    title: t("pages.forumPage.replyStatusErrorTitle"),
    description: t("pages.forumPage.replyStatusErrorDescription"),
  }
})

watch(
  () => props.thread?.id,
  () => {
    message.value = ""
    fieldError.value = ""
    submitStatus.value = "idle"
  },
  { immediate: true },
)

watch(message, () => {
  fieldError.value = ""

  if (submitStatus.value !== "loading") {
    submitStatus.value = "idle"
  }
})

async function submit() {
  const value = message.value.trim()

  if (!props.thread || value.length < 8) {
    fieldError.value = t("pages.forumPage.replyFieldError")
    submitStatus.value = "error"
    return
  }

  emit("reply", value)
  message.value = ""
  fieldError.value = ""
  submitStatus.value = "idle"
}
</script>

<style scoped>
.forum-thread-detail {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
}

.forum-thread-detail__card {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  background: #ffffff;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.forum-thread-detail__header p,
.forum-thread-detail__reply-head p {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.forum-thread-detail__header h2 {
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: #0f172a;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.35;
}

.forum-thread-detail__header span {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.forum-thread-detail__body {
  margin-top: 12px;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  white-space: pre-line;
}

.forum-thread-detail__meta {
  display: grid;
  gap: 7px;
  margin-top: 14px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.forum-thread-detail__meta span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.forum-thread-detail__meta :deep(svg) {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: #0000ff;
}

.forum-thread-detail__reply-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.forum-thread-detail__reply-head h3 {
  margin-top: 4px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
}

.forum-thread-detail__reply-head > span {
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  padding: 4px 9px;
  color: #0000ff;
  font-size: 12px;
  font-weight: 700;
}

.forum-thread-detail__alert {
  margin-top: 12px;
  border-radius: 12px;
}

.forum-thread-detail__replies {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.forum-thread-detail__reply {
  display: flex;
  gap: 10px;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  background: #fafbfe;
  padding: 12px;
}

.forum-thread-detail__avatar {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(145deg, #3333ff 0%, #0000ff 100%);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.forum-thread-detail__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.forum-thread-detail__reply-content {
  min-width: 0;
}

.forum-thread-detail__reply-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.forum-thread-detail__reply-meta strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 700;
}

.forum-thread-detail__reply-meta span,
.forum-thread-detail__reply-content time {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
}

.forum-thread-detail__accepted {
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.forum-thread-detail__reply-content p {
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
  white-space: pre-line;
}

.forum-thread-detail__reply-content time {
  display: block;
  margin-top: 4px;
}

.forum-thread-detail__form {
  margin-top: 16px;
}

.forum-thread-detail__textarea {
  width: 100%;
}

.forum-thread-detail__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.forum-thread-detail__actions p {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.forum-thread-detail__actions :deep(button) {
  justify-content: center;
  border-radius: 12px;
}

.forum-thread-detail__actions :deep(svg) {
  width: 16px;
  height: 16px;
}

@media (min-width: 720px) {
  .forum-thread-detail__actions {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
