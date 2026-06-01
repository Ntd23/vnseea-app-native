// English description: Bridges the Nuxt live studio context to the legacy PHP LiveKit host handlers in xhr/live.php and normalizes them for the frontend.

import { createError, type H3Event } from "h3"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendMediaUrlResolver, getBackendWebBaseUrl } from "../../utils/backend-media-url"
import { fetchFeedPostById, fetchPostComments } from "../feed/_shared"
import type { FeedCommentRecord } from "../../../src/feed/domain/types/feed.types"
import type {
  GoLiveDraft,
  LiveMutationResult,
  LiveStudioBootstrap,
  LiveStudioComment,
  LiveStudioHeartbeat,
  LiveStudioHost,
  LiveStudioReactionEvent,
  LiveStudioSession,
  LiveViewerSession,
} from "../../../src/live/domain/types/live.types"

type BackendEntity = Record<string, unknown>

type BackendLiveBootstrapResponse = {
  status?: number | string
  message?: string
  error?: string
  enabled?: boolean | number | string
  can_use_live?: boolean | number | string
  blocked_reason?: string
  host?: BackendEntity
  stream_name?: string
  room_name?: string
  ws_url?: string
  token?: string
  destination?: string
  current_privacy?: string
}

type BackendLiveSessionResponse = {
  status?: number | string
  message?: string
  error?: string
  post_id?: number | string
  stream_name?: string
  room_name?: string
  ws_url?: string
  token?: string
  title?: string
  description?: string
  post_url?: string
  started_at?: number | string
}

type BackendLiveJoinResponse = {
  status?: number | string
  message?: string
  error?: string
  removed?: string
  post_id?: number | string
  stream_name?: string
  room_name?: string
  ws_url?: string
  token?: string
  stream_state?: string
  heartbeat_age?: number | string
}

type BackendLiveHeartbeatResponse = {
  status?: number | string
  message?: string
  error?: string
  removed?: string
  count?: number | string
  viewer_count?: number | string
  still_live?: string
  heartbeat_age?: number | string
  reactions_count?: number | string
  shares_count?: number | string
  clips_count?: number | string
  comments?: BackendEntity[]
  joined?: BackendEntity[]
  left?: BackendEntity[]
  reactions?: BackendEntity[]
}

type BackendLiveMutationResponse = {
  status?: number | string
  message?: string
  error?: string
  thumb_url?: string
}

const LIVE_DESTINATION_OPTIONS = [
  { value: "timeline", label: "Timeline" },
]

const LIVE_PRIVACY_OPTIONS = [
  { value: "0", label: "Public" },
  { value: "1", label: "Friends" },
  { value: "2", label: "Followers" },
  { value: "3", label: "Only me" },
]

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const asBoolean = (value: unknown) =>
  value === true
  || value === 1
  || value === "1"
  || value === "true"
  || value === "yes"

const asEntity = (value: unknown): BackendEntity =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as BackendEntity
    : {}

const normalizeResponse = <T extends Record<string, unknown>>(response: T | string | false | null | undefined) => {
  if (typeof response !== "string") {
    return response
  }

  try {
    return JSON.parse(response) as T
  }
  catch {
    return null
  }
}

const assertLiveWebSuccess = <T extends Record<string, unknown>>(
  response: T | string | false | null | undefined,
  fallbackMessage: string,
) => {
  const normalized = normalizeResponse(response)

  if (!normalized || typeof normalized !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: fallbackMessage,
      data: normalized,
    })
  }

  const status = asNumber(normalized.status)

  if (status >= 200 && status < 300) {
    return normalized as T
  }

  throw createError({
    statusCode: 400,
    statusMessage: asString(normalized.error || normalized.message) || fallbackMessage,
    data: normalized,
  })
}

const getBackendWebBase = (event: H3Event) => getBackendWebBaseUrl(event)

const buildInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "LV"

const mapHost = (
  host: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
  fallbackUser: BackendEntity,
): LiveStudioHost => {
  const source = Object.keys(host).length > 0 ? host : fallbackUser
  const name = asString(source.name || source.username)

  return {
    id: asNumber(source.id || source.user_id),
    name,
    username: asString(source.username),
    avatarUrl: resolveMediaUrl(asString(source.avatar)),
    initials: buildInitials(name),
    note: asString(source.note) || "Host - timeline",
  }
}

const mapActivityItem = (
  item: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
): LiveStudioComment => ({
  id: asNumber(item.id),
  author: asString(item.author),
  username: asString(item.username),
  avatarUrl: resolveMediaUrl(asString(item.avatar)),
  message: asString(item.message),
  timeText: asString(item.time_text),
  kind: asString(item.kind) === "joined"
    ? "joined"
    : asString(item.kind) === "left" ? "left" : "comment",
  isHost: asBoolean(item.is_host),
})

const mapReactionEvent = (
  item: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
): LiveStudioReactionEvent => ({
  id: asNumber(item.id),
  value: asString(item.value || item.reaction),
  author: asString(item.author),
  username: asString(item.username),
  avatarUrl: resolveMediaUrl(asString(item.avatar)),
})

const usernameFromAuthorPath = (value?: string) =>
  asString(value).replace(/^\/?@/, "")

const mapFeedCommentToLiveComment = (
  comment: FeedCommentRecord,
  postAuthor: string,
): LiveStudioComment => ({
  id: comment.id,
  author: comment.author,
  username: usernameFromAuthorPath(comment.authorPath) || comment.author,
  avatarUrl: comment.authorAvatarUrl ?? "",
  message: comment.text,
  timeText: comment.time ?? "",
  kind: "comment",
  isHost: Boolean(postAuthor) && comment.author === postAuthor,
})

const mergeLiveComments = (
  primary: LiveStudioComment[],
  fallback: LiveStudioComment[],
) => {
  const seen = new Set<string>()

  return [...primary, ...fallback]
    .filter((item) => {
      const key = item.id > 0
        ? `id:${item.id}`
        : `body:${item.username}:${item.message}:${item.timeText}`

      if (seen.has(key) || item.kind !== "comment" || !item.message) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort((a, b) => {
      if (a.id > 0 && b.id > 0) {
        return a.id - b.id
      }

      return 0
    })
}

export async function fetchLiveBootstrap(event: H3Event): Promise<LiveStudioBootstrap> {
  const currentUser = await getBackendCurrentUser(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = await createBackendWebClient(event).postForm<BackendLiveBootstrapResponse>(
    "live",
    undefined,
    { s: "bootstrap" },
  )
  const normalized = assertLiveWebSuccess(response, "Unable to load live studio.")

  return {
    enabled: asBoolean(normalized.enabled),
    canUseLive: asBoolean(normalized.can_use_live),
    blockedReason: asString(normalized.blocked_reason),
    host: mapHost(asEntity(normalized.host), resolveMediaUrl, currentUser),
    streamName: asString(normalized.stream_name),
    roomName: asString(normalized.room_name),
    wsUrl: asString(normalized.ws_url),
    token: asString(normalized.token),
    destination: asString(normalized.destination) || "timeline",
    currentPrivacy: asString(normalized.current_privacy) || "0",
    destinationOptions: LIVE_DESTINATION_OPTIONS,
    privacyOptions: LIVE_PRIVACY_OPTIONS,
  }
}

export async function createLiveSession(
  event: H3Event,
  input: GoLiveDraft,
): Promise<LiveStudioSession> {
  const response = await createBackendWebClient(event).postForm<BackendLiveSessionResponse>(
    "live",
    {
      stream_name: input.streamName,
      title: input.title,
      description: input.description,
      post_privacy: input.privacy,
    },
    { s: "create" },
  )
  const normalized = assertLiveWebSuccess(response, "Unable to create live session.")
  const startedAtSeconds = asNumber(normalized.started_at)

  return {
    postId: asNumber(normalized.post_id),
    streamName: asString(normalized.stream_name) || input.streamName,
    roomName: asString(normalized.room_name),
    wsUrl: asString(normalized.ws_url),
    token: asString(normalized.token),
    title: asString(normalized.title) || input.title,
    description: asString(normalized.description) || input.description,
    postUrl: asString(normalized.post_url),
    startedAt: new Date((startedAtSeconds > 0 ? startedAtSeconds * 1000 : Date.now())).toISOString(),
    privacy: input.privacy,
  }
}

export async function joinLiveSession(
  event: H3Event,
  postId: number,
): Promise<LiveViewerSession> {
  const response = await createBackendWebClient(event).postForm<BackendLiveJoinResponse>(
    "live",
    { post_id: postId },
    { s: "join" },
  )
  const normalized = assertLiveWebSuccess(response, "Unable to join live session.")

  return {
    postId: asNumber(normalized.post_id) || postId,
    streamName: asString(normalized.stream_name),
    roomName: asString(normalized.room_name),
    wsUrl: asString(normalized.ws_url),
    token: asString(normalized.token),
    streamState: asString(normalized.stream_state) === "stale"
      ? "stale"
      : asString(normalized.stream_state) === "offline" ? "offline" : "live",
    heartbeatAge: asNumber(normalized.heartbeat_age),
  }
}

export async function fetchLiveHeartbeat(
  event: H3Event,
  input: {
    postId: number
    knownCommentIds?: number[]
    knownReactionIds?: number[]
    page?: "live" | "story"
  },
): Promise<LiveStudioHeartbeat> {
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const params = new URLSearchParams()

  params.append("post_id", String(input.postId))
  params.append("page", input.page === "story" ? "story" : "live")

  ;(input.knownCommentIds ?? []).forEach((id, index) => {
    if (Number.isFinite(id) && id > 0) {
      params.append(`ids[${index}]`, String(id))
    }
  })

  ;(input.knownReactionIds ?? []).forEach((id, index) => {
    if (Number.isFinite(id) && id > 0) {
      params.append(`reaction_ids[${index}]`, String(id))
    }
  })

  const response = await createBackendWebClient(event).postForm<BackendLiveHeartbeatResponse, URLSearchParams>(
    "live",
    params,
    { s: "check_comments" },
  )
  const normalized = assertLiveWebSuccess(response, "Unable to refresh live activity.")
  let postReactionsCount = 0
  let postSharesCount = 0
  let postAuthor = ""
  let postComments: LiveStudioComment[] = []
  const knownCommentIds = new Set(
    (input.knownCommentIds ?? []).filter(id => Number.isFinite(id) && id > 0),
  )

  try {
    const post = await fetchFeedPostById(event, input.postId)
    postReactionsCount = post?.stats.likes ?? 0
    postSharesCount = post?.stats.shares ?? 0
    postAuthor = post?.author ?? ""
  }
  catch {
  }

  try {
    const comments = await fetchPostComments(event, {
      postId: input.postId,
      limit: 50,
      offset: 0,
    })

    postComments = comments
      .filter(comment => comment.id <= 0 || !knownCommentIds.has(comment.id))
      .map(comment => mapFeedCommentToLiveComment(comment, postAuthor))
  }
  catch {
  }

  const comments = mergeLiveComments(
    (normalized.comments ?? []).map(item => mapActivityItem(item, resolveMediaUrl)),
    postComments,
  )

  return {
    stillLive: asString(normalized.still_live) === "stale"
      ? "stale"
      : asString(normalized.still_live) === "offline" ? "offline" : "live",
    viewerCount: asNumber(normalized.viewer_count || normalized.count),
    comments,
    joinedUsers: (normalized.joined ?? []).map(item => mapActivityItem(item, resolveMediaUrl)),
    leftUsers: (normalized.left ?? []).map(item => mapActivityItem(item, resolveMediaUrl)),
    reactionEvents: (normalized.reactions ?? []).map(item => mapReactionEvent(item, resolveMediaUrl)),
    reactionsCount: Math.max(asNumber(normalized.reactions_count), postReactionsCount),
    sharesCount: Math.max(asNumber(normalized.shares_count), postSharesCount),
    clipsCount: asNumber(normalized.clips_count),
    heartbeatAge: asNumber(normalized.heartbeat_age),
  }
}

export async function endLiveSession(
  event: H3Event,
  postId: number,
): Promise<LiveMutationResult> {
  const response = await createBackendWebClient(event).postForm<BackendLiveMutationResponse>(
    "live",
    { post_id: postId },
    { s: "delete" },
  )
  const normalized = assertLiveWebSuccess(response, "Unable to end live session.")

  return {
    success: true,
    message: asString(normalized.message) || "Live session ended.",
  }
}

export async function uploadLiveThumbnail(
  event: H3Event,
  postId: number,
  thumbnailFile: File,
): Promise<LiveMutationResult> {
  const formData = new FormData()

  formData.append("post_id", String(postId))
  formData.append("thumb", thumbnailFile, thumbnailFile.name)

  const response = await createBackendWebClient(event).postForm<BackendLiveMutationResponse, FormData>(
    "live",
    formData,
    { s: "create_thumb" },
  )
  const normalized = assertLiveWebSuccess(response, "Unable to upload live thumbnail.")

  return {
    success: true,
    message: asString(normalized.message) || "Live thumbnail updated.",
    thumbnailUrl: createBackendMediaUrlResolver(event)(asString(normalized.thumb_url)),
  }
}
