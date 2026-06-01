// English description: Loads paginated backend profile timeline posts for the Nuxt profile page.

import { createError, getQuery, getRouterParam } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../../utils/backend-media-url"
import { mapPostRecord } from "../../feed/_shared"
import type { ProfilePostsResponse } from "../../../../src/profile/domain/types/profile.types"

type BackendEntity = Record<string, unknown>

type BackendProfileResponse = {
  api_status?: number | string
  user_data?: BackendEntity
  errors?: {
    error_text?: string
  }
}

type BackendPostsResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

export default defineEventHandler(async (event): Promise<ProfilePostsResponse> => {
  const username = String(getRouterParam(event, "username") ?? "").trim()

  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: "Username is required.",
    })
  }

  const query = getQuery(event)
  const afterPostId = asNumber(Array.isArray(query.afterPostId) ? query.afterPostId[0] : query.afterPostId)
  const limit = 10
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const profileResponse = assertBackendApiSuccess(
    await client.post<BackendProfileResponse, Record<string, unknown>>(
      "get-user-data-username",
      {
        username,
        fetch: "user_data",
      },
    ),
    "Unable to load profile.",
  )

  const profileUserId = asNumber(profileResponse.user_data?.user_id ?? profileResponse.user_data?.id)

  if (profileUserId <= 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Profile not found.",
    })
  }

  const postsResponse = assertBackendApiSuccess(
    await client.post<BackendPostsResponse, Record<string, unknown>>(
      "posts",
      {
        type: "get_user_posts",
        id: profileUserId,
        limit,
        after_post_id: afterPostId,
      },
    ),
    "Unable to load profile posts.",
  )

  const posts = (postsResponse.data ?? []).map(post => mapPostRecord(post, resolveMediaUrl))

  return {
    posts,
    hasMore: posts.length >= limit,
    nextOffset: posts.at(-1)?.id ?? null,
  }
})
