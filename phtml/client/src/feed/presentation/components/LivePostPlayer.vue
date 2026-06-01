<!-- English description: Renders a feed live post viewer surface with LiveKit join, heartbeat, reaction, share, and comment entry points. Normal feed: standard 16:9 landscape, no overlays. Fullscreen: premium TikTok-style overlay UI with action buttons, creator info, and comment form. -->
<template>
  <section class="feed-live-player">
    <div
      ref="stageElement"
      class="feed-live-player__stage"
      :class="{ 'feed-live-player__stage--fullscreen': isFullscreen }"
    >
      <div ref="stageHost" class="feed-live-player__video-host" />

      <!-- Placeholder before viewer joins -->
      <div v-if="!connected" class="feed-live-player__placeholder">
        <div class="feed-live-player__placeholder-card">
          <UIcon name="i-ph-broadcast-duotone" class="feed-live-player__placeholder-icon" />
          <p class="feed-live-player__placeholder-title">{{ statusTitle }}</p>
          <p class="feed-live-player__placeholder-copy">{{ statusCopy }}</p>
          <UButton
            v-if="canJoin"
            color="primary"
            size="lg"
            :loading="joining || connecting"
            :ui="{ base: 'rounded-full px-8 font-bold shadow-xl shadow-blue-500/30 mt-2' }"
            @click="joinLive"
          >
            {{ t("pages.livePage.viewer.joinLive") }}
          </UButton>
        </div>
      </div>

      <!-- ── TOP BAR ── -->
      <div class="feed-live-player__top-bar">
        <!-- LIVE badge -->
        <div class="feed-live-player__live-pill" :class="`feed-live-player__live-pill--${liveState}`">
          <span class="feed-live-player__pulse-dot" />
          <span>{{ stateLabel }}</span>
        </div>

        <!-- Right side: viewer count -->
        <div class="feed-live-player__top-right">
          <div class="feed-live-player__viewer-pill">
            <UIcon name="i-ph-eye-fill" class="w-3.5 h-3.5" />
            <span>{{ liveViewerCount }}</span>
          </div>

          <!-- Enter fullscreen -->
          <UButton
            v-if="false && !isFullscreen"
            icon="i-ph-arrows-out-bold"
            aria-label="Mở toàn màn hình"
            :ui="{
              base: 'w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 hover:border-white/30 active:scale-90 transition-all duration-150 flex items-center justify-center',
            }"
            @click="toggleFullscreen"
          />

          <!-- Exit fullscreen (top-right) -->
          <UButton
            v-if="false && isFullscreen"
            icon="i-ph-arrows-in-bold"
            aria-label="Thu nhỏ"
            :ui="{
              base: 'w-9 h-9 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-white/35 active:scale-90 transition-all duration-150 flex items-center justify-center shadow-lg',
            }"
            @click="toggleFullscreen"
          />
        </div>
      </div>

      <!-- ── FULLSCREEN OVERLAYS ── -->
      <button
        type="button"
        :aria-label="isFullscreen ? t('pages.livePage.viewer.exitFullscreen') : t('pages.livePage.viewer.openFullscreen')"
        class="feed-live-player__fullscreen-btn"
        @click="toggleFullscreen"
      >
        <UIcon :name="isFullscreen ? 'i-ph-arrows-in-bold' : 'i-ph-arrows-out-bold'" class="feed-live-player__fullscreen-icon" />
      </button>

      <template v-if="isFullscreen">
        <!-- Bottom gradient -->
        <div class="feed-live-player__bottom-shade" />

        <!-- Bottom-left: Creator info + music ticker -->
        <div class="feed-live-player__info-overlay">
          <div class="feed-live-player__creator-row">
            <button
              v-if="authorAvatarUrl"
              type="button"
              class="feed-live-player__creator-avatar-btn"
              :disabled="!authorUserId || followPending || followedByViewer"
              :aria-label="followedByViewer ? t('pages.livePage.viewer.followed') : t('pages.livePage.viewer.follow')"
              @click="followAuthor"
            >
              <UAvatar
                :src="authorAvatarUrl"
                :alt="author"
                size="sm"
                :ui="{ base: 'ring-2 ring-white/70' }"
              />
            </button>
            <div>
              <p class="feed-live-player__author-name">@{{ author }}</p>
              <div v-if="!followedByViewer && authorUserId" class="feed-live-player__follow-hint">
                <UIcon name="i-ph-user-plus" class="w-3 h-3" />
                <span>{{ t("pages.livePage.viewer.follow") }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Right action column: Like + Share -->
        <div class="feed-live-player__actions">
          <!-- Like / Reaction -->
          <div class="feed-live-player__action-item">
            <div
              class="feed-live-player__reaction-wrap"
              @mouseenter="openReactionTrayForHover"
              @mouseleave="closeReactionTrayForHover"
            >
              <UButton
                :aria-label="t('pages.livePage.viewer.like')"
                :ui="{
                  base: `w-12 h-12 rounded-full backdrop-blur-md border text-white flex items-center justify-center transition-all duration-150 active:scale-90 shadow-md ${reactionTrayOpen ? 'bg-rose-500 border-rose-400 shadow-rose-500/40' : 'bg-black/45 border-white/18 hover:bg-white/20 hover:border-white/35'}`,
                }"
                @click="toggleReactionTrayForPointer"
              >
                <img
                  v-if="selectedReactionAsset"
                  :src="selectedReactionAsset.src"
                  :alt="selectedReactionAsset.value"
                  draggable="false"
                  class="feed-live-player__selected-reaction"
                >
                <UIcon
                  v-else
                  :name="reactionTrayOpen ? 'i-ph-heart-fill' : 'i-ph-heart'"
                  class="h-5 w-5"
                />
              </UButton>

              <!-- Reaction tray uses shared feed reaction image assets only. -->
              <Transition name="feed-live-player__tray">
                <div v-if="reactionTrayOpen" class="feed-live-player__reaction-tray">
                  <button
                    v-for="(reaction, reactionIndex) in feedReactionAssets"
                    :key="reaction.value"
                    type="button"
                    class="feed-live-player__reaction-option"
                    :style="{ '--reaction-index': String(reactionIndex) }"
                    :aria-label="reaction.value"
                    @click="selectReaction(reaction.value)"
                  >
                    <img
                      :src="reaction.src"
                      :alt="reaction.value"
                      draggable="false"
                      class="feed-live-player__reaction-image"
                    >
                  </button>
                </div>
              </Transition>
            </div>
            <span class="feed-live-player__action-label">{{ t("pages.livePage.viewer.like") }}</span>
          </div>

          <!-- Share -->
          <div class="feed-live-player__action-item">
            <UButton
              icon="i-ph-share-fat"
              :aria-label="t('pages.livePage.viewer.share')"
              :ui="{
                base: 'w-12 h-12 rounded-full bg-black/45 backdrop-blur-md border border-white/18 text-white hover:bg-white/20 hover:border-white/35 active:scale-90 transition-all duration-150 flex items-center justify-center shadow-md',
              }"
              @click="emitAfterFullscreenExit('share')"
            />
            <span class="feed-live-player__action-label">{{ t("pages.livePage.viewer.share") }}</span>
          </div>
        </div>

        <!-- Bottom comment form -->
        <form class="feed-live-player__comment-form" @submit.prevent="submitLiveComment">
          <UInput
            v-model="commentDraft"
            :placeholder="t('pages.livePage.viewer.commentPlaceholder')"
            :disabled="commentSubmitting"
            size="lg"
            :ui="{
              base: 'rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 transition-all',
              wrapper: 'flex-1',
            }"
          />
          <UButton
            type="submit"
            icon="i-ph-paper-plane-tilt-fill"
            color="primary"
            :aria-label="t('pages.livePage.viewer.submitComment')"
            :loading="commentSubmitting"
            :disabled="!commentDraft.trim()"
            :ui="{
              base: 'w-11 h-11 rounded-full flex-shrink-0 shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all active:scale-90',
            }"
          />
        </form>

        <!-- Floating reactions -->
        <TransitionGroup name="flp-reaction" tag="div" class="feed-live-player__floating-reactions">
          <span
            v-for="r in floatingReactions"
            :key="r.id"
            class="feed-live-player__floating-reaction"
            :style="{ left: `${r.x}%` }"
          >
            <img :src="r.src" alt="" draggable="false" class="feed-live-player__floating-reaction-image">
          </span>
        </TransitionGroup>
      </template>

      <!-- Activity feed: comments visible in both modes when connected -->
      <TransitionGroup
        v-if="connected && activityItems.length > 0"
        name="flp-activity"
        tag="div"
        class="feed-live-player__activity-feed"
        :class="{ 'feed-live-player__activity-feed--fullscreen': isFullscreen }"
      >
        <div
          v-for="item in activityItems"
          :key="`${item.kind}:${item.id}:${item.message}`"
          class="feed-live-player__activity-item"
          :class="`feed-live-player__activity-item--${item.kind}`"
        >
          <UAvatar
            :src="item.avatarUrl"
            :alt="item.author"
            size="2xs"
            :ui="{ base: 'flex-shrink-0' }"
          />
          <span class="feed-live-player__activity-name">{{ item.username || item.author }}</span>
          <span v-if="item.kind === 'comment'" class="feed-live-player__activity-msg">{{ item.message }}</span>
          <span v-else-if="item.kind === 'joined'" class="feed-live-player__activity-msg feed-live-player__activity-msg--system">{{ t("pages.livePage.viewer.joinedActivity") }}</span>
          <span v-else class="feed-live-player__activity-msg feed-live-player__activity-msg--system">{{ t("pages.livePage.viewer.leftActivity") }}</span>
        </div>
      </TransitionGroup>
    </div>

    <p v-if="errorMessage || joinError" class="feed-live-player__error">
      {{ errorMessage || joinError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core"
import { feedReactionAssets } from "../../application/constants/reaction-assets"
import type { FeedStoryReactionType } from "../../domain/constants/story-reactions"
import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"
import { createApiProfileRepository } from "../../../profile/infrastructure/repositories/ApiProfileRepository"
import { createApiLiveRepository } from "../../../live/infrastructure/repositories/ApiLiveRepository"
import { useLiveKitViewer } from "../../../live/application/composables/useLiveKitViewer"
import type { LiveStudioState } from "../../../live/domain/types/live.types"

const props = defineProps<{
  postId: number
  initialState: LiveStudioState | null
  initialViewerCount?: number
  authorUserId?: number
  author?: string
  authorAvatarUrl?: string
}>()

const emit = defineEmits<{
  react: [reaction: FeedStoryReactionType]
  share: []
  comment: []
}>()

const repository = createApiLiveRepository()
const feedRepository = createApiFeedRepository()
const profileRepository = createApiProfileRepository()
const { t } = useI18n()
const stageHost = ref<HTMLElement | null>(null)
const stageElement = ref<HTMLElement | null>(null)
const liveState = ref<LiveStudioState>(props.initialState ?? "offline")
const liveViewerCount = ref(props.initialViewerCount ?? 0)
const liveReactionsCount = ref(0)
const joining = ref(false)
const joinError = ref("")
const reactionTrayOpen = ref(false)
const selectedReaction = ref<FeedStoryReactionType | null>(null)
const isFullscreen = ref(false)
const canHover = ref(false)
const commentDraft = ref("")
const commentSubmitting = ref(false)
const reactionSubmitting = ref(false)
const followPending = ref(false)
const followedByViewer = ref(false)
const activityItems = ref<import("../../../live/domain/types/live.types").LiveStudioComment[]>([])
const knownCommentIds = ref<number[]>([])
const floatingReactions = ref<{ id: number; src: string; x: number }[]>([])
let floatingReactionId = 0

const {
  connecting,
  connected,
  errorMessage,
  connect,
  setStageHost,
} = useLiveKitViewer()

watch(stageHost, element => setStageHost(element), { flush: "post", immediate: true })

const canJoin = computed(() => liveState.value !== "offline")
const stateLabel = computed(() => {
  if (liveState.value === "live") return t("pages.livePage.statusLiveUpper")
  if (liveState.value === "stale") return t("pages.livePage.viewer.reconnecting")
  return t("pages.livePage.viewer.ended")
})
const statusTitle = computed(() => {
  if (liveState.value === "offline") return t("pages.livePage.viewer.offlineTitle")
  if (liveState.value === "stale") return t("pages.livePage.viewer.staleTitle")
  return t("pages.livePage.viewer.liveTitle")
})
const statusCopy = computed(() => {
  if (liveState.value === "offline") return t("pages.livePage.viewer.offlineCopy")
  return t("pages.livePage.viewer.liveCopy")
})

const selectedReactionAsset = computed(() =>
  selectedReaction.value
    ? feedReactionAssets.find(asset => asset.value === selectedReaction.value) ?? null
    : null,
)

const { pause, resume } = useIntervalFn(refreshHeartbeat, 4000, { immediate: false })

async function joinLive() {
  if (joining.value || !canJoin.value) return

  joining.value = true
  joinError.value = ""

  try {
    const session = await repository.joinViewer(props.postId)
    liveState.value = session.streamState
    await connect(session)
    await refreshHeartbeat()
    resume()
  }
  catch (error) {
    joinError.value = error instanceof Error ? error.message : t("pages.livePage.viewer.joinError")
  }
  finally {
    joining.value = false
  }
}

async function refreshHeartbeat() {
  if (!connected.value) return

  try {
    const heartbeat = await repository.getHeartbeat(props.postId, knownCommentIds.value, "story")
    liveState.value = heartbeat.stillLive
    liveViewerCount.value = heartbeat.viewerCount

    // Track new reactions
    if (heartbeat.reactionsCount > liveReactionsCount.value) {
      const diff = heartbeat.reactionsCount - liveReactionsCount.value
      spawnFloatingReactions(diff)
    }
    liveReactionsCount.value = heartbeat.reactionsCount

    // Accumulate new comments/activity
    const nextItems = [...heartbeat.comments, ...heartbeat.joinedUsers, ...heartbeat.leftUsers]
    if (nextItems.length > 0) {
      const existingKeys = new Set(
        activityItems.value.map(i => `${i.kind}:${i.id}:${i.message}`)
      )
      const freshItems = nextItems.filter(item => {
        const key = `${item.kind}:${item.id}:${item.message}`
        if (existingKeys.has(key)) return false
        existingKeys.add(key)
        return true
      })
      if (freshItems.length > 0) {
        activityItems.value = [...activityItems.value, ...freshItems].slice(-20)
      }
    }

    // Track known comment ids
    heartbeat.comments.forEach(item => {
      if (item.id > 0 && !knownCommentIds.value.includes(item.id)) {
        knownCommentIds.value = [...knownCommentIds.value, item.id].slice(-48)
      }
    })

    if (heartbeat.stillLive === "offline") {
      pause()
    }
  }
  catch {
    pause()
  }
}

function spawnFloatingReactions(count: number) {
  const toAddFromAssets = Math.min(count, 5)
  for (let i = 0; i < toAddFromAssets; i++) {
    const asset = feedReactionAssets[Math.floor(Math.random() * feedReactionAssets.length)] ?? feedReactionAssets[0]
    spawnFloatingReaction(asset.src)
  }
}

function spawnFloatingReaction(src: string) {
  const id = ++floatingReactionId
  floatingReactions.value.push({
    id,
    src,
    x: 20 + Math.random() * 60,
  })
  setTimeout(() => {
    floatingReactions.value = floatingReactions.value.filter(r => r.id !== id)
  }, 2200)
}

async function selectReaction(reaction: FeedStoryReactionType) {
  if (reactionSubmitting.value) {
    return
  }

  reactionSubmitting.value = true
  selectedReaction.value = reaction
  reactionTrayOpen.value = false
  const asset = feedReactionAssets.find(item => item.value === reaction)
  if (asset) {
    spawnFloatingReaction(asset.src)
  }

  try {
    try {
      await feedRepository.runPostAction({
        action: "reaction",
        postId: props.postId,
        reaction,
      })
    }
    catch {
      await feedRepository.runPostAction({
        action: "like",
        postId: props.postId,
      })
    }

    liveReactionsCount.value += 1
  }
  catch (error) {
    selectedReaction.value = null
    joinError.value = error instanceof Error ? error.message : t("pages.livePage.viewer.commentError")
  }
  finally {
    reactionSubmitting.value = false
  }
}

function openReactionTrayForHover() {
  if (canHover.value) reactionTrayOpen.value = true
}

function closeReactionTrayForHover() {
  if (canHover.value) reactionTrayOpen.value = false
}

function toggleReactionTrayForPointer() {
  if (canHover.value) return
  reactionTrayOpen.value = !reactionTrayOpen.value
}

async function exitFullscreenIfNeeded() {
  if (!import.meta.client || !document.fullscreenElement) return
  await document.exitFullscreen()
  await nextTick()
}

async function emitAfterFullscreenExit(eventName: "share") {
  await exitFullscreenIfNeeded()
  emit(eventName)
}

async function submitLiveComment() {
  const text = commentDraft.value.trim()
  if (!text || commentSubmitting.value) return

  commentSubmitting.value = true

  try {
    await feedRepository.runPostAction({
      action: "comment",
      postId: props.postId,
      text,
    })
    commentDraft.value = ""
    await refreshHeartbeat()
  }
  catch (error) {
    joinError.value = error instanceof Error ? error.message : t("pages.livePage.viewer.commentError")
  }
  finally {
    commentSubmitting.value = false
  }
}

async function followAuthor() {
  if (!props.authorUserId || followPending.value || followedByViewer.value) return

  followPending.value = true

  try {
    await profileRepository.runProfileAction({
      action: "follow",
      userId: props.authorUserId,
    })
    followedByViewer.value = true
  }
  catch (error) {
    joinError.value = error instanceof Error ? error.message : t("pages.livePage.viewer.followError")
  }
  finally {
    followPending.value = false
  }
}

function toggleFullscreen() {
  if (!import.meta.client) return

  if (document.fullscreenElement) {
    void document.exitFullscreen()
    return
  }

  const element = stageElement.value
  if (element && typeof element.requestFullscreen === "function") {
    void element.requestFullscreen()
  }
}

function syncFullscreenState() {
  isFullscreen.value = document.fullscreenElement === stageElement.value
  if (!isFullscreen.value) reactionTrayOpen.value = false
}

onMounted(() => {
  canHover.value = window.matchMedia("(hover: hover) and (pointer: fine)").matches
  document.addEventListener("fullscreenchange", syncFullscreenState)
})

onBeforeUnmount(() => {
  pause()
  document.removeEventListener("fullscreenchange", syncFullscreenState)
})
</script>

<style scoped>
.feed-live-player {
  margin-top: 14px;
  width: 100%;
}

/* ─── Stage ─────────────────────────────────── */
.feed-live-player__stage {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-xl);
  aspect-ratio: 16 / 9;
  width: 100%;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
  transition: box-shadow var(--duration-normal) var(--ease-default);
}

.feed-live-player__stage:hover {
  box-shadow: var(--shadow-xl);
}

.feed-live-player__stage--fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  border-radius: 0;
  aspect-ratio: auto;
  border: none;
}

.feed-live-player__video-host,
.feed-live-player__video-host :deep(video) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

/* ─── Placeholder ─────────────────────────────── */
.feed-live-player__placeholder {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.82) 0%, rgba(2, 6, 23, 0.98) 100%);
  color: #fff;
}

.feed-live-player__placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 340px;
  text-align: center;
  animation: flp-fadeUp 0.4s var(--ease-default) both;
}

.feed-live-player__placeholder-icon {
  width: 48px;
  height: 48px;
  color: var(--color-primary-400);
  filter: drop-shadow(0 0 12px rgba(123, 115, 255, 0.45));
  animation: flp-pulse-icon 2.2s infinite ease-in-out;
}

.feed-live-player__placeholder-title {
  font-family: var(--font-secondary);
  font-size: 17px;
  font-weight: var(--weight-bold);
  letter-spacing: -0.01em;
}

.feed-live-player__placeholder-copy {
  font-size: 12px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.68);
}

/* ─── Top Bar ─────────────────────────────────── */
.feed-live-player__top-bar {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 58px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.feed-live-player__stage--fullscreen .feed-live-player__top-bar {
  top: 20px;
  left: 20px;
  right: 68px;
}

/* LIVE pill */
.feed-live-player__live-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 8px;
  border-radius: 6px;
  background: var(--color-error);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 2px 12px rgba(239, 68, 68, 0.4);
  pointer-events: auto;
}

.feed-live-player__live-pill--stale {
  background: var(--color-warning);
  box-shadow: 0 2px 12px rgba(245, 158, 11, 0.35);
}

.feed-live-player__live-pill--offline {
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  box-shadow: none;
}

.feed-live-player__pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: flp-pulse-dot 1.6s infinite ease-in-out;
  flex-shrink: 0;
}

/* Top-right group */
.feed-live-player__top-right {
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.feed-live-player__fullscreen-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 80;
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.68);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.feed-live-player__fullscreen-btn:hover {
  background: rgba(15, 23, 42, 0.82);
  border-color: rgba(255, 255, 255, 0.36);
  transform: translateY(-1px);
}

.feed-live-player__fullscreen-btn:active {
  transform: scale(0.96);
}

.feed-live-player__fullscreen-icon {
  width: 20px;
  height: 20px;
}

.feed-live-player__stage--fullscreen .feed-live-player__fullscreen-btn {
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
}

/* Viewer count pill */
.feed-live-player__viewer-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

/* ─── Bottom shade ────────────────────────────── */
.feed-live-player__bottom-shade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 55%;
  background: linear-gradient(
    to top,
    rgba(2, 6, 23, 0.92) 0%,
    rgba(2, 6, 23, 0.4) 55%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 3;
}

/* ─── Info overlay (bottom-left, fullscreen) ─── */
.feed-live-player__info-overlay {
  position: absolute;
  bottom: 80px;
  left: 20px;
  right: 90px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-live-player__stage--fullscreen .feed-live-player__info-overlay {
  bottom: 88px;
  left: 24px;
  right: 96px;
}

.feed-live-player__creator-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feed-live-player__creator-avatar-btn {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s var(--ease-bounce);
}

.feed-live-player__creator-avatar-btn:not(:disabled):hover {
  transform: scale(1.08);
}

.feed-live-player__creator-avatar-btn:disabled {
  cursor: default;
}

.feed-live-player__author-name {
  font-family: var(--font-secondary);
  font-size: 15px;
  font-weight: var(--weight-bold);
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

.feed-live-player__follow-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

/* Music ticker */
.feed-live-player__music-ticker {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  white-space: nowrap;
}

.feed-live-player__music-icon {
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
  animation: flp-spin 4s linear infinite;
}

.feed-live-player__marquee-wrap {
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.feed-live-player__marquee-text {
  display: inline-block;
  padding-left: 100%;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.68);
  animation: flp-marquee 18s linear infinite;
}

/* ─── Right action column (fullscreen) ────────── */
.feed-live-player__actions {
  position: absolute;
  right: 18px;
  bottom: 80px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.feed-live-player__stage--fullscreen .feed-live-player__actions {
  right: 24px;
  bottom: 88px;
  gap: 22px;
}

.feed-live-player__action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.feed-live-player__action-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.82);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  letter-spacing: 0.02em;
}

/* ─── Reaction tray ──────────────────────────── */
.feed-live-player__reaction-wrap {
  position: relative;
}

.feed-live-player__reaction-tray {
  position: absolute;
  right: calc(90%);
  bottom: 0;
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  backdrop-filter: blur(12px);
  z-index: 30;
  animation: live-reaction-tray-in 0.16s ease-out both;
  will-change: transform, opacity;
}

.feed-live-player__reaction-option {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.18s var(--ease-bounce);
  will-change: transform;
}

.feed-live-player__reaction-option:hover,
.feed-live-player__reaction-option:focus-visible {
  transform: translateY(-8px) scale(1.16);
}

.feed-live-player__reaction-image {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
  pointer-events: none;
}

@keyframes live-reaction-tray-in {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.feed-live-player__selected-reaction {
  display: block;
  width: 30px;
  height: 30px;
  object-fit: contain;
}

/* Reaction tray transition */
.feed-live-player__tray-enter-active,
.feed-live-player__tray-leave-active {
  transition: opacity 0.2s var(--ease-default), transform 0.2s var(--ease-bounce);
}

.feed-live-player__tray-enter-from,
.feed-live-player__tray-leave-to {
  opacity: 0;
  transform: scale(0.8) translateX(10px);
}

/* ─── Comment form ───────────────────────────── */
.feed-live-player__comment-form {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 20px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
}

.feed-live-player__comment-reaction-wrap {
  position: relative;
  flex-shrink: 0;
}

.feed-live-player__comment-reaction-tray {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  z-index: 32;
  display: flex;
  gap: 8px;
  max-width: min(320px, calc(100vw - 48px));
  overflow-x: auto;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.68);
  padding: 8px 10px;
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.24);
}

.feed-live-player__comment-selected-reaction {
  display: block;
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.feed-live-player__stage--fullscreen .feed-live-player__comment-form {
  left: 24px;
  right: 24px;
  bottom: 24px;
}

/* ─── Reaction emoji (text-based, no broken images) ── */
/* ─── Activity feed (comments) ───────────────── */
.feed-live-player__activity-feed {
  position: absolute;
  left: 12px;
  bottom: 12px;
  width: 260px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 5px;
  pointer-events: none;
  overflow: hidden;
  max-height: 160px;
}

.feed-live-player__activity-feed--fullscreen {
  left: 24px;
  bottom: 168px;
  width: 320px;
  max-height: min(240px, calc(100vh - 300px));
}

.feed-live-player__activity-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  animation: flp-fadeUp 0.3s var(--ease-default) both;
  max-width: 100%;
  overflow: hidden;
}

.feed-live-player__activity-name {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-live-player__activity-msg {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.feed-live-player__activity-msg--system {
  color: rgba(255, 255, 255, 0.55);
  font-style: italic;
}

.feed-live-player__activity-item--joined {
  border-color: rgba(34, 197, 94, 0.25);
}

.feed-live-player__activity-item--left {
  border-color: rgba(255, 255, 255, 0.06);
  opacity: 0.7;
}

/* Activity feed transition */
.flp-activity-enter-active {
  transition: opacity 0.3s var(--ease-default), transform 0.3s var(--ease-bounce);
}

.flp-activity-leave-active {
  transition: opacity 0.25s var(--ease-default);
  position: absolute;
}

.flp-activity-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.flp-activity-leave-to {
  opacity: 0;
}

/* ─── Floating reactions ─────────────────────── */
.feed-live-player__floating-reactions {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 8;
  overflow: hidden;
}

.feed-live-player__floating-reaction {
  position: absolute;
  bottom: 80px;
  animation: flp-float-up 2.2s var(--ease-default) both;
  user-select: none;
}

.feed-live-player__floating-reaction-image {
  display: block;
  width: 34px;
  height: 34px;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35));
}

/* Floating reaction transition */
.flp-reaction-enter-active {
  animation: flp-float-up 2.2s var(--ease-default) both;
}

.flp-reaction-leave-active {
  animation: flp-float-up 2.2s var(--ease-default) reverse;
}

@keyframes flp-float-up {
  0%   { opacity: 0; transform: translateY(0) scale(0.6); }
  15%  { opacity: 1; transform: translateY(-10px) scale(1.15); }
  80%  { opacity: 0.8; transform: translateY(-120px) scale(1); }
  100% { opacity: 0; transform: translateY(-180px) scale(0.8); }
}
.feed-live-player__error {
  margin-top: 8px;
  color: var(--color-error);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

/* ─── Keyframes ──────────────────────────────── */
@keyframes flp-fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes flp-pulse-icon {
  0%, 100% { transform: scale(1);    opacity: 0.95; }
  50%       { transform: scale(1.09); opacity: 0.8;  filter: drop-shadow(0 0 18px rgba(123, 115, 255, 0.55)); }
}

@keyframes flp-pulse-dot {
  0%, 100% { transform: scale(0.9); opacity: 0.5; }
  50%       { transform: scale(1.2); opacity: 1;   }
}

@keyframes flp-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes flp-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
</style>
