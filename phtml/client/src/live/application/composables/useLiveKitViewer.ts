// English description: Manages client-only LiveKit viewer room connection and remote video attachment for feed live posts.

import type { RemoteTrack, RemoteTrackPublication, RemoteParticipant, Room } from "livekit-client"
import type { LiveViewerSession } from "../../domain/types/live.types"

type LiveKitModule = typeof import("livekit-client")

export function useLiveKitViewer() {
  const { t } = useI18n()
  const stageHost = ref<HTMLElement | null>(null)
  const connecting = ref(false)
  const connected = ref(false)
  const errorMessage = ref("")

  let liveKitModule: LiveKitModule | null = null
  let room: Room | null = null

  async function ensureModule() {
    if (liveKitModule) return liveKitModule
    liveKitModule = await import("livekit-client")
    return liveKitModule
  }

  function clearStage() {
    stageHost.value?.querySelectorAll("video, audio").forEach(element => element.remove())
  }

  function attachRemoteTrack(track: RemoteTrack) {
    if (!stageHost.value || track.kind !== "video") return
    clearStage()
    const element = track.attach()
    element.autoplay = true
    element.playsInline = true
    element.className = "feed-live-player__video"
    stageHost.value.appendChild(element)
  }

  async function connect(session: LiveViewerSession) {
    if (!import.meta.client || connected.value || connecting.value) return

    connecting.value = true
    errorMessage.value = ""

    try {
      const module = await ensureModule()

      disconnect()
      room = new module.Room({
        adaptiveStream: true,
        dynacast: true,
      })

      room.on(module.RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        attachRemoteTrack(track)
      })

      room.on(module.RoomEvent.Disconnected, () => {
        connected.value = false
        clearStage()
      })

      await room.connect(session.wsUrl, session.token)

      room.remoteParticipants.forEach((participant: RemoteParticipant) => {
        participant.trackPublications.forEach((publication: RemoteTrackPublication) => {
          if (publication.track) attachRemoteTrack(publication.track)
        })
      })

      connected.value = true
    }
    catch (error) {
      disconnect()
      errorMessage.value = error instanceof Error ? error.message : t("pages.livePage.viewer.connectError")
    }
    finally {
      connecting.value = false
    }
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
    connected.value = false
    clearStage()
  }

  function setStageHost(element: HTMLElement | null) {
    stageHost.value = element
  }

  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    connecting,
    connected,
    errorMessage,
    connect,
    disconnect,
    setStageHost,
  }
}
