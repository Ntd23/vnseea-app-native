// English description: Shared backend fetchers and mappers for Nuxt event API routes.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { getBackendWebBaseUrl } from "../../utils/backend-media-url"
import type {
  EventAttendeeKind,
  EventAttendeeRecord,
  EventRecord,
  EventsCatalogRecord,
  EventRsvpState,
} from "../../../src/events/domain/types/events.types"

type BackendEntity = Record<string, unknown>

type BackendEventsCatalogResponse = {
  api_status?: number | string
  events?: BackendEntity[]
  my_events?: BackendEntity[]
  going?: BackendEntity[]
  interested?: BackendEntity[]
  invited?: BackendEntity[]
  past?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendEventDetailResponse = {
  status?: number | string
  event_data?: BackendEntity
}

type BackendEventAttendeesResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

const accentPalette = [
  "#2563eb",
  "#0ea5e9",
  "#0891b2",
  "#1d4ed8",
  "#7c3aed",
] as const

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const isTruthy = (value: unknown) =>
  value === true
  || value === 1
  || value === "1"
  || value === "yes"
  || value === "true"

const normalizeImagePath = (path: string, baseUrl: string) => {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) {
    try {
      const imageUrl = new URL(path)
      const requestBase = new URL(baseUrl)

      if (requestBase.protocol === "https:" && imageUrl.protocol === "http:" && imageUrl.hostname === requestBase.hostname) {
        return `${requestBase.origin}${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`
      }
    }
    catch {
      // Keep the raw backend value when URL parsing fails.
    }

    return path
  }
  const cleanBase = baseUrl.replace(/\/+$/, "")
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

const createFallback = (id: number) => {
  const accent = accentPalette[Math.abs(id) % accentPalette.length]
  return `linear-gradient(135deg,#0f172a 0%,${accent} 58%,#bfdbfe 100%)`
}

const resolveEventCover = (entity: BackendEntity, baseUrl: string) =>
  normalizeImagePath(
    asString(
      entity.cover
      || entity.cover_url
      || entity.cover_full
      || entity.cover_org
      || entity.event_cover
      || entity.eventCover
      || entity.image
      || entity.thumbnail,
    ),
    baseUrl,
  )

const toDateBadge = (startDateValue: string, startDateLabel: string) => {
  if (!startDateValue) {
    return startDateLabel
  }

  const [year, month, day] = startDateValue.split("-")

  if (!year || !month || !day) {
    return startDateLabel
  }

  return `${day}-${month}-${year.slice(-2)}`
}

const toDateRangeLabel = (
  startDateLabel: string,
  endDateLabel: string,
  startTime: string,
  endTime: string,
) => {
  const start = [startDateLabel, startTime].filter(Boolean).join(" • ")
  const end = [endDateLabel, endTime].filter(Boolean).join(" • ")

  if (!start && !end) return ""
  if (!end || start === end) return start
  return `${start} → ${end}`
}

const toRsvpState = (entity: BackendEntity): EventRsvpState => {
  if (isTruthy(entity.is_going)) return "going"
  if (isTruthy(entity.is_interested)) return "interested"
  return "none"
}

export const mapEventRecord = (
  entity: BackendEntity,
  options: {
    currentUserId: number
    baseUrl: string
    assumedGoing?: boolean
    assumedInterested?: boolean
  },
): EventRecord => {
  const id = asNumber(entity.id)
  const startDateValue = asString(entity.start_edit_date)
  const endDateValue = asString(entity.end_edit_date)
  const startDateLabel = asString(entity.start_date)
  const endDateLabel = asString(entity.end_date)
  const startTime = asString(entity.start_time)
  const endTime = asString(entity.end_time)
  const userData = (entity.user_data ?? {}) as BackendEntity
  const isGoing = options.assumedGoing || isTruthy(entity.is_going)
  const isInterested = options.assumedInterested || isTruthy(entity.is_interested)
  const goingCount = Math.max(asNumber(entity.going_count || entity.going), isGoing ? 1 : 0)
  const interestedCount = Math.max(asNumber(entity.interested_count || entity.interested), isInterested ? 1 : 0)

  return {
    id,
    name: asString(entity.name) || `Event ${id}`,
    description: asString(entity.description),
    location: asString(entity.location),
    coverUrl: resolveEventCover(entity, options.baseUrl),
    coverFallback: createFallback(id),
    startDateLabel,
    endDateLabel,
    startDateValue,
    endDateValue,
    startTime,
    endTime,
    dateBadge: toDateBadge(startDateValue, startDateLabel),
    timeLabel: [startTime, endTime].filter(Boolean).join(" - "),
    dateRangeLabel: toDateRangeLabel(startDateLabel, endDateLabel, startTime, endTime),
    isOwner: isTruthy(entity.is_owner) || asNumber(entity.poster_id || entity.user_id) === options.currentUserId,
    rsvpState: isGoing ? "going" : isInterested ? "interested" : toRsvpState(entity),
    isGoing,
    isInterested,
    goingCount,
    interestedCount,
    hostName: asString(userData.name) || asString(userData.username) || "VNSEEA",
    hostUsername: asString(userData.username),
    hostAvatarUrl: normalizeImagePath(
      asString(userData.avatar || userData.avatar_full),
      options.baseUrl,
    ),
  }
}

export const mapEventAttendeeRecord = (
  entity: BackendEntity,
  baseUrl: string,
): EventAttendeeRecord => ({
  id: asNumber(entity.user_id || entity.id),
  name: asString(entity.name) || asString(entity.username) || "VNSEEA",
  username: asString(entity.username),
  avatarUrl: normalizeImagePath(asString(entity.avatar || entity.avatar_full), baseUrl),
})

export async function fetchEventsCatalog(event: H3Event): Promise<EventsCatalogRecord> {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendEventsCatalogResponse, Record<string, unknown>>(
      "get-events",
      {
        fetch: "events,my_events,going,interested,invited,past",
        limit: 40,
        my_limit: 40,
        going_limit: 40,
        interested_limit: 40,
        invited_limit: 40,
        past_limit: 40,
      },
    ),
    "Unable to load events.",
  )

  const currentUserId = asNumber(currentUser.user_id)
  const goingIds = new Set((response.going ?? []).map(item => asNumber(item.id)))
  const interestedIds = new Set((response.interested ?? []).map(item => asNumber(item.id)))
  const browseById = new Map(
    (response.events ?? []).map(item => [asNumber(item.id), item]),
  )
  const mapList = (
    items: BackendEntity[] | undefined,
    options?: {
      assumedGoing?: boolean
      assumedInterested?: boolean
    },
  ) =>
    (items ?? []).map((item) => {
      const merged = {
        ...(browseById.get(asNumber(item.id)) ?? {}),
        ...item,
      }

      return mapEventRecord(merged, {
        currentUserId,
        baseUrl,
        assumedGoing: options?.assumedGoing || goingIds.has(asNumber(item.id)),
        assumedInterested: options?.assumedInterested || interestedIds.has(asNumber(item.id)),
      })
    })

  return {
    browse: mapList(response.events),
    mine: mapList(response.my_events),
    going: mapList(response.going, { assumedGoing: true }),
    invited: mapList(response.invited),
    interested: mapList(response.interested, { assumedInterested: true }),
    past: mapList(response.past),
  }
}

export async function fetchEventDetail(event: H3Event, id: string | number) {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = await client.post<BackendEventDetailResponse, Record<string, unknown>>(
    "get_event_by_id",
    {
      id: Number(id),
    },
  )

  if (Number(response.status ?? 0) !== 200 || !response.event_data) {
    throw createError({
      statusCode: 404,
      statusMessage: "Event not found.",
      data: response,
    })
  }

  return mapEventRecord(response.event_data, {
    currentUserId: asNumber(currentUser.user_id),
    baseUrl,
  })
}

export async function fetchEventAttendees(
  event: H3Event,
  id: string | number,
  kind: EventAttendeeKind,
  limit = 24,
) {
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendEventAttendeesResponse, Record<string, unknown>>(
      "events",
      {
        type: kind,
        event_id: Number(id),
        limit,
      },
    ),
    `Unable to load ${kind} attendees.`,
  )

  return (response.data ?? []).map(item => mapEventAttendeeRecord(item, baseUrl))
}
