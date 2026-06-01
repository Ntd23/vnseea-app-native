// English description: Updates the current backend user's chat presence through the Nuxt bridge.

import { readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { markMessageUserOffline, markMessageUserOnline } from "./_presence"

type PresenceInput = {
  action?: string
}

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PresenceInput>(event).catch(() => ({}))
  const action = body.action === "offline" ? "offline" : "online"
  const currentUser = await getBackendCurrentUser(event)
  const currentUserId = asNumber(currentUser.user_id)

  if (action === "offline") {
    markMessageUserOffline(currentUserId)
    return { ok: true }
  }

  markMessageUserOnline(currentUserId)

  const client = createBackendApiClient(event)

  await client.post<{ api_status?: number | string }, Record<string, unknown>>(
    "get-general-data",
    {
      fetch: "count_new_messages",
      SetOnline: 1,
    },
  )

  return { ok: true }
})
