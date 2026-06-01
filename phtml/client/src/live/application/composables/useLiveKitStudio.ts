// English description: Manages the client-only LiveKit preview, local device selection, and host room publishing for the /live studio route.

import type {
  LocalAudioTrack,
  LocalTrack,
  LocalVideoTrack,
  Room,
} from "livekit-client"
import type {
  LiveStudioDeviceOption,
  LiveStudioSession,
} from "../../domain/types/live.types"

type LiveKitModule = typeof import("livekit-client")

const deviceLabel = (label: string, fallback: string, index: number) =>
  label.trim() || `${fallback} ${index + 1}`

export function useLiveKitStudio() {
  const { t } = useI18n()
  const previewHost = ref<HTMLElement | null>(null)
  const cameraOptions = ref<LiveStudioDeviceOption[]>([])
  const microphoneOptions = ref<LiveStudioDeviceOption[]>([])
  const selectedCameraId = ref("")
  const selectedMicrophoneId = ref("")
  const previewLoading = ref(false)
  const previewReady = ref(false)
  const previewError = ref("")
  const roomConnected = ref(false)
  const audioMuted = ref(false)
  const videoMuted = ref(false)

  let liveKitModule: LiveKitModule | null = null
  let room: Room | null = null
  let localTracks: LocalTrack[] = []

  const mediaSupported = computed(() =>
    import.meta.client
    && typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && Boolean(navigator.mediaDevices?.enumerateDevices),
  )

  const getVideoTrack = () =>
    localTracks.find(track => track.kind === "video") as LocalVideoTrack | undefined

  const getAudioTrack = () =>
    localTracks.find(track => track.kind === "audio") as LocalAudioTrack | undefined

  async function ensureModule() {
    if (liveKitModule) {
      return liveKitModule
    }

    liveKitModule = await import("livekit-client")
    return liveKitModule
  }

  async function refreshDevices() {
    if (!mediaSupported.value) {
      cameraOptions.value = []
      microphoneOptions.value = []
      return
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter(device => device.kind === "videoinput")
    const microphones = devices.filter(device => device.kind === "audioinput")

    cameraOptions.value = cameras.map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device.label || "", t("pages.livePage.studio.cameraLabel"), index),
    }))

    microphoneOptions.value = microphones.map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device.label || "", t("pages.livePage.studio.microphoneLabel"), index),
    }))

    if (!selectedCameraId.value && cameraOptions.value[0]) {
      selectedCameraId.value = cameraOptions.value[0].deviceId
    }

    if (!selectedMicrophoneId.value && microphoneOptions.value[0]) {
      selectedMicrophoneId.value = microphoneOptions.value[0].deviceId
    }
  }

  function clearPreviewElement() {
    const host = previewHost.value

    if (!host) {
      return
    }

    host.querySelectorAll("video, audio").forEach((element) => {
      element.remove()
    })
  }

  function attachPreview() {
    const host = previewHost.value
    const videoTrack = getVideoTrack()

    clearPreviewElement()

    if (!host || !videoTrack || videoTrack.isMuted) {
      previewReady.value = false
      return
    }

    const element = videoTrack.attach()

    element.autoplay = true
    element.muted = true
    element.playsInline = true
    element.className = "live-studio-preview__video"
    host.appendChild(element)
    previewReady.value = true
  }

  function detachTracks() {
    localTracks.forEach((track) => {
      try {
        const elements = track.detach()

        if (Array.isArray(elements)) {
          elements.forEach(element => element.remove())
        }
      }
      catch {
      }
    })
  }

  function stopTracks() {
    detachTracks()

    localTracks.forEach((track) => {
      try {
        track.stop()
      }
      catch {
      }
    })

    localTracks = []
    audioMuted.value = false
    videoMuted.value = false
    previewReady.value = false
    clearPreviewElement()
  }

  async function ensurePreview(force = false) {
    if (!mediaSupported.value) {
      previewError.value = t("pages.livePage.studio.previewUnsupported")
      previewReady.value = false
      return
    }

    if (localTracks.length > 0 && !force) {
      attachPreview()
      previewError.value = ""
      return
    }

    previewLoading.value = true
    previewError.value = ""

    try {
      const module = await ensureModule()

      if (localTracks.length > 0) {
        stopTracks()
      }

      localTracks = await module.createLocalTracks({
        audio: selectedMicrophoneId.value
          ? { deviceId: { exact: selectedMicrophoneId.value } }
          : true,
        video: selectedCameraId.value
          ? { deviceId: { exact: selectedCameraId.value } }
          : true,
      })

      await refreshDevices()
      audioMuted.value = Boolean(getAudioTrack()?.isMuted)
      videoMuted.value = Boolean(getVideoTrack()?.isMuted)
      attachPreview()
    }
    catch (error) {
      stopTracks()
      previewError.value = error instanceof Error
        ? error.message
        : t("pages.livePage.studio.previewAccessError")
    }
    finally {
      previewLoading.value = false
    }
  }

  async function setCamera(deviceId: string) {
    if (roomConnected.value) {
      selectedCameraId.value = deviceId
      return
    }

    selectedCameraId.value = deviceId
    await ensurePreview(true)
  }

  async function setMicrophone(deviceId: string) {
    if (roomConnected.value) {
      selectedMicrophoneId.value = deviceId
      return
    }

    selectedMicrophoneId.value = deviceId
    await ensurePreview(true)
  }

  async function toggleAudio() {
    await ensurePreview()
    const track = getAudioTrack()

    if (!track) {
      return
    }

    if (track.isMuted) {
      await track.unmute()
      audioMuted.value = false
      return
    }

    await track.mute()
    audioMuted.value = true
  }

  async function toggleVideo() {
    await ensurePreview()
    const track = getVideoTrack()

    if (!track) {
      return
    }

    if (track.isMuted) {
      await track.unmute()
      videoMuted.value = false
      attachPreview()
      return
    }

    await track.mute()
    videoMuted.value = true
    attachPreview()
  }

  async function connect(session: LiveStudioSession) {
    await ensurePreview()

    if (!localTracks.length) {
      throw new Error(t("pages.livePage.studio.previewMissingTrack"))
    }

    const module = await ensureModule()

    if (room) {
      room.disconnect()
      room = null
    }

    room = new module.Room({
      adaptiveStream: true,
      dynacast: true,
    })

    await room.connect(session.wsUrl, session.token)

    for (const track of localTracks) {
      await room.localParticipant.publishTrack(track)
    }

    roomConnected.value = true
  }

  function disconnect() {
    if (room) {
      try {
        room.disconnect()
      }
      catch {
      }
    }

    room = null
    roomConnected.value = false
  }

  function setPreviewHost(element: HTMLElement | null) {
    previewHost.value = element
    attachPreview()
  }

  function dispose() {
    disconnect()
    stopTracks()
  }

  onMounted(async () => {
    await refreshDevices()
  })

  onBeforeUnmount(() => {
    dispose()
  })

  return {
    mediaSupported,
    previewLoading,
    previewReady,
    previewError,
    cameraOptions,
    microphoneOptions,
    selectedCameraId,
    selectedMicrophoneId,
    roomConnected,
    audioMuted,
    videoMuted,
    refreshDevices,
    ensurePreview,
    setCamera,
    setMicrophone,
    toggleAudio,
    toggleVideo,
    connect,
    disconnect,
    setPreviewHost,
    dispose,
  }
}
