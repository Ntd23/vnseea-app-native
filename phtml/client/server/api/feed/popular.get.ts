// English description: Returns normalized most-liked posts by reusing the shared feed mapper instead of a reduced custom payload.

import { getQuery } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { mapPostRecord } from "./_shared"
import type { FeedPostsResponse } from "../../../src/feed/domain/types/feed.types"

type BackendEntity = Record<string, unknown>
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

export default defineEventHandler(async (event): Promise<FeedPostsResponse> => {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const limit = Number(getQuery(event).limit ?? 10) || 10
  const afterPostId = Number(getQuery(event).afterPostId ?? 0) || 0
  const response = assertBackendApiSuccess(
    await client.post<BackendPostsResponse, Record<string, unknown>>(
      "most_liked",
      {
        limit,
        after_post_id: afterPostId,
      },
    ),
    "Unable to load popular posts.",
  )

  const posts = (response.data ?? []).map(post => mapPostRecord(post, resolveMediaUrl))

  return {
    posts,
    hasMore: posts.length >= limit,
    nextOffset: posts.length > 0
      ? asNumber(posts.at(-1)?.id)
      : null,
  }
})
