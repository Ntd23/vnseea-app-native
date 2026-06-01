<!-- English description: Renders the backend-backed LiveKit host studio for the /live route with real setup, preview, heartbeat, and end-live controls. -->
<template>
  <div class="studio">
    <div class="studio__shell studio__shell--2col">

      <LiveSetupPanel
        v-if="!session"
        v-model:title="title"
        v-model:privacy="privacy"
        :bootstrap="bootstrap"
        :bootstrap-loading="bootstrapLoading"
        :bootstrap-error-message="bootstrapErrorMessage"
        :blocked-reason-message="blockedReasonMessage"
        :error-message="errorMessage"
        :status-message="statusMessage"
        :live-state="liveState"
        :destination-select-options="destinationSelectOptions"
        :privacy-select-options="privacySelectOptions"
        :can-start="canStart"
        :starting="starting"
        :preview-loading="previewLoading"
        :media-supported="mediaSupported"
        :audio-muted="audioMuted"
        :video-muted="videoMuted"
        @toggle-video="toggleVideo"
        @toggle-audio="toggleAudio"
        @start-live="handleStartLive"
      />
      <aside v-else class="studio__side-panel">
        <LiveChat
          :items="chatItems"
          :live-state="liveState"
          :sending="chatSending"
          :error-message="chatErrorMessage"
          @send="handleSendChatMessage"
        />
      </aside>

      <!-- ── CENTER: Stage ────────────────────────────── -->
      <main class="studio__main">

        <!-- Video stage -->
        <div class="studio__stage-card">
          <!-- Video frame + fullscreen overlay -->
          <div ref="previewStageHost" class="studio__stage">
            <div v-if="showStagePlaceholder" class="studio__stage-placeholder">
              <div class="studio__stage-icon-wrap">
                <UIcon name="i-ph-video-camera-duotone" class="h-10 w-10 text-slate-300" />
              </div>
              <p class="studio__stage-placeholder-title">{{ stageTitle }}</p>
              <p class="studio__stage-placeholder-desc">{{ stageDescription }}</p>
            </div>
            <!-- Fullscreen icon (overlay, inside video) -->
            <UButton
              :icon="isFullscreen ? 'i-ph-arrows-in-bold' : 'i-ph-arrows-out-bold'"
              :aria-label="isFullscreen ? t('pages.livePage.viewer.exitFullscreen') : t('pages.livePage.viewer.openFullscreen')"
              color="neutral"
              variant="solid"
              size="lg"
              square
              class="studio__fullscreen-btn"
              :ui="{ base: 'absolute right-3.5 top-3.5 z-[80] rounded-full bg-black/60 text-white shadow-lg ring-1 ring-white/20 hover:bg-black/75' }"
              @click="toggleFullscreen"
            />
            <template v-if="false">
              <UIcon :name="isFullscreen ? 'i-ph-arrows-in-bold' : 'i-ph-arrows-out-bold'" class="h-5 w-5" />
            </template>

            <div v-if="session" class="studio__stage-controls">
              <span class="studio__live-timer">
                <span class="studio__live-dot studio__live-dot--live" />
                {{ liveElapsedLabel }}
              </span>
              <UButton
                :icon="videoMuted ? 'i-ph-video-camera-slash-bold' : 'i-ph-video-camera-bold'"
                :aria-label="videoMuted ? t('pages.livePage.studio.enableCamera') : t('pages.livePage.studio.disableCamera')"
                :color="videoMuted ? 'error' : 'neutral'"
                variant="solid"
                size="md"
                square
                class="studio__stage-control-btn"
                @click="toggleVideo"
              />
              <UButton
                :icon="audioMuted ? 'i-ph-microphone-slash-bold' : 'i-ph-microphone-bold'"
                :aria-label="audioMuted ? t('pages.livePage.studio.enableMicrophone') : t('pages.livePage.studio.disableMicrophone')"
                :color="audioMuted ? 'error' : 'neutral'"
                variant="solid"
                size="md"
                square
                class="studio__stage-control-btn"
                @click="toggleAudio"
              />
              <UButton
                color="error"
                variant="solid"
                size="md"
                class="studio__stage-end-btn"
                :loading="ending"
                @click="handleEndLive"
              >
                <template #leading>
                  <UIcon name="i-ph-stop-circle-bold" class="h-4 w-4" />
                </template>
                {{ t("pages.livePage.studio.endBroadcast") }}
              </UButton>
            </div>

            <div v-if="isFullscreen && session" class="studio__fs-overlay">
              <div class="studio__fs-topbar">
                <div class="studio__fs-host">
                  <UAvatar
                    :src="bootstrap.host?.avatarUrl || undefined"
                    :alt="bootstrap.host?.name || t('pages.livePage.studio.hostFallback')"
                    size="lg"
                  />
                  <div class="min-w-0">
                    <p class="studio__fs-name">{{ bootstrap.host?.name || t("pages.livePage.studio.hostFallback") }}</p>
                    <div class="studio__fs-meta">
                      <UBadge color="error" variant="solid" class="rounded-full px-3 py-1 text-[10px] font-bold">{{ t("pages.livePage.statusLiveUpper") }}</UBadge>
                      <span><UIcon name="i-ph-eye-duotone" /> {{ viewerCount }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="studio__fs-hearts">
                <img
                  v-for="reaction in floatingReactions"
                  :key="reaction.id"
                  :src="reaction.src"
                  alt=""
                  class="studio__fs-heart"
                  :style="{ left: `${reaction.x}%` }"
                  draggable="false"
                >
              </div>

              <div class="studio__fs-comments">
                <article
                  v-for="item in chatItems.slice(-8)"
                  :key="`fs-${item.kind}-${item.id}-${item.username}-${item.timeText}`"
                  class="studio__fs-comment"
                >
                  <UAvatar :src="item.avatarUrl || undefined" :alt="item.author" size="xs" />
                  <div class="studio__fs-comment-body">
                    <strong>{{ item.username || item.author }}</strong>
                    <span>{{ item.message }}</span>
                  </div>
                </article>
              </div>

              <form class="studio__fs-chat-form" @submit.prevent="submitFullscreenChat">
                <input
                  v-model="fullscreenChatDraft"
                  class="studio__fs-chat-input"
                  :disabled="chatSending || liveState !== 'live'"
                  :placeholder="t('pages.livePage.viewer.commentPlaceholder')"
                >
                <UButton
                  type="submit"
                  color="primary"
                  square
                  :loading="chatSending"
                  :disabled="chatSending || liveState !== 'live' || fullscreenChatDraft.trim().length === 0"
                  class="studio__fs-chat-send"
                  :aria-label="t('pages.livePage.viewer.submitComment')"
                >
                  <template #leading>
                    <UIcon name="i-ph-paper-plane-tilt-fill" class="h-4 w-4" />
                  </template>
                </UButton>
                <p v-if="chatErrorMessage" class="studio__fs-chat-error">{{ chatErrorMessage }}</p>
              </form>
            </div>

            <div v-if="session && !isFullscreen" class="studio__stage-hearts">
              <img
                v-for="reaction in floatingReactions"
                :key="reaction.id"
                :src="reaction.src"
                alt=""
                class="studio__stage-heart"
                :style="{ left: `${reaction.x}%` }"
                draggable="false"
              >
            </div>
          </div>

          <div class="studio__stage-topbar">
            <div class="studio__stage-status">
              <span
                class="studio__live-dot"
                :class="liveState === 'live' ? 'studio__live-dot--live' : 'studio__live-dot--off'"
              />
              <div class="min-w-0">
                <p class="studio__stage-kicker">
                  {{ session ? t("pages.livePage.studio.broadcastingUpper") : t("pages.livePage.studio.previewUpper") }}
                </p>
                <h1 class="studio__stage-heading">
                  {{ session?.title || title || t("pages.livePage.seoTitle") }}
                </h1>
              </div>
            </div>

            <div class="studio__stage-metrics">
              <span class="studio__viewer-count">
                <UIcon name="i-ph-eye-duotone" class="h-4 w-4" />
                {{ viewerCount }}
              </span>
              <span class="studio__viewer-count">
                <UIcon name="i-ph-heart-fill" class="h-4 w-4" />
                {{ reactionsCount }}
              </span>
              <span class="studio__viewer-count">
                <UIcon name="i-ph-share-fat-fill" class="h-4 w-4" />
                {{ sharesCount }}
              </span>
            </div>
          </div>
        </div>
      </main>

    </div>
  </div>
</template>

<script setup lang="ts">
import { feedReactionAssets } from "../../../feed/application/constants/reaction-assets"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"
import { useLiveKitStudio } from "../../application/composables/useLiveKitStudio"
import { useLiveStudioPageVM } from "../../application/view-models/useLiveStudioPageVM"
import LiveChat from "../components/LiveChat.vue"
import LiveSetupPanel from "../components/LiveSetupPanel.vue"

const { t } = useI18n()
const feedRepository = createApiFeedRepository()
useSeoMeta({
  title: () => t("pages.livePage.seoTitle"),
  description: () => t("pages.livePage.seoDescription"),
})

const previewStageHost = ref<HTMLElement | null>(null)

const {
  bootstrap, bootstrapLoading, bootstrapErrorMessage, blockedReasonMessage,
  title, description, privacy, session, liveState, viewerCount,
  reactionsCount, sharesCount, activityItems, reactionEvents,
  canStart, starting, ending, statusMessage, errorMessage,
  startLive, endLive,
} = useLiveStudioPageVM()

const {
  mediaSupported, previewLoading, previewReady, previewError,
  audioMuted, videoMuted,
  ensurePreview, toggleAudio, toggleVideo,
  connect, disconnect, setPreviewHost,
} = useLiveKitStudio()

watch(previewStageHost, (el) => setPreviewHost(el), { flush: "post", immediate: true })

watch(
  () => bootstrap.value.canUseLive,
  async (canUseLive) => {
    if (!canUseLive || session.value) return
    if (!previewReady.value && !previewLoading.value) await ensurePreview()
  },
  { immediate: true },
)

watch(
  () => liveState.value,
  (state) => { if (state === "offline") disconnect() },
)

const privacyLabel = (v: string) => {
  if (v === "1") return t("pages.livePage.studio.privacyFriends")
  if (v === "2") return t("pages.livePage.studio.privacyFollowers")
  if (v === "3") return t("pages.livePage.studio.privacyOnlyMe")
  return t("pages.livePage.studio.privacyPublic")
}

const destinationSelectOptions = computed(() =>
  bootstrap.value.destinationOptions.map(option => ({
    label: option.value === "timeline" ? t("pages.livePage.studio.destinationTimeline") : option.label,
    value: option.value,
  })),
)

const privacySelectOptions = computed(() =>
  bootstrap.value.privacyOptions.map(option => ({
    label: privacyLabel(option.value),
    value: option.value,
  })),
)

const liveStateLabel = computed(() => {
  if (liveState.value === "live") return t("pages.livePage.studio.liveStateLive")
  if (liveState.value === "stale") return t("pages.livePage.studio.liveStateStale")
  return t("pages.livePage.studio.liveStateOffline")
})

const liveStateBadgeColor = computed<"success" | "warning" | "neutral">(() => {
  if (liveState.value === "live") return "success"
  if (liveState.value === "stale") return "warning"
  return "neutral"
})

const showStagePlaceholder = computed(() =>
  previewLoading.value || !previewReady.value || Boolean(previewError.value) || videoMuted.value,
)

const stageTitle = computed(() => {
  if (!mediaSupported.value) return t("pages.livePage.studio.stageUnsupported")
  if (previewLoading.value) return t("pages.livePage.studio.stageStartingCamera")
  if (previewError.value) return t("pages.livePage.studio.stageCameraError")
  if (videoMuted.value) return t("pages.livePage.studio.stageCameraOff")
  if (session.value) return t("pages.livePage.studio.stagePreviewReady")
  return t("pages.livePage.studio.stageConnectCamera")
})

const stageDescription = computed(() => {
  if (previewError.value) return previewError.value
  if (!mediaSupported.value) return t("pages.livePage.studio.stageUnsupportedDescription")
  if (previewLoading.value) return t("pages.livePage.studio.stageStartingCameraDescription")
  if (videoMuted.value) return t("pages.livePage.studio.stageCameraOffDescription")
  if (session.value) return t("pages.livePage.studio.stagePublishingDescription")
  return t("pages.livePage.studio.stageConnectCameraDescription")
})

async function handleStartLive() {
  if (!mediaSupported.value) return
  await ensurePreview()
  if (previewError.value) return
  await startLive(async (s) => { await connect(s) })
}

async function handleEndLive() {
  await endLive(() => { disconnect() })
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    const el = previewStageHost.value
    if (el && typeof el.requestFullscreen === "function") void el.requestFullscreen()
  }
}

const isFullscreen = ref(false)
const liveClockNow = ref(Date.now())
const chatSending = ref(false)
const chatErrorMessage = ref("")
const fullscreenChatDraft = ref("")
const floatingReactions = ref<Array<{ id: number; src: string; x: number }>>([])
const animatedReactionIds = new Set<number>()
let liveClockTimer: ReturnType<typeof window.setInterval> | null = null

const chatItems = computed(() =>
  activityItems.value.filter(item => item.kind === "comment").slice(-24),
)

const liveElapsedLabel = computed(() => {
  if (!session.value?.startedAt) {
    return "00:00"
  }

  const startedAt = new Date(session.value.startedAt).getTime()

  if (!Number.isFinite(startedAt)) {
    return "00:00"
  }

  const totalSeconds = Math.max(0, Math.floor((liveClockNow.value - startedAt) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const paddedMinutes = String(minutes).padStart(2, "0")
  const paddedSeconds = String(seconds).padStart(2, "0")

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`
})

async function handleSendChatMessage(message: string) {
  if (!session.value || chatSending.value) {
    return
  }

  chatSending.value = true
  chatErrorMessage.value = ""

  try {
    const result = await feedRepository.runPostAction({
      action: "comment",
      postId: session.value.postId,
      text: message,
    })

    activityItems.value = [
      ...activityItems.value,
      {
        id: result.commentId ?? -Date.now(),
        author: bootstrap.value.host?.name || t("pages.livePage.studio.hostFallback"),
        username: bootstrap.value.host?.username || "",
        avatarUrl: bootstrap.value.host?.avatarUrl || "",
        message,
        timeText: t("pages.livePage.justNow"),
        kind: "comment",
        isHost: true,
      },
    ].slice(-24)
  }
  catch (error) {
    chatErrorMessage.value = error instanceof Error
      ? error.message
      : t("pages.livePage.viewer.commentError")
  }
  finally {
    chatSending.value = false
  }
}

async function submitFullscreenChat() {
  const message = fullscreenChatDraft.value.trim()

  if (!message || chatSending.value || liveState.value !== "live") {
    return
  }

  await handleSendChatMessage(message)

  if (!chatErrorMessage.value) {
    fullscreenChatDraft.value = ""
  }
}

function reactionAssetSrc(value: string) {
  return feedReactionAssets.find(asset =>
    asset.value === value || String(asset.backendId) === value,
  )?.src ?? feedReactionAssets[0]?.src ?? ""
}

function pushFloatingReaction(src: string, seed: number) {
  if (!src) {
    return
  }

  const reaction = {
    id: Date.now() + seed,
    src,
    x: 12 + Math.random() * 72,
  }

  floatingReactions.value = [...floatingReactions.value.slice(-8), reaction]
  window.setTimeout(() => {
    floatingReactions.value = floatingReactions.value.filter(item => item.id !== reaction.id)
  }, 2600)
}

watch(reactionEvents, (nextEvents) => {
  if (!import.meta.client || !session.value) {
    return
  }

  nextEvents.forEach((event) => {
    if (event.id > 0 && animatedReactionIds.has(event.id)) {
      return
    }

    if (event.id > 0) {
      animatedReactionIds.add(event.id)
    }

    pushFloatingReaction(reactionAssetSrc(event.value), event.id)
  })
})

watch(reactionsCount, (nextValue, previousValue = 0) => {
  if (!import.meta.client || !session.value || nextValue <= previousValue || reactionEvents.value.length > 0) {
    return
  }

  const asset = feedReactionAssets[(nextValue + previousValue) % feedReactionAssets.length]
  pushFloatingReaction(asset.src, nextValue)
})

watch(session, (nextSession) => {
  if (nextSession) {
    return
  }

  animatedReactionIds.clear()
  floatingReactions.value = []
})

function handleFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  document.addEventListener("fullscreenchange", handleFullscreenChange)
  liveClockTimer = window.setInterval(() => {
    liveClockNow.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange)

  if (liveClockTimer) {
    window.clearInterval(liveClockTimer)
    liveClockTimer = null
  }
})
</script>

<style scoped>
/* ── Page shell ───────────────────────────────────────── */
.studio {
  min-height: calc(100vh - 65px);
  background: #f1f4fb;
  padding: 12px 16px 16px;
}

.studio__shell {
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  max-width: 1480px;
  margin: 0 auto;
}

.studio__shell--2col {
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
}

.studio__side-panel {
  position: sticky;
  top: 82px;
  display: flex;
  height: min(680px, calc(100vh - 104px));
  min-height: 0;
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* ── Sidebar ──────────────────────────────────────────── */
.studio__sidebar {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 82px;
}

.studio__skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.studio__alerts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.studio__host {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #fafbfe;
}

.studio__host-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.studio__host-role {
  font-size: 12px;
  color: #64748b;
  margin: 3px 0 0;
}

.studio__fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.studio__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.studio__field--inline {
  flex: 1;
}

.studio__label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

/* Selects */
.studio__select-wrap {
  position: relative;
}

.studio__select {
  width: 100%;
  height: 44px;
  padding: 0 36px 0 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fafbfe;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  appearance: none;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}

.studio__select:focus {
  border-color: rgba(0, 0, 255, 0.25);
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.08);
}

.studio__select:disabled {
  opacity: 0.6;
  cursor: default;
  background: #f8fafc;
}

.studio__select--sm {
  height: 40px;
  font-size: 13px;
}

.studio__select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: #94a3b8;
  pointer-events: none;
}

/* File button */
.studio__file-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
  background: #fafbfe;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.studio__file-btn:hover {
  border-color: rgba(0, 0, 255, 0.22);
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

.studio__fields > .studio__field:nth-of-type(n + 3),
.studio__device-section > .studio__section-label,
.studio__device-section > .studio__field {
  display: none;
}

.studio__sidebar-action {
  margin-top: auto;
}

/* Device section (inside sidebar) */
.studio__device-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 0;
  border-top: 0;
}

.studio__section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0;
}
.studio__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* ── Main (center) ────────────────────────────────────── */


.studio__media-toggles {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.studio__toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #f8fafc;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.studio__toggle-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.studio__toggle-btn--off {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}

.studio__toggle-btn--ghost {
  background: transparent;
  border-color: transparent;
  color: #64748b;
}

.studio__toggle-btn--ghost:hover {
  background: #f1f5f9;
  color: #374151;
}

/* Stage card */
.studio__stage-card {
  position: relative;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.studio__stage-topbar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 64px;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  border-radius: 14px;
}

.studio__stage-status {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.studio__stage-kicker {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.studio__stage-heading {
  margin: 2px 0 0;
  overflow: hidden;
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio__stage-metrics {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.studio__live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.studio__live-dot--live {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239,68,68,0.25);
  animation: livePulse 1.4s ease-in-out infinite;
}

.studio__live-dot--off {
  background: #94a3b8;
}

@keyframes livePulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.25); }
  50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.08); }
}

.studio__stage-bar-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #475569;
}

.studio__viewer-count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.studio__state-badge {
  min-height: 28px;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
}

.studio__stage {
  position: relative;
  width: 100%;
  height: min(calc(100vh - 102px), calc((100vw - 384px) * 0.5625));
  min-height: 420px;
  max-height: 760px;
  background: #020617;
  overflow: hidden;
}

:deep(.live-studio-preview__video) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scaleX(-1);
}

:deep(video) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.studio__stage-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.studio__stage-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.08);
}

.studio__stage-placeholder-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  margin: 0;
}

.studio__stage-placeholder-desc {
  font-size: 13px;
  line-height: 1.65;
  color: rgba(255,255,255,0.5);
  max-width: 380px;
  margin: 0;
}

.studio__fullscreen-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: none;
  background: rgba(0, 0, 0, 0.62);
  color: #ffffff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  transition: background 0.15s, transform 0.15s;
}

.studio__fullscreen-btn:hover {
  background: rgba(0, 0, 0, 0.78);
  transform: translateY(-1px);
}

.studio__stage-controls {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 82;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.studio__live-timer {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.64);
  padding: 8px 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  backdrop-filter: blur(10px);
}

.studio__stage-control-btn,
.studio__stage-end-btn {
  min-height: 36px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.64);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(10px);
}

.studio__stage-end-btn {
  margin-left: auto;
  padding-inline: 14px;
  font-size: 12px;
  font-weight: 800;
}

.studio__fs-overlay {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.52), transparent 28%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.72), transparent 42%);
}

.studio__fs-topbar {
  position: absolute;
  top: 22px;
  left: 22px;
  right: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.studio__fs-host {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.studio__fs-name {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.studio__fs-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 800;
}

.studio__fs-meta span,
.studio__fs-counter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.studio__fs-comments {
  position: absolute;
  left: 24px;
  right: auto;
  bottom: 150px;
  z-index: 26;
  display: flex;
  width: min(420px, calc(100vw - 48px));
  max-height: min(300px, calc(100vh - 250px));
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  pointer-events: none;
}

.studio__fs-empty {
  width: fit-content;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.52);
  padding: 10px 14px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
}

.studio__fs-comment {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.studio__fs-comment-body {
  display: grid;
  gap: 3px;
  max-width: 100%;
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.54);
  padding: 8px 12px;
  color: #ffffff;
  backdrop-filter: blur(10px);
}

.studio__fs-comment-body strong {
  color: rgba(255, 255, 255, 0.74);
  font-size: 12px;
}

.studio__fs-comment-body span {
  font-size: 13px;
  line-height: 1.45;
}

.studio__fs-chat-form {
  position: absolute;
  left: 24px;
  right: auto;
  bottom: 100px;
  z-index: 34;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  width: min(420px, calc(100vw - 48px));
  gap: 10px;
  pointer-events: auto;
}

.studio__fs-chat-input {
  min-width: 0;
  width: 100%;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  padding: 0 16px;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  backdrop-filter: blur(12px);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.studio__fs-chat-input::placeholder {
  color: rgba(255, 255, 255, 0.58);
}

.studio__fs-chat-input:focus {
  border-color: rgba(255, 255, 255, 0.36);
  background: rgba(255, 255, 255, 0.18);
}

.studio__fs-chat-input:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.studio__fs-chat-send {
  width: 44px;
  height: 44px;
  min-height: 44px;
  border-radius: 999px;
}

.studio__fs-chat-error {
  grid-column: 1 / -1;
  margin: 0;
  color: #fecaca;
  font-size: 12px;
  font-weight: 700;
}

.studio__fs-actions {
  position: absolute;
  right: 24px;
  bottom: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.studio__fs-counter {
  min-width: 62px;
  justify-content: center;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.56);
  padding: 12px 14px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  backdrop-filter: blur(12px);
}

.studio__fs-counter svg,
.studio__fs-counter :deep(svg) {
  width: 20px;
  height: 20px;
}

.studio__fs-hearts {
  position: absolute;
  inset: 0;
  z-index: 24;
  overflow: hidden;
  pointer-events: none;
}

.studio__fs-heart {
  position: absolute;
  bottom: 8%;
  width: 46px;
  height: 46px;
  object-fit: contain;
  animation: studioHeartRise 2.6s ease-out forwards;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.28));
}

.studio__stage-hearts {
  position: absolute;
  inset: 0;
  z-index: 24;
  overflow: hidden;
  pointer-events: none;
}

.studio__stage-heart {
  position: absolute;
  bottom: 8%;
  width: 46px;
  height: 46px;
  object-fit: contain;
  animation: studioHeartRise 2.6s ease-out forwards;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.28));
}

.studio__stage-activity-overlay {
  position: absolute;
  inset: 0;
  z-index: 12;
  pointer-events: none;
  background:
    linear-gradient(0deg, rgba(2, 6, 23, 0.62), transparent 42%),
    linear-gradient(90deg, rgba(2, 6, 23, 0.38), transparent 42%);
}

.studio__stage-comments {
  position: absolute;
  left: 18px;
  right: 112px;
  bottom: 18px;
  display: flex;
  max-height: 158px;
  max-width: 540px;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.studio__stage-empty {
  width: fit-content;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.54);
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  backdrop-filter: blur(10px);
}

.studio__stage-comment {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.studio__stage-comment-body {
  display: grid;
  gap: 2px;
  border-radius: 16px;
  padding: 8px 11px;
  color: #ffffff;
}

.studio__stage-comment-body strong {
  color: rgba(255, 255, 255, 0.74);
  font-size: 11px;
}

.studio__stage-comment-body span {
  font-size: 13px;
  line-height: 1.4;
}

.studio__stage-actions {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.studio__stage-counter {
  display: inline-flex;
  min-width: 54px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.58);
  padding: 9px 11px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.studio__activity-panel {
  display: none;
  gap: 14px;
  background: #ffffff;
  padding: 16px 18px 18px;
}

.studio__activity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.studio__activity-eyebrow {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.studio__activity-title {
  margin: 3px 0 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
}

.studio__activity-stats {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
}

.studio__activity-stats span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  background: #f1f5f9;
  padding: 8px 11px;
}

.studio__activity-list {
  display: grid;
  max-height: 220px;
  gap: 10px;
  overflow-y: auto;
}

.studio__activity-empty {
  border-radius: 16px;
  background: #f8fafc;
  padding: 12px 14px;
  color: #64748b;
  font-size: 13px;
}

.studio__activity-comment {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.studio__activity-comment-body {
  display: grid;
  gap: 3px;
  border-radius: 16px;
  background: #f8fafc;
  padding: 9px 12px;
  color: #0f172a;
}

.studio__activity-comment-body strong {
  color: #475569;
  font-size: 12px;
}

.studio__activity-comment-body span {
  font-size: 14px;
  line-height: 1.45;
}

@keyframes studioHeartRise {
  0% { transform: translate3d(0, 20px, 0) scale(0.72) rotate(-8deg); opacity: 0; }
  10% { opacity: 1; }
  38% { transform: translate3d(16px, -112px, 0) scale(1.02) rotate(7deg); }
  72% { opacity: 0.82; }
  100% { transform: translate3d(-18px, -280px, 0) scale(1.18) rotate(-10deg); opacity: 0; }
}

:fullscreen .studio__stage,
:-webkit-full-screen .studio__stage {
  aspect-ratio: unset;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
}

:fullscreen .studio__stage-controls,
:-webkit-full-screen .studio__stage-controls {
  bottom: 15px;
}


/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 1180px) {
  .studio__shell,
  .studio__shell--2col {
    grid-template-columns: 1fr;
  }

  .studio__sidebar {
    position: static;
  }

  .studio__side-panel {
    position: static;
    height: 420px;
    min-height: 0;
  }

  .studio__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .studio__sidebar-action {
    margin-top: 0;
  }

  .studio__stage {
    height: min(calc(100vh - 300px), calc((100vw - 32px) * 0.5625));
    min-height: 360px;
  }
}

@media (max-width: 640px) {
  .studio {
    min-height: calc(100vh - 56px);
    padding: 8px 10px 12px;
  }

  .studio__shell {
    gap: 12px;
  }

  .studio__side-panel {
    height: 360px;
  }

  .studio__sidebar {
    padding: 14px;
  }

  .studio__fields {
    grid-template-columns: 1fr;
  }

  .studio__stage-topbar {
    top: 10px;
    left: 10px;
    right: 58px;
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding: 9px 10px;
  }

  .studio__stage-metrics {
    width: 100%;
    flex-wrap: wrap;
  }

  .studio__stage {
    height: min(calc(100vh - 360px), calc((100vw - 20px) * 0.75));
    min-height: 300px;
    max-height: 520px;
  }

  .studio__stage-heading {
    max-width: calc(100vw - 70px);
    font-size: 15px;
  }

  .studio__stage-placeholder {
    padding: 24px 18px;
  }

  .studio__stage-comments {
    right: 18px;
    max-height: 132px;
  }

  .studio__stage-controls {
    left: 10px;
    right: 10px;
    bottom: 10px;
    flex-wrap: wrap;
  }

  .studio__stage-end-btn {
    width: 100%;
    margin-left: 0;
    justify-content: center;
  }

  .studio__fs-comments {
    left: 12px;
    right: auto;
    bottom: 150px;
    width: calc(100vw - 24px);
    max-height: min(220px, calc(100vh - 260px));
  }

  .studio__fs-comment-body {
    max-width: calc(100vw - 76px);
  }

  .studio__fs-chat-form {
    left: 12px;
    right: auto;
    bottom: 100px;
    grid-template-columns: minmax(0, 1fr) 42px;
    width: calc(100vw - 24px);
    gap: 8px;
  }

  .studio__fs-chat-input,
  .studio__fs-chat-send {
    height: 42px;
    min-height: 42px;
  }

  :fullscreen .studio__stage-controls,
  :-webkit-full-screen .studio__stage-controls {
    bottom: 68px;
  }
}
</style>
