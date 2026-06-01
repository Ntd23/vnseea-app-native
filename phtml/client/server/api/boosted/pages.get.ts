// English description: Returns the current user's backend boosted pages for the Nuxt boosted pages route.

import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { getBackendWebBaseUrl } from "../../utils/backend-media-url"
import { mapCommunityPageRecord } from "../community/_shared"
import type { CommunityPageRecord } from "../../../src/community/domain/types/community.types"

type BackendBoostedPagesResponse = {
  api_status?: number | string
  data?: Array<Record<string, unknown>>
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<{ pages: CommunityPageRecord[] }> => {
  const client = createBackendApiClient(event)
  const currentUser = await getBackendCurrentUser(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = assertBackendApiSuccess(
    await client.get<BackendBoostedPagesResponse>("boosted-pages"),
    "Unable to load boosted pages.",
  )

  return {
    pages: (response.data ?? []).map(page => mapCommunityPageRecord(page, {
      currentUserId: Number(currentUser.user_id ?? 0),
      baseUrl,
    })),
  }
})
