<!-- Description: Renders one backend-provided feed comment with media, reactions, and inline reply actions for feed and lightbox surfaces. -->
<template>
  <article class="comment-item">
    <NuxtLink v-if="authorPath" :to="authorPath" class="comment-item__avatar" :aria-label="author">
      <img
        v-if="authorAvatarUrl"
        :src="authorAvatarUrl"
        :alt="author"
        class="comment-item__avatar-img"
      >
      <span v-else-if="initials">{{ initials }}</span>
      <Icon v-else name="i-ph-user-circle-fill" class="h-5 w-5" />
    </NuxtLink>
    <div v-else class="comment-item__avatar" aria-hidden="true">
      <img
        v-if="authorAvatarUrl"
        :src="authorAvatarUrl"
        :alt="author"
        class="comment-item__avatar-img"
      >
      <span v-else-if="initials">{{ initials }}</span>
      <Icon v-else name="i-ph-user-circle-fill" class="h-5 w-5" />
    </div>

    <div class="comment-item__body">
      <div class="comment-item__bubble">
        <div class="comment-item__meta">
          <NuxtLink v-if="authorPath" :to="authorPath" class="comment-item__author">
            {{ author }}
          </NuxtLink>
          <p v-else class="comment-item__author">{{ author }}</p>
          <span v-if="visibleRole" class="comment-item__role">{{ visibleRole }}</span>
        </div>
        <p v-if="text" class="comment-item__text">
          <template v-for="segment in textSegments" :key="segment.key">
            <span :class="{ 'comment-item__mention': segment.isMention }">{{ segment.text }}</span>
          </template>
        </p>
        <NuxtImg
          v-if="attachment && attachment.type !== 'audio'"
          :src="attachment.url"
          :alt="attachment.name || text || author"
          class="comment-item__image"
          loading="lazy"
          sizes="240px"
        />
        <div v-else-if="attachment" class="comment-item__audio-player">
          <audio
            ref="audioRef"
            class="comment-item__audio-native"
            :src="attachment.url"
            preload="metadata"
            @loadedmetadata="syncAudioState"
            @timeupdate="syncAudioState"
            @ended="stopAudio"
          />
          <button
            class="comment-item__audio-toggle"
            type="button"
            :aria-label="audioPlaying ? 'Stop voice comment' : 'Play voice comment'"
            @click="toggleAudio"
          >
            <Icon :name="audioPlaying ? 'i-ph-stop-fill' : 'i-ph-play-fill'" class="h-3.5 w-3.5" />
          </button>
          <div class="comment-item__audio-track">
            <div class="comment-item__audio-meta">
              <span class="comment-item__audio-title">{{ attachment.name || t("feed.commentComposer.tooltipVoice") }}</span>
              <span class="comment-item__audio-time">{{ audioProgressLabel }}</span>
            </div>
            <div class="comment-item__audio-progress" aria-hidden="true">
              <span class="comment-item__audio-progress-bar" :style="{ width: `${audioProgressPercent}%` }" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="time || (enableReaction && id) || enableReply" class="comment-item__footer">
        <span v-if="time">{{ time }}</span>

        <div
          v-if="enableReaction"
          class="comment-item__reaction-action"
          @mouseenter="openReactionTray"
          @mouseleave="closeReactionTray"
          @focusin="openReactionTray"
          @focusout="closeReactionTray"
        >
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="opacity-0 translate-y-2 scale-95"
          >
            <div
              v-if="reactionTrayOpen"
              class="comment-item__reaction-tray"
              @click.stop
              @pointerdown.stop
            >
              <button
                v-for="(reaction, reactionIndex) in reactionOptions"
                :key="reaction.value"
                type="button"
                class="comment-item__reaction-option"
                :class="{ 'comment-item__reaction-option--active': localSelectedReaction === reaction.value }"
                :style="{ '--reaction-index': String(reactionIndex) }"
                :aria-label="reaction.label"
                @click="reactToComment(reaction.value)"
              >
                <img
                  :src="reaction.src"
                  :alt="reaction.label"
                  class="comment-item__reaction-option-image"
                  draggable="false"
                >
              </button>
            </div>
          </Transition>

          <button
            type="button"
            class="comment-item__footer-action"
            :class="{ 'comment-item__footer-action--active': Boolean(localSelectedReaction) }"
            :disabled="reacting || !id"
            @pointerdown="startReactionPress"
            @pointerup="finishReactionPress"
            @pointerleave="cancelReactionPress"
            @pointercancel="cancelReactionPress"
            @click="handleReactionButtonClick"
          >
            <img
              v-if="localSelectedReaction"
              :src="activeReactionAsset.src"
              :alt="activeReactionLabel"
              class="comment-item__footer-reaction-image"
              draggable="false"
            >
            <Icon v-else name="i-ph-thumbs-up" class="h-3.5 w-3.5" />
            <span>{{ localSelectedReaction ? activeReactionLabel : t("feed.postCard.like") }}</span>
            <span v-if="localReactionsCount > 0" class="comment-item__footer-count">{{ localReactionsCount }}</span>
          </button>
        </div>

        <button
          v-if="enableReply"
          type="button"
          class="comment-item__footer-action comment-item__reply-toggle"
          @click="toggleReplyThread"
        >
          <Icon name="i-ph-arrow-bend-up-left" class="h-3.5 w-3.5" />
          <span>{{ replyActionLabel }}</span>
        </button>
      </div>

      <div v-if="enableReply && replyThreadOpen" class="comment-item__replies">
        <div v-if="replyLoading" class="comment-item__reply-loading">
          <Icon name="i-ph-circle-notch-bold" class="h-4 w-4 animate-spin" />
          <span>{{ t("feed.commentList.loadMore") }}</span>
        </div>

        <div v-else-if="replyItems.length > 0" class="comment-item__reply-list">
          <CommentItem
            v-for="reply in replyItems"
            :key="reply.id"
            :id="reply.id"
            :author="reply.author"
            :author-avatar-url="reply.authorAvatarUrl"
            :author-path="reply.authorPath"
            :role="reply.role"
            :text="reply.text"
            :time="reply.time"
            :attachment="reply.attachment"
            :reactions-count="reply.reactionsCount"
            :selected-reaction="reply.selectedReaction"
            :replies="reply.replies"
            :replies-count="reply.repliesCount"
            :enable-reply="false"
            :enable-reaction="enableReaction"
            :comment-action-repository="commentActionRepository"
            reaction-target="reply"
          />
        </div>

        <FeedCommentComposer
          :current-user-name="currentUserName"
          :current-user-avatar-url="currentUserAvatarUrl"
          :submitting="replySubmitting"
          :enable-attachments="false"
          @submit="submitReply"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useFeedCommentItemVM } from "../../application/view-models/useFeedCommentItemVM"
import type { FeedCommentActionRepository } from "../../application/view-models/useFeedCommentItemVM"
import { createMentionSegments } from "../../application/utils/feed-mentions"
import type { FeedStoryReactionType } from "../../domain/constants/story-reactions"
import type { FeedCommentAttachment, FeedCommentRecord, FeedCommentSubmitPayload } from "../../domain/types/feed.types"
import FeedCommentComposer from "./CommentComposer.vue"

const { t } = useI18n()
const audioRef = ref<HTMLAudioElement | null>(null)
const audioPlaying = ref(false)
const audioCurrentTime = ref(0)
const audioDuration = ref(0)

const props = withDefaults(defineProps<{
  id?: number
  author: string
  authorAvatarUrl?: string
  authorPath?: string
  role: string
  text: string
  time?: string
  attachment?: FeedCommentAttachment
  reactionsCount?: number
  selectedReaction?: FeedStoryReactionType | null
  replies?: FeedCommentRecord[]
  repliesCount?: number
  enableReply?: boolean
  enableReaction?: boolean
  currentUserName?: string
  currentUserAvatarUrl?: string
  reactionTarget?: "comment" | "reply"
  commentActionRepository?: FeedCommentActionRepository
}>(), {
  enableReaction: true,
})

const {
  replyThreadOpen,
  replyLoading,
  replySubmitting,
  reactionTrayOpen,
  reacting,
  replyItems,
  localSelectedReaction,
  localReactionsCount,
  initials,
  reactionOptions,
  replyActionLabel,
  activeReactionAsset,
  activeReactionLabel,
  openReactionTray,
  closeReactionTray,
  startReactionPress,
  finishReactionPress,
  cancelReactionPress,
  handleReactionButtonClick,
  toggleReplyThread,
  reactToComment,
  submitReply,
} = useFeedCommentItemVM(props, props.commentActionRepository)

const visibleRole = computed(() =>
  props.role && props.role !== props.author ? props.role : "",
)
const textSegments = computed(() =>
  createMentionSegments(props.text),
)
const audioProgressPercent = computed(() => {
  if (!audioDuration.value) {
    return 0
  }

  return Math.min(100, Math.max(0, (audioCurrentTime.value / audioDuration.value) * 100))
})
const audioProgressLabel = computed(() => {
  const current = formatAudioDuration(audioCurrentTime.value)
  const duration = formatAudioDuration(audioDuration.value)

  return `${current} / ${duration}`
})

function formatAudioDuration(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

function syncAudioState() {
  const audio = audioRef.value

  if (!audio) {
    return
  }

  audioCurrentTime.value = audio.currentTime || 0
  audioDuration.value = Number.isFinite(audio.duration) ? audio.duration : 0
}

function stopAudio() {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
  }

  audioPlaying.value = false
  audioCurrentTime.value = 0
}

async function toggleAudio() {
  const audio = audioRef.value

  if (!audio) {
    return
  }

  if (audioPlaying.value) {
    stopAudio()
    return
  }

  try {
    if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load()
    }

    audioPlaying.value = true
    await audio.play()
    syncAudioState()
  }
  catch {
    audioPlaying.value = false
  }
}

onBeforeUnmount(() => {
  stopAudio()
})

</script>

<style scoped>
.comment-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.comment-item__avatar {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bg-surface-active);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
}

.comment-item__avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-item__body {
  min-width: 0;
  flex: 1;
}

.comment-item__bubble {
  display: inline-block;
  max-width: min(100%, 720px);
  border-radius: 18px;
  background: var(--bg-surface-hover);
  padding: 9px 12px;
}

.comment-item__meta {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 7px;
}

.comment-item__author {
  margin: 0;
  min-width: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  text-decoration: none;
}

.comment-item__author:hover {
  text-decoration: underline;
}

.comment-item__role {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-item__text {
  margin: 3px 0 0;
  color: var(--text-primary);
  font-size: 13.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-item__mention {
  color: #1420ff;
  font-weight: 600;
}

.comment-item__image {
  display: block;
  width: min(240px, 100%);
  max-height: 260px;
  margin-top: 8px;
  border-radius: 14px;
  object-fit: cover;
}

.comment-item__audio-player {
  display: flex;
  width: min(320px, 100%);
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  color-scheme: light;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  padding: var(--space-2);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
}

.comment-item__audio-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.comment-item__audio-toggle {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--bg-brand);
  color: var(--icon-inverse);
  cursor: pointer;
  box-shadow: var(--shadow-brand);
  transition: transform var(--duration-fast) var(--ease-default), background var(--duration-fast) var(--ease-default);
}

.comment-item__audio-toggle:hover {
  background: var(--bg-brand-hover);
  transform: translateY(-1px);
}

.comment-item__audio-track {
  min-width: 0;
  flex: 1;
}

.comment-item__audio-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-2);
}

.comment-item__audio-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--text-caption);
  font-weight: var(--weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-item__audio-time {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: var(--text-label);
  font-weight: var(--weight-bold);
  font-variant-numeric: tabular-nums;
}

.comment-item__audio-progress {
  width: 100%;
  height: 5px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-surface-active);
}

.comment-item__audio-progress-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--bg-brand);
  transition: width var(--duration-fast) linear;
}

.comment-item__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 4px 0 0 12px;
  color: var(--text-tertiary);
  font-size: 11.5px;
  font-weight: 600;
}

.comment-item__reaction-action {
  position: relative;
}

.comment-item__reaction-tray {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  background: var(--bg-surface);
  padding: 6px 8px;
  box-shadow: var(--shadow-md);
  transform-origin: 22px 100%;
  animation: comment-reaction-tray-in 0.16s ease-out both;
  will-change: transform, opacity;
}

.comment-item__reaction-option {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s ease, background 0.15s ease;
  will-change: transform;
}

.comment-item__reaction-option:hover,
.comment-item__reaction-option:focus-visible,
.comment-item__reaction-option--active {
  background: var(--bg-surface-hover);
  transform: translateY(-6px) scale(1.14);
}

.comment-item__reaction-option-image {
  width: 22px;
  height: 22px;
  object-fit: contain;
  pointer-events: none;
}

@keyframes comment-reaction-tray-in {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 520px) {
  .comment-item__reaction-tray {
    gap: 3px;
    padding: 7px 8px;
    box-shadow: 0 10px 26px rgba(15, 23, 42, 0.14);
  }

  .comment-item__reaction-option {
    width: 32px;
    height: 32px;
  }

  .comment-item__reaction-option:hover,
  .comment-item__reaction-option:focus-visible,
  .comment-item__reaction-option--active {
    transform: translateY(-4px) scale(1.1);
  }

  .comment-item__reaction-option-image {
    width: 24px;
    height: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comment-item__reaction-tray {
    animation: none;
  }
}

.comment-item__footer-action {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  padding: 5px 8px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: color 0.15s ease;
}

.comment-item__footer-action > * {
  pointer-events: none;
}

.comment-item__footer-action:hover,
.comment-item__footer-action--active {
  background: rgba(0, 0, 255, 0.05);
  color: var(--text-brand);
}

.comment-item__footer-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.comment-item__footer-reaction-image {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.comment-item__footer-count {
  color: var(--text-tertiary);
}

.comment-item__replies {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid rgba(37, 99, 235, 0.12);
}

.comment-item__reply-loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.comment-item__reply-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}
</style>
