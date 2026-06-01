// English description: Toggles page like state in the PHP API backend and returns the refreshed page record.

import { getRouterParam } from "h3"
import { assertBackendApiSuccess } from "../../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../../utils/backend-api-client"
import { resolvePageRecordBySlug } from "../../_shared"

type BackendLikePageResponse = {
  api_status?: number | string
  like_status?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const page = await resolvePageRecordBySlug(event, slug)

  assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendLikePageResponse, Record<string, unknown>>(
      "like-page",
      {
        page_id: page.id,
      },
    ),
    "Unable to update page like state.",
  )

  return await resolvePageRecordBySlug(event, slug)
})
