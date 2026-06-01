// English description: Nuxt server endpoint to fetch active group members from the WoWonder PHP backend database.

import { defineEventHandler, createError } from "h3"
import { createBackendApiClient } from "../../../../../utils/backend-api-client"
import { resolveGroupRecordBySlug } from "../../../_shared"
import { createBackendMediaUrlResolver } from "../../../../../utils/backend-media-url"
import type { UserRecord } from "../../../../../domain/types/user.types"

const asNumber = (value: unknown) => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const slug = event.context.params?.slug

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Group slug is required",
    })
  }

  const group = await resolveGroupRecordBySlug(event, slug)
  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found",
    })
  }

  const response = await client.post<{ users: any[] }>(
    "get_group_members",
    {
      group_id: group.id,
      limit: 50,
    },
  )

  if (!response?.users || !Array.isArray(response.users)) {
    return []
  }

  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return response.users.map((user: any): UserRecord & { isAdmin?: boolean } => {
    return {
      id: asNumber(user.user_id || user.id),
      username: user.username || "",
      name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "",
      avatarUrl: resolveMediaUrl(user.avatar),
      verified: user.verified === "1",
      isAdmin: user.is_admin === 1,
    }
  })
})
