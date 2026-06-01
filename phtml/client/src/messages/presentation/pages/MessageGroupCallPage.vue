<!-- English description: Nuxt-rendered LiveKit group call room with responsive gallery and Nuxt UI controls. -->
<template>
  <Teleport to="body">
  <div class="group-call-page" :class="{ 'group-call-page--audio': payload?.type === 'audio' }">
    <header class="group-call-page__header">
      <div class="group-call-page__title">
        <UAvatar :src="payload?.groupAvatar" :alt="payload?.groupName || 'Group call'" size="sm" />
        <h1>{{ payload?.groupName || $t("pages.messagesPage.groupCall") }}</h1>
      </div>
      <span class="group-call-page__timer">{{ elapsedLabel }}</span>
    </header>

    <main v-if="loadError" class="group-call-page__state">
      <UIcon name="i-ph-warning-circle-bold" />
      <h2>{{ $t("pages.messagesPage.groupCallErrorTitle") }}</h2>
      <p>{{ loadError }}</p>
      <UButton color="error" icon="i-ph-arrow-left-bold" @click="leaveCall">
        {{ $t("pages.messagesPage.close") }}
      </UButton>
    </main>

    <main v-else-if="loading" class="group-call-page__state">
      <UIcon name="i-ph-spinner-gap-bold" class="group-call-page__spinner" />
      <h2>{{ $t("pages.messagesPage.groupCallConnecting") }}</h2>
      <p>{{ $t("pages.messagesPage.groupCallConnectingHint") }}</p>
    </main>

    <main v-else class="group-call-page__grid" :class="gridClasses" :style="gridStyle">
      <article
        v-for="participant in participantList"
        :key="participant.key"
        class="group-call-page__tile"
      >
        <div
          :ref="(node) => setVideoNode(participant.key, node)"
          class="group-call-page__media"
          :class="{ 'group-call-page__media--hidden': !participant.videoTrack || participant.cameraOff || payload?.type === 'audio' }"
        />

        <div v-if="!participant.videoTrack || participant.cameraOff || payload?.type === 'audio'" class="group-call-page__avatar-wrap">
          <UAvatar :src="participant.avatar" :alt="participant.name" size="3xl" class="group-call-page__avatar" />
        </div>

        <div class="group-call-page__badges">
          <span v-if="participant.micMuted" class="group-call-page__badge group-call-page__badge--danger">
            <UIcon name="i-ph-microphone-slash-bold" />
          </span>
          <span v-if="payload?.type === 'video' && participant.cameraOff" class="group-call-page__badge">
            <UIcon name="i-ph-video-camera-slash-bold" />
          </span>
        </div>

        <div class="group-call-page__name">
          {{ participant.name }}{{ participant.isLocal ? ` (${$t("pages.messagesPage.you")})` : "" }}
        </div>
      </article>
    </main>

    <div ref="audioSink" class="group-call-page__audio-sink" />

    <div class="group-call-page__toolbar">
      <UButton
        :icon="remoteAudioMuted ? 'i-ph-speaker-slash-bold' : 'i-ph-speaker-high-bold'"
        color="neutral"
        variant="solid"
        square
        class="group-call-page__control"
        :class="{ 'group-call-page__control--muted': remoteAudioMuted }"
        @click="toggleRemoteAudio"
      />
      <UButton
        :icon="micEnabled ? 'i-ph-microphone-bold' : 'i-ph-microphone-slash-bold'"
        color="neutral"
        variant="solid"
        square
        class="group-call-page__control"
        :class="{ 'group-call-page__control--muted': !micEnabled }"
        :disabled="!mediaSupported"
        @click="toggleMic"
      />
      <UButton
        v-if="payload?.type === 'video'"
        :icon="cameraEnabled ? 'i-ph-video-camera-bold' : 'i-ph-video-camera-slash-bold'"
        color="neutral"
        variant="solid"
        square
        class="group-call-page__control"
        :class="{ 'group-call-page__control--muted': !cameraEnabled }"
        :disabled="!mediaSupported"
        @click="toggleCamera"
      />
      <UButton
        v-if="payload?.type === 'video'"
        icon="i-ph-camera-rotate-bold"
        color="neutral"
        variant="solid"
        square
        class="group-call-page__control"
        :disabled="!cameraEnabled"
        @click="flipCamera"
      />
      <UButton
        icon="i-ph-user-plus-bold"
        color="neutral"
        variant="solid"
        square
        class="group-call-page__control"
        @click="openInviteModal"
      />
      <UButton
        icon="i-ph-phone-disconnect-bold"
        color="error"
        variant="solid"
        square
        class="group-call-page__control group-call-page__control--end"
        @click="leaveCall"
      />
    </div>

    <UModal v-model:open="inviteModalOpen">
      <template #content>
        <div class="group-call-page__modal">
          <header class="group-call-page__modal-header">
            <h2>{{ $t("pages.messagesPage.groupCallInviteMembers") }}</h2>
            <UButton icon="i-ph-x-bold" color="neutral" variant="ghost" square @click="closeInviteModal" />
          </header>
          <div class="group-call-page__candidates">
            <label v-for="candidate in candidates" :key="candidate.userId" class="group-call-page__candidate">
              <UCheckbox
                :model-value="selectedCandidateIds.includes(candidate.userId)"
                @update:model-value="toggleCandidate(candidate.userId, Boolean($event))"
              />
              <UAvatar :src="candidate.avatar" :alt="candidate.name" size="sm" />
              <span>{{ candidate.name }}</span>
            </label>
            <p v-if="!candidatesPending && candidates.length === 0" class="group-call-page__empty">
              {{ $t("pages.messagesPage.groupCallNoCandidates") }}
            </p>
          </div>
          <footer class="group-call-page__modal-actions">
            <UButton color="neutral" variant="soft" @click="closeInviteModal">
              {{ $t("pages.messagesPage.cancel") }}
            </UButton>
            <UButton :loading="invitePending" :disabled="selectedCandidateIds.length === 0" @click="inviteSelected">
              {{ $t("pages.messagesPage.groupCallInvite") }}
            </UButton>
          </footer>
        </div>
      </template>
    </UModal>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useGroupCallRoomSession } from "../../application/composables/useGroupCallRoomSession"

const props = defineProps<{
  callId?: number
}>()

const emit = defineEmits<{
  ended: []
}>()

const callId = computed(() => Number(props.callId || 0))

const {
  audioSink,
  cameraEnabled,
  candidates,
  candidatesPending,
  closeInviteModal,
  elapsedLabel,
  flipCamera,
  gridClasses,
  gridStyle,
  inviteModalOpen,
  invitePending,
  inviteSelected,
  leaveCall,
  loadError,
  loading,
  mediaSupported,
  micEnabled,
  openInviteModal,
  participantList,
  payload,
  remoteAudioMuted,
  selectedCandidateIds,
  setVideoNode,
  toggleCamera,
  toggleCandidate,
  toggleMic,
  toggleRemoteAudio,
} = useGroupCallRoomSession(callId, {
  onEnded: () => emit("ended"),
})

</script>

<style scoped>
.group-call-page {
  position: fixed;
  inset: 0;
  z-index: 90;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #05070d;
  color: #fff;
  padding: 14px 14px 118px;
  overflow: hidden;
}

.group-call-page__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 50px;
}

.group-call-page__title {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.group-call-page__title h1 {
  max-width: min(62vw, 760px);
  overflow: hidden;
  font-size: clamp(20px, 3vw, 34px);
  font-weight: 750;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-call-page__timer {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  padding: 9px 16px;
  color: #eef2ff;
  font-size: 15px;
  font-weight: 650;
}

.group-call-page__grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  align-content: center;
  justify-content: center;
}

.group-call-page__grid--empty,
.group-call-page__grid--single {
  grid-template-columns: minmax(320px, min(100%, 980px));
  grid-auto-rows: minmax(0, 1fr);
  place-content: center;
}

.group-call-page__grid--two {
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  grid-auto-rows: minmax(0, 1fr);
}

.group-call-page__grid--three {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.group-call-page__grid--three .group-call-page__tile:first-child {
  grid-row: span 2;
}

.group-call-page__grid--many {
  grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
  grid-auto-rows: minmax(0, 1fr);
}

.group-call-page__state {
  display: grid;
  flex: 1;
  max-width: 520px;
  margin: 0 auto;
  place-content: center;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.group-call-page__state .iconify {
  width: 54px;
  height: 54px;
  color: #f87171;
}

.group-call-page__state h2 {
  font-size: 24px;
  font-weight: 750;
}

.group-call-page__state p {
  color: #cbd5e1;
  font-size: 15px;
  line-height: 1.5;
}

.group-call-page__spinner {
  color: #93c5fd !important;
  animation: group-call-spin 1s linear infinite;
}

@keyframes group-call-spin {
  to {
    transform: rotate(360deg);
  }
}

.group-call-page--audio .group-call-page__grid {
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
}

.group-call-page--audio .group-call-page__grid--single {
  grid-template-columns: minmax(280px, min(100%, 620px));
}

.group-call-page__tile {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  aspect-ratio: auto;
  background: #020617;
  box-shadow: 0 16px 34px rgba(2, 6, 23, 0.3);
}

.group-call-page__grid--single .group-call-page__tile {
  aspect-ratio: auto;
  max-height: 100%;
}

.group-call-page__grid--two .group-call-page__tile {
  aspect-ratio: auto;
}

.group-call-page__grid--three .group-call-page__tile {
  aspect-ratio: auto;
}

.group-call-page__media,
.group-call-page__avatar-wrap {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.group-call-page__media :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-call-page__media--hidden {
  display: none;
}

.group-call-page__avatar {
  width: min(38vw, 156px) !important;
  height: min(38vw, 156px) !important;
  border: 4px solid rgba(255, 255, 255, 0.12);
}

.group-call-page__badges {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 3;
  display: inline-flex;
  gap: 8px;
}

.group-call-page__badge {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  color: #fff;
  backdrop-filter: blur(14px);
}

.group-call-page__badge :deep(.iconify) {
  width: 18px;
  height: 18px;
}

.group-call-page__badge--danger {
  background: rgba(220, 38, 38, 0.94);
}

.group-call-page__name {
  position: absolute;
  bottom: 12px;
  right: 5px;
  z-index: 2;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  padding: 8px 13px;
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
  backdrop-filter: blur(14px);
}

.group-call-page__grid--two .group-call-page__badges {
  top: 12px;
  bottom: auto;
}

.group-call-page__grid--two .group-call-page__name {
  right: 5px;
  max-width: calc(100% - 24px);
}

.group-call-page__audio-sink {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.group-call-page__toolbar {
  position: fixed;
  left: 50%;
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 4;
  display: flex;
  max-width: calc(100vw - 28px);
  transform: translateX(-50%);
  gap: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  background: rgba(9, 14, 26, 0.76);
  padding: 10px;
  backdrop-filter: blur(18px);
}

.group-call-page__control {
  width: 64px;
  height: 64px;
  justify-content: center;
  border-radius: 999px;
  background: rgba(51, 65, 85, 0.92);
  color: #fff;
}

.group-call-page__control :deep(.iconify) {
  width: 28px;
  height: 28px;
}

.group-call-page__control--muted {
  background: #7f1d1d;
}

.group-call-page__control--end {
  background: #ef4444;
}

.group-call-page__modal {
  padding: 18px;
}

.group-call-page__modal-header,
.group-call-page__modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.group-call-page__modal-header h2 {
  font-size: 18px;
  font-weight: 750;
}

.group-call-page__candidates {
  display: grid;
  max-height: 360px;
  overflow: auto;
  padding: 14px 0;
}

.group-call-page__candidate {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.group-call-page__empty {
  color: #64748b;
  font-size: 14px;
}

@media (max-width: 768px) {
  .group-call-page {
    padding: 10px 8px 108px;
  }

  .group-call-page__header {
    justify-content: space-between;
  }

  .group-call-page__title h1 {
    max-width: 58vw;
    font-size: 20px;
  }

  .group-call-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: minmax(0, 1fr);
    gap: 8px;
    align-content: stretch;
  }

  .group-call-page__grid--empty,
  .group-call-page__grid--single {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: minmax(0, 1fr);
    place-content: stretch;
  }

  .group-call-page__grid--two {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }

  .group-call-page__grid--two .group-call-page__badges {
    top: 8px;
    bottom: auto;
  }

  .group-call-page__grid--two .group-call-page__name {
    right: 8px;
    max-width: calc(100% - 16px);
  }

  .group-call-page__grid--three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: 1.15fr 1fr;
  }

  .group-call-page__grid--three .group-call-page__tile:first-child {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .group-call-page__grid--many {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: minmax(0, 1fr);
  }

  .group-call-page__tile {
    min-height: 0;
    border-radius: 14px;
    aspect-ratio: auto;
  }

  .group-call-page__grid--single .group-call-page__tile {
    min-height: 0;
    aspect-ratio: auto;
  }

  .group-call-page__toolbar {
    gap: 6px;
    padding: 8px;
  }

  .group-call-page__control {
    width: 58px;
    height: 58px;
  }
}

@media (max-width: 420px) {
  .group-call-page__grid--many {
    grid-auto-rows: minmax(0, 1fr);
  }

  .group-call-page__name {
    right: 8px;
    bottom: 8px;
    padding: 7px 10px;
    font-size: 12px;
  }

  .group-call-page__badges {
    bottom: 8px;
  }

  .group-call-page__badge {
    width: 30px;
    height: 30px;
  }

  .group-call-page__badge :deep(.iconify) {
    width: 16px;
    height: 16px;
  }

  .group-call-page__toolbar {
    gap: 5px;
    padding: 7px;
  }

  .group-call-page__control {
    width: 56px;
    height: 56px;
  }

  .group-call-page__control :deep(.iconify) {
    width: 24px;
    height: 24px;
  }
}
</style>
