// English description: Bridges Nuxt message calls to PHP request handlers and normalizes LiveKit payloads.

import { createError, getQuery, readBody, type H3Event } from "h3"
import { createBackendWebClient } from "../../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../../utils/backend-current-user"
import type {
  MessageCallCreateResult,
  MessageCallSession,
  MessageCallType,
  MessageIncomingCall,
} from "../../../../src/messages/domain/types/calls.types"

type BackendCallResponse = Record<string, unknown> & {
  status?: number | string
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

const asNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

export const normalizeCallType = (value: unknown): MessageCallType =>
  asString(value) === "audio" ? "audio" : "video"

export async function getSessionHash(event: H3Event) {
  const currentUser = await getBackendCurrentUser(event)
  const hash = asString(currentUser.session_hash)

  if (!hash) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing call session hash.",
    })
  }

  return {
    hash,
    currentUserId: asNumber(currentUser.user_id),
  }
}

export async function readCallBody(event: H3Event) {
  const body = await readBody<Record<string, unknown>>(event)

  return {
    id: asNumber(body.id),
    userId: asNumber(body.userId),
    type: normalizeCallType(body.type),
    status: asString(body.status),
    duration: asNumber(body.duration),
    provider: asString(body.provider) || "livekit",
  }
}

export function readCallQuery(event: H3Event) {
  const query = getQuery(event)

  return {
    id: asNumber(query.id),
    type: normalizeCallType(query.type),
  }
}

export async function callBackend<T extends BackendCallResponse>(
  event: H3Event,
  action: string,
  query: Record<string, unknown>,
) {
  const client = createBackendWebClient(event)
  const { hash } = await getSessionHash(event)

  return await client.request<T>({
    query: {
      f: action,
      hash,
      ...query,
    },
  })
}

export function assertBackendStatus(response: BackendCallResponse, message: string) {
  const status = asNumber(response.status)

  if (status !== 200) {
    throw createError({
      statusCode: status >= 400 ? status : 400,
      statusMessage: message,
      data: response,
    })
  }

  return response
}

export function mapCreateResult(response: BackendCallResponse, type: MessageCallType): MessageCallCreateResult {
  return {
    status: asNumber(response.status),
    id: asNumber(response.id) || asNumber(response.call_id),
    type,
    provider: asString(response.provider) || "livekit",
    busy: response.busy === true || response.busy === 1 || response.busy === "1",
    message: asString(response.message),
  }
}

export function mapIncomingCall(response: BackendCallResponse, type: MessageCallType): MessageIncomingCall | null {
  if (asNumber(response.status) !== 200) {
    return null
  }

  return {
    id: asNumber(response.call_id),
    type: normalizeCallType(response.call_type || type),
    peer: {
      id: 0,
      name: "",
    },
  }
}

export function mapLiveKitSession(response: BackendCallResponse, direction: "incoming" | "outgoing"): MessageCallSession {
  assertBackendStatus(response, "Unable to create LiveKit call session.")

  const call = asRecord(response.call)
  const livekit = asRecord(response.livekit)
  const currentUser = asRecord(response.current_user)
  const peer = asRecord(response.peer)
  const id = asNumber(call.id) || asNumber(call.call_id) || asNumber(response.call_id)
  const type = normalizeCallType(call.type || call.call_type || response.call_type)
  const wsUrl = asString(livekit.ws_url) || asString(livekit.url) || asString(response.ws_url)
  const token = asString(livekit.token)
  const roomName = asString(call.room_name) || asString(livekit.room_name) || asString(response.room_name)

  if (!id || !wsUrl || !token || !roomName) {
    throw createError({
      statusCode: 500,
      statusMessage: "Incomplete LiveKit call payload.",
      data: response,
    })
  }

  return {
    id,
    type,
    direction,
    provider: "livekit",
    roomName,
    wsUrl,
    token,
    currentUser: {
      id: asNumber(currentUser.id),
      name: asString(currentUser.name) || "You",
      avatar: asString(currentUser.avatar),
    },
    peer: {
      id: asNumber(peer.id),
      name: asString(peer.name) || "Contact",
      avatar: asString(peer.avatar),
    },
  }
}
