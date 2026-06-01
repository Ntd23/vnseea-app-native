// English description: Nuxt server endpoint to fetch all pending group requests resolved from the WoWonder PHP backend API.

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

  const response = await client.post<{ data: any[] }>(
    "groups",
    {
      type: "get_requests",
      group_id: group.id,
    },
  )

  if (!response?.data || !Array.isArray(response.data)) {
    return []
  }

  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return response.data.map((item: any): UserRecord => {
    const user = item.user_data || {}
    return {
      id: asNumber(user.user_id || user.id),
      username: user.username || "",
      name: user.name || user.username || "",
      avatarUrl: resolveMediaUrl(user.avatar),
      verified: user.verified === "1",
    }
  })
})
