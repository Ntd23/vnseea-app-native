// English description: Shared mappers for Nuxt group LiveKit call bridge endpoints.

import { getQuery, readBody, type H3Event } from "h3"
import { createBackendWebClient } from "../../../../utils/backend-web-client"
import { createBackendMediaUrlResolver } from "../../../../utils/backend-media-url"
import { callBackend, getSessionHash, normalizeCallType } from "../_shared"

type BackendEntity = Record<string, unknown>

export const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

export const asNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const asRecord = (value: unknown): BackendEntity =>
  value && typeof value === "object" && !Array.isArray(value) ? value as BackendEntity : {}

const asArray = (value: unknown): BackendEntity[] =>
  Array.isArray(value) ? value.map(item => asRecord(item)) : []

export const buildGroupCallRoute = (id: number, type: unknown) => {
  void id
  void type
  return ""
}

export const readGroupCallIdQuery = (event: H3Event) => {
  const query = getQuery(event)
  return asNumber(query.id)
}

export async function readGroupCallBody(event: H3Event) {
  const body = await readBody<Record<string, unknown>>(event)
  return {
    id: asNumber(body.id),
    groupId: asNumber(body.groupId),
    userIds: Array.isArray(body.userIds)
      ? body.userIds.map(value => asNumber(value)).filter(id => id > 0)
      : [],
  }
}

export const mapGroupCallParticipant = (
  event: H3Event,
  entity: BackendEntity,
) => {
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  return {
    userId: asNumber(entity.user_id),
    name: asString(entity.name),
    username: asString(entity.username) || undefined,
    avatar: resolveMediaUrl(entity.avatar) || undefined,
    joinedAt: asNumber(entity.joined_at) || undefined,
  }
}

export async function fetchGroupCallPayload(event: H3Event, id: number) {
  const response = await callBackend<BackendEntity & { status?: number | string }>(
    event,
    "get_group_call_payload",
    { call_id: id },
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const call = asRecord(response.call)
  const group = asRecord(response.group)
  const livekit = asRecord(response.livekit)
  const currentUser = asRecord(response.current_user)
  const callId = asNumber(call.id)
  const type = normalizeCallType(call.call_type)

  return {
    status: asNumber(response.status),
    id: callId,
    groupId: asNumber(call.group_id),
    type,
    roomName: asString(call.room_name),
    wsUrl: asString(livekit.ws_url),
    token: asString(livekit.token),
    livekitConfigured: livekit.configured === 1 || livekit.configured === "1" || livekit.configured === true,
    startedAt: asNumber(call.started_at),
    serverNow: asNumber(call.server_now),
    participantCount: asNumber(call.participant_count),
    groupName: asString(group.group_name) || "Group call",
    groupAvatar: resolveMediaUrl(group.avatar) || undefined,
    currentUser: {
      id: asNumber(currentUser.id),
      name: asString(currentUser.name) || "You",
      avatar: resolveMediaUrl(currentUser.avatar) || undefined,
    },
    participants: asArray(response.participants)
      .map(participant => mapGroupCallParticipant(event, participant))
      .filter(participant => participant.userId > 0 && participant.name),
  }
}

export async function syncGroupCall(event: H3Event, id: number) {
  const response = await callBackend<BackendEntity & { status?: number | string }>(
    event,
    "sync_group_call",
    { call_id: id },
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return {
    status: asNumber(response.status),
    id: asNumber(response.call_id),
    groupId: asNumber(response.group_id),
    type: normalizeCallType(response.call_type),
    callStatus: asString(response.call_status),
    participantCount: asNumber(response.participant_count),
    groupName: asString(response.group_name),
    groupAvatar: resolveMediaUrl(response.group_avatar) || undefined,
    participants: asArray(response.participants)
      .map(participant => mapGroupCallParticipant(event, participant))
      .filter(participant => participant.userId > 0 && participant.name),
  }
}

export async function postGroupCallForm<TResponse>(
  event: H3Event,
  action: string,
  body: Record<string, unknown>,
) {
  const client = createBackendWebClient(event)
  const { hash } = await getSessionHash(event)
  return await client.postForm<TResponse>(action, body, { hash })
}
