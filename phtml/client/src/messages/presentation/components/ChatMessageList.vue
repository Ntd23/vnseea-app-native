<!-- Description: Renders the current thread stack, load-older control, and typing indicator for the active conversation shell. -->
<template>
  <div
    ref="listContainer"
    class="scrollbar-hide flex-1 min-h-0 overflow-y-auto bg-white px-4 py-5 sm:px-6"
  >
    <div class="mx-auto flex w-full flex-col gap-3" :class="threadWidthClass">
      <div v-if="messages.length > 0" class="flex justify-center pb-2">
        <UButton
          variant="soft"
          size="sm"
          class="rounded-full border border-[var(--border-light)] bg-white px-4 text-[11px] font-semibold text-[var(--text-secondary)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          @click="$emit('load-more')"
        >
          {{ $t('pages.messagesPage.loadOlder') }}
        </UButton>
      </div>

      <MessagesChatBubble
        v-for="msg in messages"
        :key="msg.id"
        v-bind="msg"
        :text="getBubbleText(msg)"
        :timeline-title="getMessageTimelineTitle(msg)"
        :reply-title="getReplyMeta(msg) && !msg.isDeleted ? getReplyTitle(msg) : undefined"
        :reply-quote="getReplyMeta(msg) && !msg.isDeleted && !getReplyMeta(msg)?.mediaUrl && !isImageFileQuote(getReplyMeta(msg)?.quote) ? getReplyMeta(msg)?.quote : undefined"
        :reply-media-url="getReplyMeta(msg) && !msg.isDeleted ? getReplyMeta(msg)?.mediaUrl : undefined"
        :reaction-src="!msg.isDeleted ? getMessageReaction(msg)?.src : undefined"
        :reaction-alt="!msg.isDeleted && getMessageReaction(msg) ? t(getMessageReaction(msg)!.labelKey) : undefined"
        :show-tools="!msg.isDeleted"
        :reaction-picker-open="activeReactionPickerId === msg.id"
        :reaction-options="bubbleReactionOptions"
        :can-delete="msg.isMine"
        :media-url="msg.isDeleted ? undefined : msg.mediaUrl"
        :media-name="msg.isDeleted ? undefined : msg.mediaName"
        :media-type="msg.isDeleted ? undefined : msg.mediaType"
        :is-deleted="msg.isDeleted"
        @retry-call="emit('retry-call', $event)"
        @toggle-reaction-picker="emit('toggle-reaction-picker', msg.id)"
        @select-reaction="emit('select-reaction', msg.id, $event.value)"
        @reply="emit('reply-message', msg)"
        @delete="emit('delete-message', msg)"
      />

      <div v-if="isPending && messages.length === 0" class="messages-thread-skeleton" aria-hidden="true">
        <div class="messages-thread-skeleton__time">
          <USkeleton class="h-[26px] w-24 rounded-full" />
        </div>
        <div
          v-for="item in skeletonMessages"
          :key="item.id"
          class="messages-thread-skeleton__row"
          :class="item.mine ? 'messages-thread-skeleton__row--mine' : 'messages-thread-skeleton__row--theirs'"
        >
          <USkeleton
            v-if="!item.mine"
            class="messages-thread-skeleton__avatar"
          />
          <div
            class="messages-thread-skeleton__bubble"
            :class="[
              item.mine ? 'messages-thread-skeleton__bubble--mine' : 'messages-thread-skeleton__bubble--theirs',
              `messages-thread-skeleton__bubble--${item.size}`,
            ]"
          >
            <USkeleton
              v-if="item.author"
              class="messages-thread-skeleton__author"
            />
            <USkeleton
              class="messages-thread-skeleton__line"
              :class="item.long ? 'messages-thread-skeleton__line--long' : 'messages-thread-skeleton__line--short'"
            />
            <USkeleton
              v-if="item.lines > 1"
              class="messages-thread-skeleton__line messages-thread-skeleton__line--full"
            />
            <USkeleton
              v-if="item.lines > 2"
              class="messages-thread-skeleton__line messages-thread-skeleton__line--half"
            />
          </div>
        </div>
      </div>

      <div v-else-if="messages.length === 0" class="rounded-[20px] border border-dashed border-[#dbe3f2] bg-white/80 px-5 py-8 text-center text-sm text-slate-500">
        {{ emptyLabel }}
      </div>

      <div v-if="isTyping" class="flex items-end gap-3 pt-2">
        <UAvatar
          v-if="contactAvatar"
          :src="contactAvatar"
          size="xs"
          class="messages-typing-avatar ring-1 ring-white shadow-sm"
        />
        <div v-else class="messages-typing-avatar-placeholder" />
        <div class="messages-typing-bubble" aria-label="Typing">
          <span class="messages-typing-dot" style="animation-delay: 0ms" />
          <span class="messages-typing-dot" style="animation-delay: 180ms" />
          <span class="messages-typing-dot" style="animation-delay: 360ms" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import {
  defaultFeedReactionAsset,
  feedReactionAssetByValue,
  feedReactionAssets,
} from "../../../feed/application/constants/reaction-assets"
import type { FeedStoryReactionType } from "../../../feed/domain/constants/story-reactions"
import type { MessageCallLogAction } from "../../domain/types/calls.types"
import type { MessageItem, MessageThreadType } from "../../domain/types/messages.types"
import {
  formatMessageClock,
  getMessageDisplayText,
  getMessageReplyMeta,
} from "../../application/utils/message-bubble-content"
import MessagesChatBubble from "./ChatBubble.vue"

const props = defineProps<{
  activeReactionPickerId?: number | null
  contactAvatar?: string
  contactType?: MessageThreadType
  emptyLabel: string
  isPending?: boolean
  isTyping?: boolean
  loadingLabel: string
  messages: MessageItem[]
}>()

const emit = defineEmits<{
  "load-more": []
  "retry-call": [payload: MessageCallLogAction]
  "toggle-reaction-picker": [messageId: number]
  "select-reaction": [messageId: number, reaction: FeedStoryReactionType]
  "reply-message": [message: MessageItem]
  "delete-message": [message: MessageItem]
}>()

const { t } = useI18n()
const listContainer = ref<HTMLElement | null>(null)
const threadWidthClass = computed(() =>
  props.contactType === "user" ? "max-w-[760px]" : "max-w-[920px]",
)
const skeletonMessages = computed(() => {
  const group = props.contactType === "group"

  return [
    { id: 1, mine: false, author: group, long: true, lines: 2, size: group ? "lg" : "md" },
    { id: 2, mine: true, author: false, long: false, lines: 1, size: "sm" },
    { id: 3, mine: false, author: group, long: false, lines: 1, size: "sm" },
    { id: 4, mine: true, author: false, long: true, lines: 3, size: "lg" },
    { id: 5, mine: false, author: group, long: true, lines: 2, size: group ? "xl" : "lg" },
  ]
})
const bubbleReactionOptions = computed(() =>
  feedReactionAssets.map(reaction => ({
    value: reaction.value,
    src: reaction.src,
    label: t(reaction.labelKey),
  })),
)

function getReplyMeta(message: MessageItem) {
  return getMessageReplyMeta(message)
}

function getMessageReaction(message: MessageItem) {
  return message.selectedReaction
    ? feedReactionAssetByValue[message.selectedReaction] ?? defaultFeedReactionAsset
    : undefined
}

function getBubbleText(message: MessageItem) {
  return getMessageDisplayText(message, {
    selfDeletedLabel: t("navigation.chatWidget.youDeletedMessage"),
    otherDeletedLabel: t("navigation.chatWidget.userDeletedMessage", {
      name: message.deletedByName || message.authorName || "",
    }),
  })
}

function getMessageTimelineTitle(message: MessageItem) {
  const sentTime = message.time || formatMessageClock(message.timestamp)
  const deletedTime = message.deletedTime || formatMessageClock(message.deletedAt)
  const lines = []

  if (sentTime) {
    lines.push(t("navigation.chatWidget.messageSentAt", { time: sentTime }))
  }

  if (message.isDeleted && deletedTime) {
    lines.push(t("navigation.chatWidget.messageDeletedAt", { time: deletedTime }))
  }

  return lines.join("\n")
}

function getReplyTitle(message: MessageItem) {
  const meta = getReplyMeta(message)
  const author = meta?.author || ""

  if (message.isMine) {
    return author
      ? t("navigation.chatWidget.youRepliedTo", { name: author })
      : t("navigation.chatWidget.youReplied")
  }

  return author
    ? t("navigation.chatWidget.userRepliedTo", { name: author })
    : t("navigation.chatWidget.userReplied")
}

function isImageFileQuote(value?: string) {
  return /\.(png|jpe?g|webp|bmp|gif)$/i.test(value || "")
}

function scrollToBottom(behavior: ScrollBehavior = "smooth") {
  if (!listContainer.value) {
    return
  }

  listContainer.value.scrollTo({
    top: listContainer.value.scrollHeight,
    behavior,
  })
}

watch(() => props.messages.length, () => {
  nextTick(() => scrollToBottom())
})

watch(() => props.isTyping, () => {
  nextTick(() => scrollToBottom())
})

onMounted(() => {
  scrollToBottom("auto")
})

defineExpose({ scrollToBottom })
</script>

<style scoped>
.messages-typing-bubble {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 20px;
  border-bottom-left-radius: 6px;
  background: #f1f0f0;
  padding: 12px 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.messages-typing-avatar,
.messages-typing-avatar-placeholder {
  width: 32px !important;
  height: 32px !important;
  border-radius: 999px !important;
  flex: 0 0 32px;
}

.messages-typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #7c8799;
  animation: messages-typing-bounce 1s infinite ease-in-out;
}

.messages-thread-skeleton {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 0 0 16px;
}

.messages-thread-skeleton__time {
  display: flex;
  justify-content: center;
  padding: 6px 0 2px;
}

.messages-thread-skeleton__row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
}

.messages-thread-skeleton__row--mine {
  justify-content: flex-end;
}

.messages-thread-skeleton__row--theirs {
  justify-content: flex-start;
}

.messages-thread-skeleton__avatar {
  width: 32px !important;
  height: 32px !important;
  flex: 0 0 32px;
  border-radius: 999px !important;
  background: #e8edf4 !important;
}

.messages-thread-skeleton__bubble {
  width: 220px;
  max-width: min(84%, 420px);
  padding: 13px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.messages-thread-skeleton__bubble--sm {
  width: 168px;
}

.messages-thread-skeleton__bubble--md {
  width: 236px;
}

.messages-thread-skeleton__bubble--lg {
  width: 308px;
}

.messages-thread-skeleton__bubble--xl {
  width: 340px;
}

.messages-thread-skeleton__bubble--mine {
  border-radius: 18px 18px 6px 18px;
  background: rgba(168, 72, 73, 0.10);
}

.messages-thread-skeleton__bubble--theirs {
  border-radius: 18px 18px 18px 6px;
  background: #f1f0f0;
}

.messages-thread-skeleton__author {
  width: 86px;
  height: 12px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: #dbe3ed !important;
}

.messages-thread-skeleton__line {
  height: 15px;
  margin-top: 0;
  border-radius: 999px;
  background: #e1e7ef !important;
}

.messages-thread-skeleton__line + .messages-thread-skeleton__line {
  margin-top: 8px;
}

.messages-thread-skeleton__line--short {
  width: 62%;
}

.messages-thread-skeleton__line--long {
  width: 78%;
}

.messages-thread-skeleton__line--full {
  width: 92%;
}

.messages-thread-skeleton__line--half {
  width: 54%;
}

@keyframes messages-typing-bounce {
  0%, 60%, 100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
</style>
