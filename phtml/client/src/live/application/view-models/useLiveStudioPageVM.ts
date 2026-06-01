// English description: Owns the backend-backed live studio flow for /live, including bootstrap, host create/end mutations, and heartbeat-driven activity updates.

import { useIntervalFn } from "@vueuse/core"
import { createApiLiveRepository } from "../../infrastructure/repositories/ApiLiveRepository"
import type { LiveRepository } from "../../domain/repositories/LiveRepository"
import type {
  GoLiveDraft,
  LiveStudioBootstrap,
  LiveStudioComment,
  LiveStudioReactionEvent,
  LiveStudioSession,
  LiveStudioState,
} from "../../domain/types/live.types"

const EMPTY_BOOTSTRAP: LiveStudioBootstrap = {
  enabled: false,
  canUseLive: false,
  blockedReason: "",
  host: null,
  streamName: "",
  roomName: "",
  wsUrl: "",
  token: "",
  destination: "timeline",
  currentPrivacy: "0",
  destinationOptions: [],
  privacyOptions: [],
}

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message
    ? error.message
    : fallback

const isAuthError = (error: unknown) =>
  typeof error === "object"
  && error !== null
  && "statusCode" in error
  && Number((error as { statusCode?: unknown }).statusCode) === 401

const activityKey = (item: LiveStudioComment) =>
  item.id > 0
    ? `${item.kind}:${item.id}`
    : `${item.kind}:${item.username}:${item.message}:${item.timeText}`

export function useLiveStudioPageVM(
  repository: LiveRepository = createApiLiveRepository(),
) {
  const router = useRouter()
  const { t } = useI18n()

  const title = ref("")
  const description = ref("")
  const privacy = ref("0")
  const thumbnailFile = ref<File | null>(null)

  const session = ref<LiveStudioSession | null>(null)
  const liveState = ref<LiveStudioState>("offline")
  const viewerCount = ref(0)
  const reactionsCount = ref(0)
  const sharesCount = ref(0)
  const clipsCount = ref(0)
  const heartbeatAge = ref(0)
  const activityItems = ref<LiveStudioComment[]>([])
  const reactionEvents = ref<LiveStudioReactionEvent[]>([])
  const starting = ref(false)
  const ending = ref(false)
  const heartbeatLoading = ref(false)
  const uploadLoading = ref(false)
  const statusMessage = ref("")
  const errorMessage = ref("")
  const knownCommentIds = ref<number[]>([])
  const knownReactionIds = ref<number[]>([])

  const { data, status, error, refresh } = useAsyncData(
    "live:studio-bootstrap",
    () => repository.getBootstrap(),
    {
      default: () => EMPTY_BOOTSTRAP,
    },
  )

  const bootstrap = computed(() => data.value ?? EMPTY_BOOTSTRAP)
  const bootstrapLoading = computed(() => status.value === "pending")
  const bootstrapErrorMessage = computed(() =>
    error.value ? toErrorMessage(error.value, t("pages.livePage.studio.vmBootstrapError")) : "",
  )

  const blockedReasonMessage = computed(() => {
    switch (bootstrap.value.blockedReason) {
      case "live_video_disabled":
        return t("pages.livePage.studio.vmLiveVideoDisabled")
      case "live_permission_disabled":
        return t("pages.livePage.studio.vmLivePermissionDisabled")
      case "livekit_not_ready":
        return t("pages.livePage.studio.vmLiveKitNotReady")
      case "live_already_running":
        return t("pages.livePage.studio.vmLiveAlreadyRunning")
      case "bootstrap_failed":
        return t("pages.livePage.studio.vmMissingHost")
      default:
        return ""
    }
  })

  const canInteract = computed(() =>
    bootstrap.value.enabled
    && bootstrap.value.canUseLive
    && !starting.value
    && !ending.value,
  )

  const canStart = computed(() =>
    canInteract.value
    && !session.value
    && Boolean(bootstrap.value.streamName)
    && Boolean(bootstrap.value.wsUrl)
    && Boolean(bootstrap.value.token),
  )

  const recentCommentCount = computed(() =>
    activityItems.value.filter(item => item.kind === "comment").length,
  )

  const livePostUrl = computed(() => session.value?.postUrl ?? "")
  const currentTitle = computed(() => session.value?.title || title.value.trim())
  const currentDescription = computed(() => session.value?.description || description.value.trim())
  const isLive = computed(() => Boolean(session.value) && liveState.value !== "offline")

  const { pause: pauseHeartbeat, resume: resumeHeartbeat } = useIntervalFn(
    async () => {
      if (!session.value || heartbeatLoading.value) {
        return
      }

      heartbeatLoading.value = true

      try {
        const heartbeat = await repository.getHeartbeat(
          session.value.postId,
          knownCommentIds.value,
          "live",
          knownReactionIds.value,
        )

        liveState.value = heartbeat.stillLive
        viewerCount.value = heartbeat.viewerCount
        reactionsCount.value = heartbeat.reactionsCount
        sharesCount.value = heartbeat.sharesCount
        clipsCount.value = heartbeat.clipsCount
        heartbeatAge.value = heartbeat.heartbeatAge

        const nextItems = [
          ...heartbeat.comments,
          ...heartbeat.joinedUsers,
          ...heartbeat.leftUsers,
        ]

        if (nextItems.length > 0) {
          const existingKeys = new Set(activityItems.value.map(activityKey))
          const freshItems = nextItems.filter((item) => {
            const key = activityKey(item)

            if (existingKeys.has(key)) {
              return false
            }

            existingKeys.add(key)
            return true
          })

          if (freshItems.length > 0) {
            activityItems.value = [...activityItems.value, ...freshItems].slice(-24)
          }
        }

        if (heartbeat.reactionEvents.length > 0) {
          const nextReactionIds = new Set(knownReactionIds.value)
          const freshReactions = heartbeat.reactionEvents.filter((item) => {
            if (item.id <= 0 || nextReactionIds.has(item.id)) {
              return false
            }

            nextReactionIds.add(item.id)
            return true
          })

          if (freshReactions.length > 0) {
            reactionEvents.value = [...reactionEvents.value, ...freshReactions].slice(-48)
          }

          knownReactionIds.value = Array.from(nextReactionIds).slice(-96)
        }

        const nextCommentIds = new Set(knownCommentIds.value)

        heartbeat.comments.forEach((item) => {
          if (item.id > 0) {
            nextCommentIds.add(item.id)
          }
        })

        knownCommentIds.value = Array.from(nextCommentIds).slice(-48)

        if (heartbeat.stillLive === "offline") {
          pauseHeartbeat()
          statusMessage.value = t("pages.livePage.studio.vmBackendEnded")
        }
      }
      catch (heartbeatError) {
        if (isAuthError(heartbeatError)) {
          await router.push("/welcome")
          return
        }

        statusMessage.value = toErrorMessage(
          heartbeatError,
          t("pages.livePage.studio.vmSyncError"),
        )
      }
      finally {
        heartbeatLoading.value = false
      }
    },
    4000,
    { immediate: false },
  )

  pauseHeartbeat()

  watch(
    bootstrap,
    (value) => {
      if (!privacy.value) {
        privacy.value = value.currentPrivacy || "0"
      }
      else if (!session.value && value.currentPrivacy && privacy.value === "0") {
        privacy.value = value.currentPrivacy
      }
    },
    { immediate: true },
  )

  watch(
    error,
    async (nextError) => {
      if (nextError && isAuthError(nextError)) {
        await router.push("/welcome")
      }
    },
  )

  function setThumbnail(nextFile: File | null) {
    thumbnailFile.value = nextFile
  }

  async function startLive(connectToRoom: (session: LiveStudioSession) => Promise<void>) {
    if (!canStart.value) {
      return null
    }

    starting.value = true
    errorMessage.value = ""
    statusMessage.value = t("pages.livePage.studio.vmCreatingRoom")

    const draft: GoLiveDraft = {
      title: title.value.trim(),
      description: description.value.trim(),
      privacy: privacy.value || bootstrap.value.currentPrivacy || "0",
      streamName: bootstrap.value.streamName,
      thumbnailFile: thumbnailFile.value,
    }

    try {
      const createdSession = await repository.createSession(draft)

      try {
        await connectToRoom(createdSession)
      }
      catch (connectError) {
        try {
          await repository.endSession(createdSession.postId)
        }
        catch {
        }

        throw connectError
      }

      session.value = createdSession
      liveState.value = "live"
      knownCommentIds.value = []
      knownReactionIds.value = []
      activityItems.value = []
      reactionEvents.value = []
      viewerCount.value = 0
      reactionsCount.value = 0
      sharesCount.value = 0
      clipsCount.value = 0
      heartbeatAge.value = 0

      if (thumbnailFile.value) {
        uploadLoading.value = true

        try {
          await repository.uploadThumbnail(createdSession.postId, thumbnailFile.value)
        }
        catch (thumbnailError) {
          statusMessage.value = toErrorMessage(
            thumbnailError,
            t("pages.livePage.studio.vmThumbnailUploadWarning"),
          )
        }
        finally {
          uploadLoading.value = false
        }
      }

      statusMessage.value = t("pages.livePage.studio.vmBroadcasting")
      await refreshHeartbeatNow()
      resumeHeartbeat()
      return createdSession
    }
    catch (startError) {
      if (isAuthError(startError)) {
        await router.push("/welcome")
        return null
      }

      errorMessage.value = toErrorMessage(
        startError,
        t("pages.livePage.studio.vmStartError"),
      )
      statusMessage.value = ""
      session.value = null
      liveState.value = "offline"
      pauseHeartbeat()
      return null
    }
    finally {
      starting.value = false
    }
  }

  async function refreshHeartbeatNow() {
    if (!session.value) {
      return
    }

    heartbeatLoading.value = false
    await repository.getHeartbeat(
      session.value.postId,
      knownCommentIds.value,
      "live",
      knownReactionIds.value,
    ).then((heartbeat) => {
      liveState.value = heartbeat.stillLive
      viewerCount.value = heartbeat.viewerCount
      reactionsCount.value = heartbeat.reactionsCount
      sharesCount.value = heartbeat.sharesCount
      clipsCount.value = heartbeat.clipsCount
      heartbeatAge.value = heartbeat.heartbeatAge

      activityItems.value = [
        ...heartbeat.comments,
        ...heartbeat.joinedUsers,
        ...heartbeat.leftUsers,
      ].slice(-24)
      reactionEvents.value = heartbeat.reactionEvents.slice(-48)

      knownCommentIds.value = heartbeat.comments
        .map(item => item.id)
        .filter(id => id > 0)
        .slice(-48)
      knownReactionIds.value = heartbeat.reactionEvents
        .map(item => item.id)
        .filter(id => id > 0)
        .slice(-96)
    }).catch(async (heartbeatError) => {
      if (isAuthError(heartbeatError)) {
        await router.push("/welcome")
        return
      }

      statusMessage.value = toErrorMessage(
        heartbeatError,
        t("pages.livePage.studio.vmActivityError"),
      )
    })
  }

  async function endLive(disconnectFromRoom: () => void) {
    if (!session.value || ending.value) {
      return
    }

    ending.value = true
    errorMessage.value = ""

    try {
      const result = await repository.endSession(session.value.postId)

      disconnectFromRoom()
      pauseHeartbeat()
      session.value = null
      liveState.value = "offline"
      knownCommentIds.value = []
      knownReactionIds.value = []
      viewerCount.value = 0
      reactionsCount.value = 0
      sharesCount.value = 0
      clipsCount.value = 0
      heartbeatAge.value = 0
      activityItems.value = []
      reactionEvents.value = []
      statusMessage.value = result.message
      await refresh()
    }
    catch (endError) {
      if (isAuthError(endError)) {
        await router.push("/welcome")
        return
      }

      errorMessage.value = toErrorMessage(
        endError,
        t("pages.livePage.studio.vmEndError"),
      )
    }
    finally {
      ending.value = false
    }
  }

  async function uploadThumbnailNow() {
    if (!session.value || !thumbnailFile.value || uploadLoading.value) {
      return
    }

    uploadLoading.value = true
    errorMessage.value = ""

    try {
      const result = await repository.uploadThumbnail(session.value.postId, thumbnailFile.value)
      statusMessage.value = result.message
    }
    catch (uploadError) {
      if (isAuthError(uploadError)) {
        await router.push("/welcome")
        return
      }

      errorMessage.value = toErrorMessage(
        uploadError,
        t("pages.livePage.studio.vmThumbnailUpdateError"),
      )
    }
    finally {
      uploadLoading.value = false
    }
  }

  return {
    bootstrap,
    bootstrapLoading,
    bootstrapErrorMessage,
    blockedReasonMessage,
    title,
    description,
    privacy,
    thumbnailFile,
    session,
    liveState,
    viewerCount,
    reactionsCount,
    sharesCount,
    clipsCount,
    heartbeatAge,
    activityItems,
    reactionEvents,
    recentCommentCount,
    livePostUrl,
    currentTitle,
    currentDescription,
    isLive,
    canInteract,
    canStart,
    starting,
    ending,
    heartbeatLoading,
    uploadLoading,
    statusMessage,
    errorMessage,
    setThumbnail,
    startLive,
    refreshHeartbeatNow,
    endLive,
    uploadThumbnailNow,
    refreshBootstrap: refresh,
  }
}
