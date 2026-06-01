// English description: Shared notification center domain types used by the realtime store and UI.

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  url: string
  avatarUrl: string
  icon: string
  isUnread: boolean
  createdAt: number
  timeText: string
}

export type NotificationSummary = {
  items: NotificationItem[]
  unreadCount: number
  hasMore: boolean
  nextOffset: string | null
}

export type RealtimeTokenResponse = {
  token: string
  expiresAt: number
  enabled?: boolean
  url?: string
}

export type NotificationSoundToggleResponse = {
  soundEnabled: boolean
}
