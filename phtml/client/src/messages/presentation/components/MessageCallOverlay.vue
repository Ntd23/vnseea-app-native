<!-- Description: Responsive LiveKit one-to-one call surface for message audio and video calls. -->
<template>
  <Teleport to="body">
    <div class="message-call" :class="{ 'message-call--audio': session.type === 'audio' }">
      <div class="message-call__stage">
        <div ref="remoteMedia" class="message-call__remote">
          <div v-if="!remoteVideoActive || session.type === 'audio'" class="message-call__poster">
            <UAvatar :src="session.peer.avatar" size="3xl" :alt="session.peer.name" />
            <h2>{{ session.peer.name }}</h2>
            <p>{{ statusLabel }}</p>
            <span>{{ elapsedLabel }}</span>
            <UButton
              v-if="audioPlaybackBlocked"
              icon="i-ph-speaker-high-bold"
              color="neutral"
              variant="solid"
              class="message-call__sound-button"
              aria-label="Bat am thanh"
              @click="resumeRemoteAudio"
            >
              Bat am thanh
            </UButton>
          </div>
        </div>

        <div v-if="session.type === 'video'" ref="localMedia" class="message-call__local">
          <div v-if="!localVideoActive" class="message-call__local-placeholder">
            <UIcon name="i-ph-video-camera-slash-bold" />
          </div>
        </div>
      </div>

      <div ref="audioSink" class="message-call__audio-sink" />

      <div class="message-call__toolbar">
        <UButton
          v-if="audioPlaybackBlocked"
          icon="i-ph-speaker-high-bold"
          color="neutral"
          variant="solid"
          square
          class="message-call__control message-call__control--sound"
          aria-label="Bat am thanh"
          @click="resumeRemoteAudio"
        />
        <UButton
          :icon="remoteAudioMuted ? 'i-ph-speaker-slash-bold' : 'i-ph-speaker-high-bold'"
          color="neutral"
          variant="solid"
          square
          class="message-call__control"
          :class="{ 'message-call__control--muted': remoteAudioMuted }"
          :aria-label="remoteAudioMuted ? 'Bat am thanh nguoi doi dien' : 'Tat am thanh nguoi doi dien'"
          @click="toggleRemoteAudio"
        />
        <UButton
          :icon="micEnabled ? 'i-ph-microphone-bold' : 'i-ph-microphone-slash-bold'"
          color="neutral"
          variant="solid"
          square
          class="message-call__control"
          :class="{ 'message-call__control--muted': !micEnabled }"
          :disabled="!mediaSupported"
          aria-label="Microphone"
          @click="toggleMic"
        />
        <UButton
          v-if="session.type === 'video'"
          :icon="cameraEnabled ? 'i-ph-video-camera-bold' : 'i-ph-video-camera-slash-bold'"
          color="neutral"
          variant="solid"
          square
          class="message-call__control"
          :class="{ 'message-call__control--muted': !cameraEnabled }"
          :disabled="!mediaSupported"
          aria-label="Camera"
          @click="toggleCamera"
        />
        <UButton
          v-if="session.type === 'video'"
          icon="i-ph-camera-rotate-bold"
          color="neutral"
          variant="solid"
          square
          class="message-call__control"
          aria-label="Switch camera"
          @click="flipCamera"
        />
        <UButton
          icon="i-ph-phone-disconnect-bold"
          color="error"
          variant="solid"
          square
          class="message-call__control message-call__control--end"
          aria-label="End call"
          @click="endCall"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client"
import type { MessageCallSession } from "../../domain/types/calls.types"

const props = defineProps<{
  session: MessageCallSession
}>()

const emit = defineEmits<{
  ended: [duration: number]
}>()

const remoteMedia = ref<HTMLElement | null>(null)
const localMedia = ref<HTMLElement | null>(null)
const audioSink = ref<HTMLElement | null>(null)
const statusLabel = ref("Connecting")
const micEnabled = ref(true)
const cameraEnabled = ref(props.session.type === "video")
const remoteAudioMuted = ref(false)
const remoteVideoActive = ref(false)
const localVideoActive = ref(false)
const audioPlaybackBlocked = ref(false)
const elapsedSeconds = ref(0)
let room: Room | null = null
let timer: ReturnType<typeof setInterval> | null = null
let currentFacingMode: "user" | "environment" = "user"
let remoteAudioElements: HTMLMediaElement[] = []
let hasEnded = false

const mediaSupported = computed(() =>
  import.meta.client
  && typeof navigator !== "undefined"
  && Boolean(navigator.mediaDevices?.getUserMedia),
)

const elapsedLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60).toString().padStart(2, "0")
  const seconds = (elapsedSeconds.value % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
})

function clearNode(node: HTMLElement | null) {
  if (!node) return
  node.querySelectorAll("video,audio").forEach(element => element.remove())
}

function startTimer() {
  if (timer) {
    return
  }

  timer = setInterval(() => {
    elapsedSeconds.value += 1
  }, 1000)
}

function stopTimer() {
  if (!timer) {
    return
  }

  clearInterval(timer)
  timer = null
}

async function playRemoteAudio(element: HTMLMediaElement) {
  try {
    await element.play()
    audioPlaybackBlocked.value = false
  }
  catch {
    audioPlaybackBlocked.value = true
  }
}

function resumeRemoteAudio() {
  audioPlaybackBlocked.value = false
  remoteAudioElements.forEach(element => playRemoteAudio(element))
}

function syncRemoteAudioMuted() {
  remoteAudioElements.forEach((element) => {
    element.muted = remoteAudioMuted.value
  })
}

function toggleRemoteAudio() {
  remoteAudioMuted.value = !remoteAudioMuted.value
  syncRemoteAudioMuted()
}

function attachRemoteTrack(track: RemoteTrack, participant: RemoteParticipant) {
  const element = track.attach() as HTMLMediaElement
  element.autoplay = true
  if ("playsInline" in element) {
    ;(element as HTMLVideoElement).playsInline = true
  }
  element.dataset.participant = participant.identity

  if (track.kind === Track.Kind.Video) {
    clearNode(remoteMedia.value)
    remoteMedia.value?.appendChild(element)
    remoteVideoActive.value = true
    return
  }

  remoteAudioElements.push(element)
  element.muted = remoteAudioMuted.value
  audioSink.value?.appendChild(element)
  playRemoteAudio(element)
}

function detachTrack(track: RemoteTrack | Track) {
  track.detach().forEach((element) => {
    remoteAudioElements = remoteAudioElements.filter(audio => audio !== element)
    element.remove()
  })
  remoteVideoActive.value = Boolean(remoteMedia.value?.querySelector("video"))
  localVideoActive.value = Boolean(localMedia.value?.querySelector("video"))
  audioPlaybackBlocked.value = remoteAudioElements.length > 0 && audioPlaybackBlocked.value
}

function attachLocalVideo() {
  if (!room || props.session.type === "audio") {
    return
  }

  clearNode(localMedia.value)
  room.localParticipant.videoTrackPublications.forEach((publication) => {
    if (!publication.track) {
      return
    }
    const element = publication.track.attach()
    element.autoplay = true
    element.muted = true
    if ("playsInline" in element) {
      ;(element as HTMLVideoElement).playsInline = true
    }
    localMedia.value?.appendChild(element)
    localVideoActive.value = true
  })
}

async function connect() {
  room = new Room({ adaptiveStream: true, dynacast: true })
  room.on(RoomEvent.ParticipantConnected, () => {
    statusLabel.value = "Connected"
  })
  room.on(RoomEvent.ParticipantDisconnected, () => {
    if (room?.remoteParticipants.size === 0) {
      completeCall()
    }
  })
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    attachRemoteTrack(track, participant)
    statusLabel.value = "Connected"
  })
  room.on(RoomEvent.TrackUnsubscribed, track => detachTrack(track))
  room.on(RoomEvent.LocalTrackPublished, () => attachLocalVideo())
  room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
    if (publication.track) detachTrack(publication.track)
  })
  room.on(RoomEvent.Disconnected, () => {
    statusLabel.value = "Disconnected"
    completeCall()
  })

  await room.connect(props.session.wsUrl, props.session.token)
  if (!mediaSupported.value) {
    micEnabled.value = false
    cameraEnabled.value = false
    statusLabel.value = "Can nghe/goi tren HTTPS hoac 127.0.0.1 de dung micro/camera"
  }
  else {
    try {
      await room.localParticipant.setMicrophoneEnabled(true)
      micEnabled.value = true
    }
    catch {
      micEnabled.value = false
      statusLabel.value = "Khong bat duoc microphone"
    }
  }

  if (props.session.type === "video" && mediaSupported.value) {
    try {
      await room.localParticipant.setCameraEnabled(true)
      cameraEnabled.value = true
      attachLocalVideo()
    }
    catch {
      cameraEnabled.value = false
      localVideoActive.value = false
      statusLabel.value = "Khong bat duoc camera"
    }
  }

  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication: RemoteTrackPublication) => {
      if (publication.track) {
        attachRemoteTrack(publication.track, participant)
      }
    })
  })

  if (room.remoteParticipants.size > 0) {
    statusLabel.value = "Connected"
  }
  else if (statusLabel.value === "Connecting") {
    statusLabel.value = "Waiting"
  }
}

async function toggleMic() {
  if (!room || !mediaSupported.value) return
  micEnabled.value = !micEnabled.value
  try {
    await room.localParticipant.setMicrophoneEnabled(micEnabled.value)
  }
  catch {
    micEnabled.value = !micEnabled.value
    statusLabel.value = "Khong doi duoc microphone"
  }
}

async function toggleCamera() {
  if (!room || props.session.type === "audio" || !mediaSupported.value) return
  cameraEnabled.value = !cameraEnabled.value
  try {
    await room.localParticipant.setCameraEnabled(cameraEnabled.value)
  }
  catch {
    cameraEnabled.value = !cameraEnabled.value
    statusLabel.value = "Khong doi duoc camera"
    return
  }
  if (cameraEnabled.value) {
    attachLocalVideo()
  }
  else {
    clearNode(localMedia.value)
    localVideoActive.value = false
  }
}

async function flipCamera() {
  if (!room || !cameraEnabled.value) return
  const cameraTrack = Array.from(room.localParticipant.videoTrackPublications.values())
    .map(publication => publication.track)
    .find((track): track is LocalVideoTrack => track instanceof LocalVideoTrack)

  if (!cameraTrack) return

  currentFacingMode = currentFacingMode === "user" ? "environment" : "user"
  await cameraTrack.restartTrack({ facingMode: currentFacingMode }).catch(() => null)
}

function completeCall() {
  if (hasEnded) {
    return
  }

  hasEnded = true
  stopTimer()
  if (room) {
    room.disconnect()
    room = null
  }
  emit("ended", elapsedSeconds.value)
}

function endCall() {
  completeCall()
}

onMounted(() => {
  startTimer()
  connect().catch(() => {
    statusLabel.value = "Can not connect"
    completeCall()
  })
})

onBeforeUnmount(() => {
  stopTimer()
  if (room) room.disconnect()
})
</script>

<style scoped>
.message-call {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #070a12;
  color: #ffffff;
}

.message-call__stage {
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.message-call__remote {
  position: absolute;
  inset: 0;
  background: #020617;
}

.message-call__remote :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #020617;
}

.message-call__poster {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 35%, rgba(88, 101, 242, 0.18), transparent 42%),
    linear-gradient(180deg, #111827, #05070d);
}

.message-call__poster h2 {
  max-width: min(560px, 86vw);
  overflow: hidden;
  color: #f8fafc;
  font-size: clamp(28px, 6vw, 56px);
  font-weight: 700;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-call__poster p,
.message-call__poster span {
  color: #cbd5e1;
  font-size: 16px;
  font-weight: 600;
}

.message-call__sound-button {
  min-height: 42px;
  border-radius: 999px;
  background: #ffffff;
  color: #111827;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 800;
}

.message-call__sound-button :deep(.iconify) {
  width: 18px;
  height: 18px;
}

.message-call__local {
  position: fixed;
  top: max(18px, env(safe-area-inset-top));
  right: 18px;
  z-index: 2;
  width: min(28vw, 220px);
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.24);
  border-radius: 24px;
  background: #111827;
  box-shadow: 0 20px 40px rgba(2, 6, 23, 0.36);
}

.message-call__local :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-call__local-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #94a3b8;
  font-size: 28px;
}

.message-call__audio-sink {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.message-call__toolbar {
  position: fixed;
  left: 50%;
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 3;
  display: flex;
  max-width: calc(100vw - 24px);
  transform: translateX(-50%);
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 999px;
  background: rgba(9, 14, 26, 0.72);
  padding: 12px;
  backdrop-filter: blur(18px);
}

.message-call__control {
  width: 68px;
  height: 68px;
  justify-content: center;
  border-radius: 999px;
  background: rgba(51, 65, 85, 0.92);
  color: #ffffff;
  font-size: 28px;
}

.message-call__control :deep(.iconify) {
  width: 28px;
  height: 28px;
}

.message-call__control:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.message-call__control--muted {
  background: #7f1d1d;
}

.message-call__control--end {
  background: #ef4444;
}

.message-call__control--sound {
  background: #ffffff;
  color: #111827;
}

@media (max-width: 640px) {
  .message-call {
    align-items: stretch;
    justify-content: stretch;
    padding: 0;
  }

  .message-call__stage {
    width: 100vw;
    height: 100svh;
    max-height: none;
    min-height: 100svh;
    flex: 1 1 auto;
    aspect-ratio: auto;
    border-radius: 0;
    box-shadow: none;
  }

  .message-call__remote,
  .message-call__poster {
    border-radius: 0;
  }

  .message-call__remote :deep(video) {
    object-fit: cover;
  }

  .message-call__local {
    top: max(22px, calc(env(safe-area-inset-top) + 14px));
    right: 14px;
    width: min(36vw, 144px);
    border-radius: 18px;
  }

  .message-call__toolbar {
    bottom: max(18px, env(safe-area-inset-bottom));
    gap: 10px;
    padding: 10px;
  }

  .message-call__control {
    width: clamp(62px, 18vw, 72px);
    height: clamp(62px, 18vw, 72px);
    font-size: 26px;
  }

  .message-call__control :deep(.iconify) {
    width: 26px;
    height: 26px;
  }
}
</style>
