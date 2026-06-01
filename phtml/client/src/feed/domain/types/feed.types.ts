// English description: Defines normalized feed, story, explore, memory, and poke types shared across Dev 2 social pages.

import type { CommunityPageRecord } from "../../../community/domain/types/community.types"
import type { FeedStoryReactionType } from "../constants/story-reactions"

export type FeedMediaItem = {
  type: "image" | "video"
  src: string
  alt?: string
  mime?: string
  thumb?: string
}

export type FeedPostAttachmentCard = {
  type: "blog" | "funding" | "product"
  title: string
  description: string
  imageUrl: string
  href: string
  progress?: number
  raised?: number
  amount?: number
}

export type FeedCommentRecord = {
  id: number
  author: string
  authorAvatarUrl?: string
  authorPath?: string
  role: string
  text: string
  time?: string
  attachment?: FeedCommentAttachment
  reactionsCount?: number
  selectedReaction?: FeedStoryReactionType | null
  repliesCount?: number
  replies?: FeedCommentRecord[]
}

export type FeedCommentAttachment = {
  type: "image" | "gif" | "audio"
  url: string
  name?: string
}

export type FeedCommentSubmitPayload = {
  text: string
  backendText?: string
  imageFile?: File
  gifFile?: File
  audioFile?: File
  attachmentPreview?: FeedCommentAttachment
}

export type FeedPostActionResult = {
  ok: boolean
  commentId?: number
  commentsCount?: number
  attachment?: FeedCommentAttachment
  pollOptions?: FeedPollOptionRecord[]
  reaction?: FeedStoryReactionType | null
  reactionsCount?: number
  reply?: FeedCommentRecord
}

export type FeedPostReactionSummary = {
  reaction: FeedStoryReactionType
  count: number
}

export type FeedPostReactionUser = {
  id: number
  name: string
  avatarUrl: string
  profilePath?: string
  reaction: FeedStoryReactionType
  isFollowing?: boolean
}

export type FeedPostReactionsResponse = {
  reactions: FeedPostReactionSummary[]
  users: FeedPostReactionUser[]
}

export type FeedPostMention = {
  username: string
  name: string
  displayName: string
}

export type FeedPollOptionRecord = {
  id: number
  text: string
  votes: number
  percentage: number
  selected: boolean
}

export type FeedPostRecord = {
  id: number
  sharedPostId?: number
  sharedPost?: FeedPostRecord | null
  authorId?: number
  colorId?: number
  author: string
  authorAvatarUrl: string
  authorVerified?: boolean
  authorPath: string
  eventContext: {
    id: number
    name: string
    path: string
  } | null
  groupContext: {
    id: number
    name: string
    path: string
    slug: string
  } | null
  role: string
  audience: string
  time: string
  text: string
  mentions?: FeedPostMention[]
  feeling: {
    value: string
    label: string
    emoji: string
  } | null
  pollOptions: FeedPollOptionRecord[]
  tags: string[]
  stats: {
    likes: number
    comments: number
    shares: number
    views: number
  }
  isLive: boolean
  liveState: "live" | "stale" | "offline" | null
  liveStreamName?: string
  liveViewerCount?: number
  liveHeartbeatAge?: number
  comments: FeedCommentRecord[]
  mediaItems: FeedMediaItem[]
  attachmentCard: FeedPostAttachmentCard | null
  category: string
  primaryMediaType: "text" | "image" | "video" | "link" | "music" | "file"
  sourceLabel: string
  sourcePath: string
  isSaved: boolean
  isLiked: boolean
  reaction: FeedStoryReactionType | null
  reactions: FeedPostReactionSummary[]
  reactionUsers: FeedPostReactionUser[]
}

export type FeedPostsResponse = {
  posts: FeedPostRecord[]
  hasMore: boolean
  nextOffset: number | null
}

export type FeedCreatePostResponse = {
  ok: boolean
  post: FeedPostRecord | null
}

export type FeedCreateStoryResponse = {
  ok: boolean
  storyId?: number
  story: FeedStoryRecord | null
}

export type FeedStoryActionResult = {
  ok: boolean
  storyId: number
  reaction?: FeedStoryReactionType
  replySent?: boolean
}

export type FeedStoryRecord = {
  id: number
  ownerId: number
  ownerKey: string
  ownerUsername: string
  author: string
  avatar: string
  avatarUrl: string
  gradient: string
  media: string
  mediaType: "image" | "video"
  poster: string
  title: string
  caption: string
  meta: string
  likes: number
  comments: number
  views: number
  isMe: boolean
  hasUnseen: boolean
}

export type FeedAnnouncement = {
  title: string
  message: string
}

export type FeedGreeting = {
  period: "morning" | "afternoon" | "evening"
  title: string
  message: string
  accent: string
  imageUrl: string
}

export type FeedHomeResponse = FeedPostsResponse & {
  stories: FeedStoryRecord[]
  announcement: FeedAnnouncement | null
  greeting: FeedGreeting | null
}

export type FeedHashtagChip = {
  label: string
  slug: string
  count: number
  to: string
}

export type FeedExploreUserRecord = {
  id: number
  name: string
  username: string
  initials: string
  href: string
  role: string
  meta: string
  reason: string
  tags: string[]
  mutualLabel: string
  accent: string
  online: boolean
  avatarUrl: string
}

export type FeedExploreResponse = {
  posts: FeedPostRecord[]
  users: FeedExploreUserRecord[]
  pages: CommunityPageRecord[]
  hashtags: FeedHashtagChip[]
  announcement: FeedAnnouncement | null
}

export type FeedMemoryFriendRecord = {
  id: string
  name: string
  initials: string
  label: string
  note: string
}

export type FeedMemoryRecord = {
  id: string
  post: FeedPostRecord
  happenedOnLabel: string
  memoryLabel: string
  yearOffset: number
  reflection: string
}

export type FeedMemoriesResponse = {
  posts: FeedMemoryRecord[]
  friends: FeedMemoryFriendRecord[]
}

export type FeedPokeRecord = {
  id: string
  pokeId: number
  userId: number
  name: string
  initials: string
  href: string
  role: string
  timeLabel: string
  timestamp: number
  mutualLabel: string
  contextLabel: string
  note: string
  accent: string
  online?: boolean
  avatarUrl: string
  isFollowing: boolean
}

export type FeedPokeActionResult = {
  ok: boolean
  record?: FeedPokeRecord
}
