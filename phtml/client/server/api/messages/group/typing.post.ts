// English description: Stores short-lived group typing state for Nuxt-rendered group chats.

import { createError, readBody } from "h3"
import { getBackendCurrentUser } from "../../../utils/backend-current-user"

const GROUP_TYPING_TTL_MS = 3500
const groupTypingState = new Map<number, Map<number, number>>()

const toNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

function pruneGroupTyping(groupId: number) {
  const now = Date.now()
  const users = groupTypingState.get(groupId)

  if (!users) {
    return new Map<number, number>()
  }

  for (const [userId, expiresAt] of users.entries()) {
    if (expiresAt <= now) {
      users.delete(userId)
    }
  }

  if (users.size === 0) {
    groupTypingState.delete(groupId)
  }

  return users
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const action = String(body.action || "").trim() as "start" | "stop" | "status"
  const groupId = toNumber(body.groupId)

  if (!["start", "stop", "status"].includes(action) || groupId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid group typing action and groupId are required.",
    })
  }

  const currentUser = await getBackendCurrentUser(event)
  const currentUserId = toNumber(currentUser.user_id)

  if (currentUserId <= 0) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  const users = pruneGroupTyping(groupId)

  if (action === "start") {
    users.set(currentUserId, Date.now() + GROUP_TYPING_TTL_MS)
    groupTypingState.set(groupId, users)
    return { ok: true }
  }

  if (action === "stop") {
    users.delete(currentUserId)
    if (users.size === 0) {
      groupTypingState.delete(groupId)
    }
    return { ok: true }
  }

  const activeUserIds = [...users.keys()].filter(userId => userId !== currentUserId)

  return {
    enabled: true,
    typing: activeUserIds.length > 0,
    activeUserIds,
  }
})
