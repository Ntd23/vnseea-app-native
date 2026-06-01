// English description: Defines the live studio domain types used by the backend-backed host livestream route.

export type LiveStudioState = "live" | "stale" | "offline"

export type LiveStudioOption = {
  value: string
  label: string
}

export type LiveStudioHost = {
  id: number
  name: string
  username: string
  avatarUrl: string
  initials: string
  note: string
}

export type LiveStudioBootstrap = {
  enabled: boolean
  canUseLive: boolean
  blockedReason: string
  host: LiveStudioHost | null
  streamName: string
  roomName: string
  wsUrl: string
  token: string
  destination: string
  currentPrivacy: string
  destinationOptions: LiveStudioOption[]
  privacyOptions: LiveStudioOption[]
}

export type LiveStudioSession = {
  postId: number
  streamName: string
  roomName: string
  wsUrl: string
  token: string
  title: string
  description: string
  postUrl: string
  startedAt: string
  privacy: string
}

export type LiveViewerSession = {
  postId: number
  streamName: string
  roomName: string
  wsUrl: string
  token: string
  streamState: LiveStudioState
  heartbeatAge: number
}

export type LiveStudioComment = {
  id: number
  author: string
  username: string
  avatarUrl: string
  message: string
  timeText: string
  kind: "comment" | "joined" | "left"
  isHost: boolean
}

export type LiveStudioReactionEvent = {
  id: number
  value: string
  author: string
  username: string
  avatarUrl: string
}

export type LiveStudioHeartbeat = {
  stillLive: LiveStudioState
  viewerCount: number
  comments: LiveStudioComment[]
  joinedUsers: LiveStudioComment[]
  leftUsers: LiveStudioComment[]
  reactionEvents: LiveStudioReactionEvent[]
  reactionsCount: number
  sharesCount: number
  clipsCount: number
  heartbeatAge: number
}

export type LiveMutationResult = {
  success: true
  message: string
  thumbnailUrl?: string
}

export type GoLiveDraft = {
  title: string
  description: string
  privacy: string
  streamName: string
  thumbnailFile?: File | null
}

export type LiveStudioDeviceOption = {
  deviceId: string
  label: string
}
