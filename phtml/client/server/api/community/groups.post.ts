// English description: Creates a new community group in the PHP backend and returns the normalized record.

import { readBody } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { mapCommunityGroupRecord } from "./_shared"

type CreateGroupBody = {
  name?: string
  slug?: string
  description?: string
  privacy?: "public" | "private" | "secret"
  category?: string
}

type BackendCreateGroupResponse = {
  api_status?: number | string
  group_data?: Record<string, unknown>
  errors?: {
    error_text?: string
  }
}

const toBackendPrivacy = (value: CreateGroupBody["privacy"]) =>
  value === "private" || value === "secret" ? 2 : 1

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateGroupBody>(event)
  const client = createBackendApiClient(event)
  const currentUser = await getBackendCurrentUser(event)

  const response = assertBackendApiSuccess(
    await client.post<BackendCreateGroupResponse, Record<string, unknown>>(
      "create-group",
      {
        group_name: String(body.slug || "").trim(),
        group_title: String(body.name || "").trim(),
        category: String(body.category || "").trim(),
        about: String(body.description || "").trim(),
        privacy: toBackendPrivacy(body.privacy),
      },
    ),
    "Unable to create group.",
  )

  return mapCommunityGroupRecord(response.group_data ?? {}, {
    currentUserId: Number(currentUser.user_id ?? 0),
  })
})

