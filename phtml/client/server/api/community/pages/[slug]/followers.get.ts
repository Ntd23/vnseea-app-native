// English description: Returns users following a community page from the backend page-follow source.

import { createError, getRouterParam } from "h3"
import { createBackendApiClient } from "../../../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../../../utils/backend-api-response"
import { createBackendMediaUrlResolver } from "../../../../utils/backend-media-url"
import { resolvePageRecordBySlug } from "../../_shared"

type BackendFollower = {
  user_id?: number | string
  id?: number | string
  username?: string
  name?: string
  first_name?: string
  last_name?: string
  avatar?: string
  verified?: string | number | boolean
  is_friend?: string | number | boolean
  is_requested?: string | number | boolean
}

type BackendPageFollowersResponse = {
  api_status?: number | string
  data?: BackendFollower[]
  errors?: { error_text?: string }
}

const asNumber = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const isTruthy = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "true" || value === "yes"

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Page slug is required",
    })
  }

  const client = createBackendApiClient(event)
  const page = await resolvePageRecordBySlug(event, slug, client)
  const response = assertBackendApiSuccess(
    await client.post<BackendPageFollowersResponse, { page_id: number }>(
      "get-page-followers",
      { page_id: page.id },
    ),
    "Unable to load page followers.",
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return (response.data ?? []).map((user) => {
    const firstName = String(user.first_name || "").trim()
    const lastName = String(user.last_name || "").trim()
    const fallbackName = [firstName, lastName].filter(Boolean).join(" ").trim()

    return {
      id: asNumber(user.user_id ?? user.id),
      username: String(user.username || ""),
      name: String(user.name || fallbackName || user.username || ""),
      avatarUrl: resolveMediaUrl(user.avatar),
      verified: isTruthy(user.verified),
      isFriend: isTruthy(user.is_friend),
      isRequested: isTruthy(user.is_requested),
    }
  }).filter(user => user.id > 0)
})
