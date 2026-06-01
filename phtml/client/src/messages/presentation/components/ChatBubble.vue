<!-- Description: Renders one normalized message bubble with a PHP-style chat rhythm while keeping the current backend-backed message formats. -->
<template>
  <div
    class="flex w-full flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 chat-bubble__container"
    :class="{ 'chat-bubble__container--mine': isMine }"
  >
    <div v-if="showTime" class="my-3 self-center sm:my-4">
      <span class="rounded-full bg-[#f6f6f6] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8e8e93] border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {{ time }}
      </span>
    </div>

    <div class="flex w-full items-end gap-2.5" :class="isMine ? 'justify-end' : 'justify-start'">
      <div v-if="!isMine" class="mb-0.5 shrink-0 self-end">
        <button
          v-if="isLast && avatar"
          type="button"
          class="chat-bubble__avatar-button"
          @click.stop="emit('avatar-click', $event)"
        >
          <UChip
            :show="Boolean(senderIsOnline)"
            position="bottom-right"
            color="success"
            :ui="{ base: '!bg-emerald-500' }"
            inset
          >
            <UAvatar
              :src="avatar"
              size="xs"
              class="ring-1 ring-white shadow-sm chat-bubble__avatar"
            />
          </UChip>
        </button>
        <div v-else class="w-8" />
      </div>

      <div
        class="group relative w-fit max-w-[84%] sm:max-w-[74%] lg:max-w-[42rem] chat-bubble__wrapper"
        :title="timelineTitle"
      >
        <div
          v-if="replyTitle || replyQuote"
          class="chat-bubble__reply"
          :class="{ 'chat-bubble__reply--mine': isMine }"
        >
          <div v-if="replyTitle" class="chat-bubble__reply-title">
            <Icon name="i-ph-arrow-bend-up-left-fill" class="h-3.5 w-3.5" />
            <span>{{ replyTitle }}</span>
          </div>
          <NuxtImg
            v-if="replyMediaUrl"
            :src="replyMediaUrl"
            :alt="replyQuote || replyTitle || 'Reply image'"
            class="chat-bubble__reply-image"
          />
          <div v-else-if="replyQuote" class="chat-bubble__reply-quote">
            {{ replyQuote }}
          </div>
        </div>

        <div
          v-if="callLog"
          class="chat-bubble__call-card"
          :class="{ 'chat-bubble__call-card--missed': isMissedCallLog }"
        >
          <div class="chat-bubble__call-head">
            <UButton
              :icon="callIcon"
              color="neutral"
              variant="outline"
              size="xl"
              square
              class="chat-bubble__call-icon-btn"
              tabindex="-1"
            />
            <div class="chat-bubble__call-copy">
              <p class="chat-bubble__call-title">
                {{ callTitle }}
              </p>
              <p class="chat-bubble__call-subtitle">
                {{ callSubtitle }}
              </p>
            </div>
          </div>
          <UButton
            color="neutral"
            variant="outline"
            size="xl"
            block
            class="chat-bubble__call-again"
            @click="emit('retry-call', callActionPayload)"
          >
            {{ callButtonLabel }}
          </UButton>
        </div>

        <div
          v-else
          class="chat-bubble relative whitespace-pre-wrap px-4 py-3 text-[15px] leading-relaxed shadow-sm transition-all duration-300"
          :class="[
            isDeleted ? 'chat-bubble--deleted' : '',
            isMine
              ? 'chat-bubble--mine text-white'
              : 'chat-bubble--theirs text-[var(--text-primary)] border border-slate-100'
          ]"
        >
          <p v-if="showAuthor && authorName" class="chat-bubble__author">{{ authorName }}</p>
          <p v-if="text" class="whitespace-pre-wrap">{{ text }}</p>

          <div v-if="mediaUrl" :class="text || callLog ? 'mt-2.5' : ''">
            <NuxtImg
              v-if="mediaType === 'image' || mediaType === 'gif'"
              :src="mediaUrl"
              :alt="mediaName || text || 'Message media'"
              class="max-h-[360px] rounded-[10px] object-contain bg-white border border-slate-100 p-1"
            />
            <video
              v-else-if="mediaType === 'video'"
              :src="mediaUrl"
              class="max-h-[360px] rounded-[10px]"
              controls
              playsinline
            />
            <audio
              v-else-if="mediaType === 'audio' || mediaType === 'record'"
              :src="mediaUrl"
              class="min-w-[240px] rounded-[10px]"
              controls
              preload="none"
            />
            <a
              v-else
              :href="mediaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-[8px] bg-black/5 px-3 py-2 text-sm font-medium"
            >
              <Icon name="i-ph-paperclip-duotone" class="h-4 w-4" />
              <span>{{ mediaName || mediaUrl }}</span>
            </a>
          </div>
        </div>

        <span v-if="reactionSrc" class="chat-bubble__reaction">
          <img
            :src="reactionSrc"
            :alt="reactionAlt || ''"
            draggable="false"
          >
        </span>

        <div v-if="showTools" class="chat-bubble__message-tools">
          <span class="chat-bubble__message-tool-wrap">
            <button
              type="button"
              class="chat-bubble__message-tool"
              :title="reactTitle"
              @click="emit('toggle-reaction-picker')"
            >
              <Icon name="i-ph-smiley-duotone" class="h-3.5 w-3.5" />
            </button>
            <div
              v-if="reactionPickerOpen"
              class="chat-bubble__reaction-picker"
              :class="{ 'chat-bubble__reaction-picker--mine': isMine }"
            >
              <button
                v-for="reaction in reactionOptions"
                :key="reaction.value"
                type="button"
                class="chat-bubble__reaction-option"
                :title="reaction.label"
                @click="emit('select-reaction', reaction)"
              >
                <img :src="reaction.src" :alt="reaction.label" draggable="false">
              </button>
            </div>
          </span>
          <button
            type="button"
            class="chat-bubble__message-tool"
            :title="replyTitleLabel"
            @click="emit('reply')"
          >
            <Icon name="i-ph-arrow-bend-up-left-bold" class="h-3.5 w-3.5" />
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="chat-bubble__message-tool chat-bubble__message-tool--danger"
            :title="deleteTitle"
            @click="emit('delete')"
          >
            <Icon name="i-ph-trash-duotone" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageCallLogAction } from "../../domain/types/calls.types"
import type { FeedStoryReactionType } from "../../../feed/domain/constants/story-reactions"

type ChatBubbleReactionOption = {
  value: FeedStoryReactionType
  src: string
  label: string
}

const props = defineProps<{
  text: string
  isMine: boolean
  isLast?: boolean
  showAuthor?: boolean
  time?: string
  showTime?: boolean
  avatar?: string
  senderIsOnline?: boolean
  authorName?: string
  timelineTitle?: string
  replyTitle?: string
  replyQuote?: string
  replyMediaUrl?: string
  reactionSrc?: string
  reactionAlt?: string
  showTools?: boolean
  reactionPickerOpen?: boolean
  reactionOptions?: ChatBubbleReactionOption[]
  reactTitle?: string
  replyTitleLabel?: string
  deleteTitle?: string
  canDelete?: boolean
  isDeleted?: boolean
  mediaUrl?: string
  mediaName?: string
  mediaType?: "image" | "video" | "audio" | "gif" | "file" | "record"
  callLog?: {
    type: "audio" | "video"
    status: string
    duration?: number
    callId?: number
    groupId?: number
    isGroup?: boolean
    isActive?: boolean
    participantCount?: number
  }
}>()

const emit = defineEmits<{
  "retry-call": [payload: MessageCallLogAction]
  "avatar-click": [event: MouseEvent]
  "toggle-reaction-picker": []
  "select-reaction": [reaction: ChatBubbleReactionOption]
  "reply": []
  "delete": []
}>()

const { t } = useI18n()

const isMissedCallLog = computed(() => {
  if (!props.callLog) {
    return false
  }

  return !props.isMine && (props.callLog.status === "no_answer" || props.callLog.status === "missed")
})

const callTitle = computed(() => {
  if (!props.callLog) {
    return ""
  }

  const call = props.callLog.type === "video"
    ? t("pages.messagesPage.callLogVideo")
    : t("pages.messagesPage.callLogAudio")

  if (props.callLog.status === "no_answer" || props.callLog.status === "missed") {
    return props.isMine
      ? t("pages.messagesPage.callLogNoAnswer", { call })
      : t("pages.messagesPage.callLogMissed", { call })
  }

  if (props.callLog.status === "cancelled") {
    return t("pages.messagesPage.callLogCancelled", { call })
  }

  if (props.callLog.status === "declined") {
    return props.isMine
      ? t("pages.messagesPage.callLogRecipientDeclined", { call })
      : t("pages.messagesPage.callLogDeclined", { call })
  }

  return call
})

const callIcon = computed(() => {
  if (!props.callLog) {
    return "i-ph-phone-x-bold"
  }

  if (props.callLog.status === "no_answer" || props.callLog.status === "missed") {
    return "i-ph-phone-x-bold"
  }

  return props.callLog.type === "video"
    ? "i-ph-video-camera-fill"
    : "i-ph-phone-call-fill"
})

const callDurationLabel = computed(() => {
  const seconds = Math.max(0, Math.floor(props.callLog?.duration ?? 0))

  if (seconds <= 0) {
    return ""
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return t("pages.messagesPage.callLogDurationHours", {
      hours,
      minutes,
    })
  }

  if (minutes > 0) {
    return remainingSeconds > 0
      ? t("pages.messagesPage.callLogDurationMinutesSeconds", {
          minutes,
          seconds: remainingSeconds,
        })
      : t("pages.messagesPage.callLogDurationMinutes", {
          minutes,
        })
  }

  return t("pages.messagesPage.callLogDurationSeconds", {
    seconds: remainingSeconds,
  })
})

const callSubtitle = computed(() => {
  if (props.callLog?.isGroup && props.callLog.isActive && props.callLog.participantCount) {
    return t("pages.messagesPage.groupCallActiveParticipants", {
      count: props.callLog.participantCount,
    })
  }

  if (callDurationLabel.value) {
    return callDurationLabel.value
  }

  return props.time || ""
})

const callActionPayload = computed<MessageCallLogAction>(() => ({
  type: props.callLog?.type ?? "video",
  action: props.callLog?.isGroup && props.callLog.isActive && props.callLog.callId ? "join" : "start",
  callId: props.callLog?.callId,
  groupId: props.callLog?.groupId,
}))

const callButtonLabel = computed(() =>
  callActionPayload.value.action === "join"
    ? t("pages.messagesPage.callLogJoin")
    : t("pages.messagesPage.callLogRetry"),
)

const reactionOptions = computed(() => props.reactionOptions ?? [])
const reactTitle = computed(() => props.reactTitle || t("navigation.chatWidget.reactToMessage"))
const replyTitleLabel = computed(() => props.replyTitleLabel || t("navigation.chatWidget.replyMessage"))
const deleteTitle = computed(() => props.deleteTitle || t("navigation.chatWidget.deleteMessage"))
</script>

<style scoped>
.chat-bubble {
  font-family: var(--font-primary), sans-serif;
  font-weight: 400;
}

.chat-bubble__author {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #64748b;
}

.chat-bubble--mine {
  background: var(--bg-brand, #a84849);
  border-radius: 18px 18px 6px 18px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.chat-bubble--theirs {
  background: #f1f0f0;
  border-radius: 18px 18px 18px 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.chat-bubble--deleted {
  color: #737373 !important;
  font-style: italic;
  background: #f4f4f5 !important;
  border: 1px solid #e4e4e7 !important;
}

.chat-bubble__call-card {
  width: min(250px, 74vw);
  border-radius: 18px;
  background: #f1f1f1;
  padding: 14px 14px 12px;
}

.chat-bubble__call-head {
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 10px;
  align-items: center;
}

.chat-bubble__call-icon-btn {
  width: 44px !important;
  height: 44px !important;
  border-radius: 999px !important;
  color: #050505 !important;
  background: #e2e5e9 !important;
  pointer-events: none;
}

.chat-bubble__call-card--missed .chat-bubble__call-icon-btn {
  color: #dc2626 !important;
  background: #fee2e2 !important;
  border-color: #fecaca !important;
}

.chat-bubble__call-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.chat-bubble__call-title {
  color: #050505;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.08;
}

.chat-bubble__call-card--missed .chat-bubble__call-title,
.chat-bubble__call-card--missed .chat-bubble__call-subtitle {
  color: #dc2626;
}

.chat-bubble__call-subtitle {
  color: #65676b;
  font-size: 14px;
  font-weight: 450;
  line-height: 1.12;
  padding: 5px 0 5px 0;
}

.chat-bubble__call-again {
  margin-top: 12px;
  min-height: 44px;
  border-radius: 8px !important;
  background: #868687 !important;
  color: #050505 !important;
  font-size: 18px !important;
  font-weight: 650 !important;
}

.chat-bubble__call-card--missed .chat-bubble__call-again {
  background: #dc2626 !important;
  color: #ffffff !important;
  border-color: #dc2626 !important;
}

.chat-bubble__call-again:hover {
  background: #d8dce2 !important;
}

.chat-bubble__call-card--missed .chat-bubble__call-again:hover {
  background: #b91c1c !important;
  border-color: #b91c1c !important;
}

.chat-bubble__avatar {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50%;
  border: none;
}

.chat-bubble__avatar-button {
  display: inline-flex;
  border: none;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.chat-bubble__wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chat-bubble__container--mine .chat-bubble__wrapper {
  align-items: flex-end;
}

.chat-bubble__reply {
  display: flex;
  max-width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  margin: 0 0 2px;
  color: #65676b;
}

.chat-bubble__reply--mine {
  align-items: flex-end;
}

.chat-bubble__reply-title {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
}

.chat-bubble__reply-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-bubble__reply-quote {
  max-width: min(220px, 100%);
  overflow: hidden;
  border-radius: 14px;
  background: #f1f0f0;
  padding: 7px 11px;
  color: #65676b;
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-bubble__reply--mine .chat-bubble__reply-quote {
  max-width: min(220px, 100%);
}

.chat-bubble__reply-image {
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  object-fit: cover;
}

.chat-bubble__reaction {
  display: inline-flex;
  position: absolute;
  right: -8px;
  bottom: -12px;
  z-index: 60;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ffffff;
  padding: 3px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.14);
}

.chat-bubble__reaction img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.chat-bubble__container--mine .chat-bubble__reaction {
  right: auto;
  left: -8px;
}

.chat-bubble__message-tools {
  display: inline-flex;
  position: absolute;
  top: 50%;
  right: -106px;
  z-index: 50;
  align-items: center;
  gap: 3px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  padding: 3px;
  opacity: 0;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
  transform: translateY(-50%) scale(0.96);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.chat-bubble__container--mine .chat-bubble__message-tools {
  right: auto;
  left: -106px;
}

.chat-bubble__wrapper:hover .chat-bubble__message-tools,
.chat-bubble__wrapper:focus-within .chat-bubble__message-tools {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.chat-bubble__message-tool {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  transition: all 0.15s ease;
}

.chat-bubble__message-tool-wrap {
  position: relative;
  display: inline-flex;
}

.chat-bubble__message-tool:hover {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.chat-bubble__message-tool--danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.chat-bubble__reaction-picker {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 7px);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 2px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  background: #ffffff;
  padding: 5px 7px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  transform: translateX(-50%);
}

.chat-bubble__reaction-option {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  transition: background 0.15s ease, transform 0.15s ease;
}

.chat-bubble__reaction-option:hover {
  background: #f8fafc;
  transform: translateY(-2px) scale(1.08);
}

.chat-bubble__reaction-option img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
</style>

