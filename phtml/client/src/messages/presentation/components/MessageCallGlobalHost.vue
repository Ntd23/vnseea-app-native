<!-- Description: Hosts global one-to-one message call notifications and the active LiveKit surface. -->
<template>
  <UModal
    v-model:open="ringingModalOpen"
    :ui="{
      content: 'sm:max-w-[420px] overflow-hidden rounded-[28px] border-0 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-black/5'
    }"
  >
    <template #body>
      <div v-if="ringingCall" class="message-call-modal">
        <div class="message-call-modal__halo" :class="{ 'message-call-modal__halo--incoming': ringingCall.direction === 'incoming' }">
          <UAvatar
            :src="ringingCall.peer.avatar"
            :alt="ringingCall.peer.name"
            size="3xl"
            class="message-call-modal__avatar"
          />
          <span class="message-call-modal__type">
            <UIcon :name="callTypeIcon" />
          </span>
        </div>

        <div class="message-call-modal__copy">
          <p class="message-call-modal__eyebrow">{{ modalEyebrow }}</p>
          <h3>{{ ringingCall.peer.name }}</h3>
          <p class="message-call-modal__subtitle">{{ modalSubtitle }}</p>
        </div>

        <div class="message-call-modal__actions">
          <UButton
            v-if="ringingCall.direction === 'incoming'"
            icon="i-ph-phone-disconnect-bold"
            color="error"
            variant="soft"
            square
            class="message-call-modal__button"
            :disabled="isCallActionPending"
            :aria-label="$t('pages.messagesPage.callModalDecline')"
            @click="declineIncomingCall"
          />
          <UButton
            v-else
            icon="i-ph-phone-disconnect-bold"
            color="error"
            variant="soft"
            square
            class="message-call-modal__button"
            :disabled="isCallActionPending"
            :aria-label="$t('pages.messagesPage.callModalCancel')"
            @click="cancelOutgoingCall"
          />
          <UButton
            v-if="ringingCall.direction === 'incoming'"
            :icon="ringingCall.type === 'video' ? 'i-ph-video-camera-bold' : 'i-ph-phone-bold'"
            color="success"
            square
            class="message-call-modal__button"
            :loading="isCallActionPending"
            :aria-label="$t('pages.messagesPage.callModalAnswer')"
            @click="answerIncomingCall"
          />
        </div>

        <p class="message-call-modal__hint">{{ modalHint }}</p>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="groupRingingModalOpen"
    :ui="{
      content: 'sm:max-w-[420px] overflow-hidden rounded-[28px] border-0 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-black/5'
    }"
  >
    <template #body>
      <div v-if="ringingGroupCall" class="message-call-modal">
        <div class="message-call-modal__halo" :class="{ 'message-call-modal__halo--incoming': ringingGroupCall.direction === 'incoming' }">
          <UAvatar
            :src="ringingGroupCall.avatar"
            :alt="ringingGroupCall.groupName"
            size="3xl"
            class="message-call-modal__avatar"
          />
          <span class="message-call-modal__type">
            <UIcon :name="ringingGroupCall.type === 'video' ? 'i-ph-video-camera-bold' : 'i-ph-phone-bold'" />
          </span>
        </div>

        <div class="message-call-modal__copy">
          <p class="message-call-modal__eyebrow">
            {{ groupModalEyebrow }}
          </p>
          <h3>{{ ringingGroupCall.groupName }}</h3>
          <p class="message-call-modal__subtitle">{{ groupModalSubtitle }}</p>
        </div>

        <div class="message-call-modal__actions">
          <UButton
            icon="i-ph-phone-disconnect-bold"
            color="error"
            variant="soft"
            square
            class="message-call-modal__button"
            :disabled="isCallActionPending"
            :aria-label="ringingGroupCall.direction === 'incoming' ? $t('pages.messagesPage.callModalDecline') : $t('pages.messagesPage.callModalCancel')"
            @click="ringingGroupCall.direction === 'incoming' ? declineGroupCall() : cancelGroupCall()"
          />
          <UButton
            v-if="ringingGroupCall.direction === 'incoming'"
            :icon="ringingGroupCall.type === 'video' ? 'i-ph-video-camera-bold' : 'i-ph-phone-bold'"
            color="success"
            square
            class="message-call-modal__button"
            :loading="isCallActionPending"
            :aria-label="$t('pages.messagesPage.callModalAnswer')"
            @click="answerGroupCall"
          />
        </div>

        <p class="message-call-modal__hint">{{ groupModalHint }}</p>
      </div>
    </template>
  </UModal>

  <MessageCallOverlay
    v-if="activeCallSession"
    :session="activeCallSession"
    @ended="finishActiveCall"
  />

  <MessageGroupCallPage
    v-if="activeGroupCall"
    :call-id="activeGroupCall.id"
    @ended="finishGroupCall"
  />
</template>

<script setup lang="ts">
import { useBackendWebUrl } from "../../../shared-kernel/application/utils/backend-web-url"
import { useMessageCalls } from "../../application/composables/useMessageCalls"
import MessageGroupCallPage from "../pages/MessageGroupCallPage.vue"
import MessageCallOverlay from "./MessageCallOverlay.vue"

const props = withDefaults(defineProps<{
  pollIncoming?: boolean
}>(), {
  pollIncoming: false,
})

const {
  activeGroupCall,
  activeSession: activeCallSession,
  answerGroupCall,
  answerIncomingCall,
  cancelGroupCall,
  cancelOutgoingCall,
  declineGroupCall,
  declineIncomingCall,
  finishActiveCall,
  finishGroupCall,
  isCallActionPending,
  ringingGroupCall,
  ringingCall,
} = useMessageCalls(undefined, { pollIncoming: computed(() => props.pollIncoming) })

const { t } = useI18n()

const ringingModalOpen = computed({
  get: () => Boolean(ringingCall.value),
  set: (value) => {
    if (!value && ringingCall.value?.direction === "outgoing") {
      cancelOutgoingCall()
    }
  },
})

const groupRingingModalOpen = computed({
  get: () => Boolean(ringingGroupCall.value),
  set: (value) => {
    if (!value) {
      ringingGroupCall.value?.direction === "incoming" ? declineGroupCall() : cancelGroupCall()
    }
  },
})

const groupModalEyebrow = computed(() => {
  if (!ringingGroupCall.value) {
    return ""
  }

  if (ringingGroupCall.value.direction === "incoming") {
    return ringingGroupCall.value.type === "video"
      ? t("pages.messagesPage.groupCallIncomingVideo")
      : t("pages.messagesPage.groupCallIncomingAudio")
  }

  return ringingGroupCall.value.type === "video"
    ? t("pages.messagesPage.groupCallOutgoingVideo")
    : t("pages.messagesPage.groupCallOutgoingAudio")
})

const groupModalSubtitle = computed(() => {
  if (!ringingGroupCall.value) {
    return ""
  }

  return ringingGroupCall.value.direction === "incoming"
    ? t("pages.messagesPage.groupCallIncomingSubtitle")
    : t("pages.messagesPage.groupCallOutgoingSubtitle")
})

const groupModalHint = computed(() => {
  if (!ringingGroupCall.value) {
    return ""
  }

  return ringingGroupCall.value.direction === "incoming"
    ? t("pages.messagesPage.groupCallIncomingHint")
    : t("pages.messagesPage.groupCallOutgoingHint")
})

const callTypeIcon = computed(() => {
  if (!ringingCall.value) {
    return "i-ph-phone-bold"
  }

  return ringingCall.value.type === "video" ? "i-ph-video-camera-bold" : "i-ph-phone-bold"
})

const modalEyebrow = computed(() => {
  if (!ringingCall.value) {
    return ""
  }

  if (ringingCall.value.direction === "incoming") {
    return ringingCall.value.type === "video"
      ? t("pages.messagesPage.callModalIncomingVideo")
      : t("pages.messagesPage.callModalIncomingAudio")
  }

  return ringingCall.value.type === "video"
    ? t("pages.messagesPage.callModalOutgoingVideo")
    : t("pages.messagesPage.callModalOutgoingAudio")
})

const modalSubtitle = computed(() => {
  if (!ringingCall.value) {
    return ""
  }

  return ringingCall.value.direction === "incoming"
    ? t("pages.messagesPage.callModalIncomingSubtitle")
    : t("pages.messagesPage.callModalOutgoingSubtitle")
})

const modalHint = computed(() => {
  if (!ringingCall.value) {
    return ""
  }

  return ringingCall.value.direction === "incoming"
    ? t("pages.messagesPage.callModalIncomingHint")
    : t("pages.messagesPage.callModalOutgoingHint")
})

const audioCallSoundUrl = useBackendWebUrl("/themes/sunshine/mp3/calling.mp3")
const videoCallSoundUrl = useBackendWebUrl("/themes/sunshine/mp3/video_call.mp3")
let callSound: HTMLAudioElement | null = null
let pendingSoundRetry: (() => void) | null = null

function stopCallSound() {
  if (pendingSoundRetry) {
    document.removeEventListener("click", pendingSoundRetry, true)
    document.removeEventListener("touchstart", pendingSoundRetry, true)
    document.removeEventListener("keydown", pendingSoundRetry, true)
    pendingSoundRetry = null
  }

  if (callSound) {
    callSound.pause()
    callSound.currentTime = 0
    callSound = null
  }
}

function startCallSound(type: "audio" | "video") {
  stopCallSound()

  callSound = new Audio(type === "video" ? videoCallSoundUrl : audioCallSoundUrl)
  callSound.loop = true
  callSound.preload = "auto"
  callSound.volume = 0.9

  const play = () => {
    if (!callSound) {
      return
    }

    callSound.play().catch(() => {
      if (pendingSoundRetry) {
        return
      }

      pendingSoundRetry = () => {
        const retry = pendingSoundRetry
        pendingSoundRetry = null

        if (retry) {
          document.removeEventListener("click", retry, true)
          document.removeEventListener("touchstart", retry, true)
          document.removeEventListener("keydown", retry, true)
        }

        play()
      }

      document.addEventListener("click", pendingSoundRetry, true)
      document.addEventListener("touchstart", pendingSoundRetry, true)
      document.addEventListener("keydown", pendingSoundRetry, true)
    })
  }

  play()
}

watch(
  () => ringingCall.value ? `${ringingCall.value.direction}:${ringingCall.value.type}:${ringingCall.value.id}` : "",
  () => {
    if (ringingCall.value) {
      startCallSound(ringingCall.value.type)
      return
    }

    stopCallSound()
  },
  { immediate: true },
)

watch(
  () => ringingGroupCall.value ? `group:${ringingGroupCall.value.type}:${ringingGroupCall.value.id}` : "",
  () => {
    if (ringingGroupCall.value) {
      startCallSound(ringingGroupCall.value.type)
      return
    }

    if (!ringingCall.value) {
      stopCallSound()
    }
  },
  { immediate: true },
)

watch(activeCallSession, (session) => {
  if (session) {
    stopCallSound()
  }
})

watch(activeGroupCall, (session) => {
  if (session) {
    stopCallSound()
  }
})

onMounted(() => {
  const audio = new Audio(audioCallSoundUrl)
  const video = new Audio(videoCallSoundUrl)
  audio.preload = "auto"
  video.preload = "auto"
})

onBeforeUnmount(() => {
  stopCallSound()
})
</script>

<style scoped>
.message-call-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 18px 10px 8px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(168, 72, 73, 0.12), transparent 42%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.message-call-modal__halo {
  position: relative;
  display: grid;
  width: 112px;
  height: 112px;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(168, 72, 73, 0.16) 0 52%, transparent 53%),
    conic-gradient(from 180deg, rgba(168, 72, 73, 0.04), rgba(168, 72, 73, 0.34), rgba(168, 72, 73, 0.04));
}

.message-call-modal__halo--incoming {
  animation: call-pulse 1.8s ease-in-out infinite;
}

.message-call-modal__avatar {
  width: 86px !important;
  height: 86px !important;
  border: 4px solid #ffffff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
}

.message-call-modal__type {
  position: absolute;
  right: 6px;
  bottom: 8px;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 3px solid #ffffff;
  border-radius: 999px;
  background: var(--bg-brand, #a84849);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(168, 72, 73, 0.28);
}

.message-call-modal__type :deep(.iconify) {
  width: 19px;
  height: 19px;
}

.message-call-modal__copy {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.message-call-modal__copy h3 {
  max-width: min(320px, 76vw);
  overflow: hidden;
  color: #0f172a;
  font-size: 24px;
  font-weight: 850;
  line-height: 1.08;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-call-modal__eyebrow {
  color: var(--bg-brand, #a84849);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.message-call-modal__subtitle {
  color: #64748b;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
}

.message-call-modal__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding-top: 4px;
}

.message-call-modal__button {
  width: 64px;
  height: 64px;
  justify-content: center;
  border-radius: 999px;
  font-size: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
}

.message-call-modal__button :deep(.iconify) {
  width: 24px;
  height: 24px;
}

.message-call-modal__hint {
  max-width: 300px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
}

@keyframes call-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(168, 72, 73, 0.2);
  }

  50% {
    box-shadow: 0 0 0 16px rgba(168, 72, 73, 0);
  }
}
</style>
