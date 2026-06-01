// English description: Domain types for backend-backed event listing, detail, RSVP, attendee, creation, and event-post flows.

import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"

export type EventTabKey = "browse" | "going" | "invited" | "interested" | "past" | "mine"

export type EventRsvpState = "none" | "going" | "interested"

export type EventAttendeeKind = "going" | "interested"

export type EventTabItem = {
  key: EventTabKey
  label: string
}

export type EventAttendeeRecord = {
  id: number
  name: string
  username: string
  avatarUrl: string
}

export type EventRecord = {
  id: number
  name: string
  description: string
  location: string
  coverUrl: string
  coverFallback: string
  startDateLabel: string
  endDateLabel: string
  startDateValue: string
  endDateValue: string
  startTime: string
  endTime: string
  dateBadge: string
  timeLabel: string
  dateRangeLabel: string
  isOwner: boolean
  rsvpState: EventRsvpState
  isGoing: boolean
  isInterested: boolean
  goingCount: number
  interestedCount: number
  hostName: string
  hostUsername: string
  hostAvatarUrl: string
}

export type EventsCatalogRecord = {
  browse: EventRecord[]
  going: EventRecord[]
  invited: EventRecord[]
  interested: EventRecord[]
  past: EventRecord[]
  mine: EventRecord[]
}

export type EventPostsRecord = {
  posts: FeedPostRecord[]
  hasMore: boolean
  nextOffset: number | null
}

export type EventCreateDraft = {
  name: string
  location: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  coverFile?: File | null
}

export type EventRsvpResult = {
  eventId: number
  rsvpState: EventRsvpState
}
