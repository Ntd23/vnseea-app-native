// Description: Defines normalized message types for inbox tabs, thread payloads, realtime typing, and backend-backed message actions.
import type { FeedStoryReactionType } from "../../../feed/domain/constants/story-reactions"

export type MessageTabKey = "multi" | "user" | "group"
export type MessageThreadType = "user" | "group" | "page"

export type MessageTab = {
  id: MessageTabKey
  label: string
  icon: string
}

export type MessageUserTag = {
  id: number
  name: string
  color: string
}

export type MessageContact = {
  id: string
  name: string
  profileUrl?: string
  status: string
  isOnline: boolean
  lastSeenAt?: number
  avatarUrl: string
  tab: MessageTabKey
  type: MessageThreadType
  preview: string
  time: string
  unreadCount: number
  userId?: number
  groupId?: number
  pageId?: number
  recipientId?: number
  memberCount?: number
  members?: string[]
  tags?: MessageUserTag[]
}

export type MessageGroupMember = {
  userId: number
  name: string
  username?: string
  avatarUrl: string
  profileUrl?: string
  isOnline?: boolean
  isOwner: boolean
  isSelf: boolean
}

export type MessageGroupCandidate = {
  userId: number
  name: string
  username?: string
  avatarUrl: string
  profileUrl?: string
}

export type MessageGroupCreateCandidate = {
  userId: number
  name: string
  username?: string
  avatarUrl: string
  profileUrl?: string
}

export type MessageGroupCreateDraft = {
  name: string
  recipientIds: number[]
  avatar?: File | null
}

export type MessageGroupUpdateDraft = {
  groupId: number
  name?: string
  avatar?: File | null
}

export type MessageGroupDetails = {
  groupId: number
  name: string
  avatarUrl: string
  ownerId: number
  canManage: boolean
  memberCount: number
  members: MessageGroupMember[]
}

export type MessageMention = {
  userId: number
  name: string
  username?: string
  avatarUrl?: string
}

export type MessageItem = {
  id: number
  text: string
  isMine: boolean
  isLast?: boolean
  showAuthor?: boolean
  time?: string
  showTime?: boolean
  avatar?: string
  timestamp?: number
  senderId?: number
  senderIsOnline?: boolean
  authorName?: string
  mentions?: MessageMention[]
  threadType?: MessageThreadType
  mediaUrl?: string
  mediaName?: string
  mediaType?: "image" | "video" | "audio" | "gif" | "file" | "record"
  selectedReaction?: FeedStoryReactionType | null
  isDeleted?: boolean
  deletedAt?: number
  deletedTime?: string
  deletedByName?: string
  callLog?: {
    type: "audio" | "video"
    status: string
    duration?: number
    callId?: number
    groupId?: number
    isGroup?: boolean
    isActive?: boolean
    participantCount?: number
  }
}

export type MessageRecordDraft = {
  blob: Blob
  fileName: string
  mimeType: string
  durationMs: number
  previewUrl: string
}

export type UploadedMessageRecord = {
  url: string
  name: string
  mimeType: string
  durationMs: number
  previewUrl?: string
}

export type MessageComposerDraft = {
  text: string
  file?: File | null
  record?: MessageRecordDraft | null
  replyId?: number
  mentionedUserIds?: number[]
}

export type MessageSendDraft = {
  text: string
  file?: File | null
  record?: UploadedMessageRecord | null
  replyId?: number
  mentionedUserIds?: number[]
}

export type MessageThread = {
  messages: MessageItem[]
  typing: boolean
}

export type MessageTypingState = {
  enabled: boolean
  typing: boolean
  activeUserIds?: number[]
}

export type MessageRealtimeToken = {
  token: string
  expiresAt: number
  enabled: boolean
  url: string
}

export type MultiMessageSendResult = {
  status: number
  sentCount: number
  failedCount: number
  sentIds: number[]
  failedIds: number[]
  invalidFile?: number
  error?: string
}

export type MessageActionResult = {
  ok: boolean
  message?: string
}

export type MessageCreateGroupResult = MessageActionResult & {
  groupId?: number
}

export type MessageTagsPayload = {
  labels: MessageUserTag[]
  contacts: MessageContact[]
}
