// Description: Coordinates the LiveKit group call room and exposes page-ready state for the group call View.

import {
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type RemoteParticipant,
  type RemoteTrack,
  type TrackPublication,
} from "livekit-client"
import type { ComponentPublicInstance, Ref } from "vue"
import type { MessageGroupCallParticipant } from "../../domain/types/calls.types"
import { useGroupCallPageVM } from "../view-models/useGroupCallPageVM"

type ParticipantState = {
  key: string
  userId: number
  name: string
  avatar?: string
  isLocal: boolean
  micMuted: boolean
  cameraOff: boolean
  videoTrack: LocalVideoTrack | RemoteTrack | null
  audioElements: HTMLMediaElement[]
}

type GroupCallRoomSessionOptions = {
  onEnded: () => void
}

export function useGroupCallRoomSession(callId: Ref<number>, options: GroupCallRoomSessionOptions) {
  const vm = useGroupCallPageVM(callId)
  const {
    candidates,
    candidatesPending,
    invitePending,
    loadError,
    loading,
    payload,
    selectedCandidateIds,
  } = vm

  const participants = ref<ParticipantState[]>([])
  const inviteModalOpen = ref(false)
  const micEnabled = ref(true)
  const cameraEnabled = ref(true)
  const remoteAudioMuted = ref(false)
  const elapsedSeconds = ref(0)
  const audioSink = ref<HTMLElement | null>(null)
  const videoNodes = new Map<string, HTMLElement>()

  let room: Room | null = null
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let elapsedTimer: ReturnType<typeof setInterval> | null = null
  let hasLeft = false
  let currentFacingMode: "user" | "environment" = "user"

  const mediaSupported = computed(() =>
    import.meta.client
    && typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia),
  )

  const participantList = computed(() => participants.value)

  const gridStyle = computed(() => ({
    "--participant-count": String(Math.max(1, participants.value.length)),
  }))

  const gridClasses = computed(() => {
    const count = participants.value.length

    return {
      "group-call-page__grid--empty": count === 0,
      "group-call-page__grid--single": count === 1,
      "group-call-page__grid--two": count === 2,
      "group-call-page__grid--three": count === 3,
      "group-call-page__grid--many": count >= 4,
    }
  })

  const elapsedLabel = computed(() => {
    const hours = Math.floor(elapsedSeconds.value / 3600)
    const minutes = Math.floor((elapsedSeconds.value % 3600) / 60)
    const seconds = elapsedSeconds.value % 60

    return hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  })

  function participantKey(userId: number) {
    return `user:${userId}`
  }

  function upsertParticipant(input: Partial<ParticipantState> & { userId: number, name: string }) {
    const key = participantKey(input.userId)
    const current = participants.value.find(participant => participant.key === key)

    if (current) {
      Object.assign(current, input)
      participants.value = [...participants.value]
      return current
    }

    const next: ParticipantState = {
      key,
      userId: input.userId,
      name: input.name,
      avatar: input.avatar,
      isLocal: Boolean(input.isLocal),
      micMuted: Boolean(input.micMuted),
      cameraOff: Boolean(input.cameraOff),
      videoTrack: input.videoTrack ?? null,
      audioElements: input.audioElements ?? [],
    }

    participants.value = [...participants.value, next]
    return next
  }

  function parseParticipantMeta(participant: RemoteParticipant | LocalParticipant, fallback?: MessageGroupCallParticipant) {
    let metadata: Record<string, unknown> = {}

    try {
      metadata = participant.metadata ? JSON.parse(participant.metadata) : {}
    }
    catch {
      metadata = {}
    }

    return {
      userId: Number(metadata.user_id ?? fallback?.userId ?? 0),
      name: String(metadata.name ?? participant.name ?? participant.identity ?? fallback?.name ?? "Participant"),
      avatar: String(metadata.avatar ?? fallback?.avatar ?? ""),
    }
  }

  function updateParticipantFromPublications(participant: RemoteParticipant | LocalParticipant, isLocal = false) {
    const meta = parseParticipantMeta(participant, isLocal ? {
      userId: payload.value?.currentUser.id ?? 0,
      name: payload.value?.currentUser.name ?? "You",
      avatar: payload.value?.currentUser.avatar,
    } : undefined)

    if (!meta.userId) {
      return
    }

    let micMuted = isLocal ? !micEnabled.value : false
    let cameraOff = payload.value?.type === "audio" || (isLocal && payload.value?.type === "video" && !cameraEnabled.value)
    let videoTrack: ParticipantState["videoTrack"] = null

    participant.trackPublications.forEach((publication: TrackPublication) => {
      if (publication.kind === Track.Kind.Audio) {
        micMuted = publication.isMuted === true || publication.track?.isMuted === true
      }
      if (publication.kind === Track.Kind.Video) {
        cameraOff = publication.isMuted === true || publication.track?.isMuted === true
        videoTrack = publication.track as ParticipantState["videoTrack"]
      }
    })

    upsertParticipant({ userId: meta.userId, name: meta.name, avatar: meta.avatar, isLocal, micMuted, cameraOff, videoTrack })
    void nextTick(attachVideoTracks)
  }

  function seedParticipants(list: MessageGroupCallParticipant[]) {
    for (const participant of list) {
      const current = participants.value.find(item => item.userId === participant.userId)

      if (current) {
        upsertParticipant({
          userId: participant.userId,
          name: participant.name || current.name,
          avatar: participant.avatar || current.avatar,
          isLocal: current.isLocal,
        })
        continue
      }

      upsertParticipant({
        userId: participant.userId,
        name: participant.name,
        avatar: participant.avatar,
        isLocal: participant.userId === payload.value?.currentUser.id,
        cameraOff: payload.value?.type === "audio",
        micMuted: false,
      })
    }
  }

  function setVideoNode(key: string, node: Element | ComponentPublicInstance | null) {
    if (node instanceof HTMLElement) {
      videoNodes.set(key, node)
      void nextTick(attachVideoTracks)
    }
    else {
      videoNodes.delete(key)
    }
  }

  function attachVideoTracks() {
    for (const participant of participants.value) {
      const node = videoNodes.get(participant.key)
      if (!node) continue

      if (!participant.videoTrack || participant.cameraOff || payload.value?.type === "audio") {
        node.innerHTML = ""
        continue
      }

      const current = node.querySelector("video")
      if (current && current.dataset.trackSid === participant.videoTrack.sid) {
        continue
      }

      node.innerHTML = ""
      const element = participant.videoTrack.attach() as HTMLVideoElement
      element.autoplay = true
      element.playsInline = true
      element.muted = participant.isLocal
      element.dataset.trackSid = participant.videoTrack.sid
      node.appendChild(element)
    }
  }

  function attachAudioTrack(track: RemoteTrack, participant: RemoteParticipant) {
    const meta = parseParticipantMeta(participant)
    if (!meta.userId) return

    const state = upsertParticipant({ userId: meta.userId, name: meta.name, avatar: meta.avatar, isLocal: false })

    state.audioElements.forEach(element => element.remove())
    const element = track.attach() as HTMLMediaElement
    element.autoplay = true
    element.muted = remoteAudioMuted.value
    state.audioElements = [element]
    audioSink.value?.appendChild(element)
  }

  async function connectRoom() {
    if (!payload.value?.livekitConfigured || !payload.value.wsUrl || !payload.value.token) {
      vm.setLoadError("LiveKit is not configured for this group call.")
      return
    }

    room = new Room({ adaptiveStream: true, dynacast: true })
    room.on(RoomEvent.ParticipantConnected, participant => updateParticipantFromPublications(participant))
    room.on(RoomEvent.ParticipantDisconnected, participant => {
      const meta = parseParticipantMeta(participant)
      participants.value = participants.value.filter(item => item.userId !== meta.userId)
    })
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        attachAudioTrack(track, participant)
      }
      updateParticipantFromPublications(participant)
    })
    room.on(RoomEvent.TrackUnsubscribed, (_track, _publication, participant) => updateParticipantFromPublications(participant))
    room.on(RoomEvent.TrackMuted, (_publication, participant) => updateParticipantFromPublications(participant, participant === room?.localParticipant))
    room.on(RoomEvent.TrackUnmuted, (_publication, participant) => updateParticipantFromPublications(participant, participant === room?.localParticipant))
    room.on(RoomEvent.LocalTrackPublished, () => updateParticipantFromPublications(room!.localParticipant, true))
    room.on(RoomEvent.LocalTrackUnpublished, () => updateParticipantFromPublications(room!.localParticipant, true))

    await room.connect(payload.value.wsUrl, payload.value.token)

    if (mediaSupported.value) {
      await room.localParticipant.setMicrophoneEnabled(true).catch(() => {
        micEnabled.value = false
      })

      if (payload.value.type === "video") {
        await room.localParticipant.setCameraEnabled(true).catch(() => {
          cameraEnabled.value = false
        })
      }
    }

    updateParticipantFromPublications(room.localParticipant, true)
    room.remoteParticipants.forEach(participant => updateParticipantFromPublications(participant))
  }

  function startTimers() {
    elapsedTimer = setInterval(() => { elapsedSeconds.value += 1 }, 1000)
    syncTimer = setInterval(() => { void runSync() }, 3000)
  }

  async function toggleMic() {
    if (!room || !mediaSupported.value) return
    const next = !micEnabled.value
    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      micEnabled.value = next
      updateParticipantFromPublications(room.localParticipant, true)
    }
    catch {
      micEnabled.value = !next
    }
  }

  async function toggleCamera() {
    if (!room || payload.value?.type === "audio" || !mediaSupported.value) return
    const next = !cameraEnabled.value
    try {
      await room.localParticipant.setCameraEnabled(next)
      cameraEnabled.value = next
      updateParticipantFromPublications(room.localParticipant, true)
    }
    catch {
      cameraEnabled.value = !next
    }
  }

  function toggleRemoteAudio() {
    remoteAudioMuted.value = !remoteAudioMuted.value
    participants.value.forEach(participant => {
      participant.audioElements.forEach(element => { element.muted = remoteAudioMuted.value })
    })
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

  async function runSync() {
    if (hasLeft) return

    const sync = await vm.syncCall().catch(() => null)

    if (!sync || sync.status !== 200 || sync.callStatus !== "active") {
      if (!sync) {
        return
      }

      options.onEnded()
      return
    }

    seedParticipants(sync.participants)
  }

  async function openInviteModal() {
    inviteModalOpen.value = true
    await vm.fetchCandidates()
  }

  function closeInviteModal() {
    inviteModalOpen.value = false
  }

  function toggleCandidate(userId: number, checked: boolean) {
    vm.toggleCandidate(userId, checked)
  }

  async function inviteSelected() {
    const ok = await vm.inviteSelected()

    if (ok) {
      closeInviteModal()
    }
  }

  async function leaveCall() {
    if (hasLeft) return
    hasLeft = true
    await vm.leaveCall()
    room?.disconnect()
    options.onEnded()
  }

  function leaveCallKeepalive() {
    if (hasLeft || !payload.value?.id || !import.meta.client) {
      return
    }

    hasLeft = true
    vm.leaveCallKeepalive()
  }

  onMounted(async () => {
    if (!callId.value) {
      options.onEnded()
      return
    }

    try {
      const loaded = await vm.loadPayload()
      cameraEnabled.value = loaded.type === "video"
      seedParticipants(loaded.participants)
      elapsedSeconds.value = Math.max(
        0,
        (loaded.serverNow || Math.floor(Date.now() / 1000)) - loaded.startedAt,
      )
      await connectRoom()
      startTimers()
      window.addEventListener("pagehide", leaveCallKeepalive)
      window.addEventListener("beforeunload", leaveCallKeepalive)
    }
    catch (error: any) {
      vm.setLoadError(error?.data?.statusMessage || error?.statusMessage || error?.message || "Can not open this group call.")
    }
    finally {
      loading.value = false
    }
  })

  onBeforeUnmount(() => {
    if (import.meta.client) {
      window.removeEventListener("pagehide", leaveCallKeepalive)
      window.removeEventListener("beforeunload", leaveCallKeepalive)
    }
    if (syncTimer) clearInterval(syncTimer)
    if (elapsedTimer) clearInterval(elapsedTimer)
    if (!hasLeft && payload.value?.id) {
      void vm.leaveCall()
    }
    room?.disconnect()
  })

  return {
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
  }
}
