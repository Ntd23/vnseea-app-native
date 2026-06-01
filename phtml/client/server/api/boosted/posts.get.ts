// English description: Returns the current user's backend boosted posts for the Nuxt boosted posts route.

import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { mapPostRecord } from "../feed/_shared"
import type { FeedPostsResponse } from "../../../src/feed/domain/types/feed.types"

type BackendBoostedPostsResponse = {
  api_status?: number | string
  data?: Array<Record<string, unknown>>
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<FeedPostsResponse> => {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.get<BackendBoostedPostsResponse>("boosted-posts"),
    "Unable to load boosted posts.",
  )
  const posts = (response.data ?? []).map(post => mapPostRecord(post, resolveMediaUrl))

  return {
    posts,
    hasMore: false,
    nextOffset: null,
  }
})
