import { defineEventHandler } from "h3"
import { createBackendApiClient } from "../../../../utils/backend-api-client"
import { resolvePageRecordBySlug } from "../../_shared"
import { createBackendMediaUrlResolver } from "../../../../utils/backend-media-url"

const asNumber = (value: unknown) => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}
import type { UserRecord } from "../../../../domain/types/user.types"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const slug = event.context.params?.slug

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Page slug is required",
    })
  }

  // Use the shared method to resolve the page record to get the pageId
  const page = await resolvePageRecordBySlug(event, slug, client)
  if (!page) {
    throw createError({
      statusCode: 404,
      statusMessage: "Page not found",
    })
  }

  const response = await client.post<{ data: any[] }>(
    "get-page-invites",
    { page_id: page.id },
  )

  if (!response?.data || !Array.isArray(response.data)) {
    return []
  }

  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return response.data.map((user: any): UserRecord => {
    return {
      id: asNumber(user.user_id),
      username: user.username || "",
      name: user.name || user.username || "",
      avatarUrl: resolveMediaUrl(user.avatar),
      verified: user.verified === "1",
    }
  })
})
