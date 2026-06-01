// English description: Deletes a community group through the PHP API after resolving the slug and validating password.

import { createError, getRouterParam, readBody } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { resolveGroupRecordBySlug } from "../_shared"

type DeleteGroupResponse = {
  api_status?: number | string
  message?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const body = await readBody<{ password?: string }>(event)
  const password = String(body.password || "").trim()

  if (!password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password is required.",
    })
  }

  const group = await resolveGroupRecordBySlug(event, slug)

  if (!group.canManage) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only the group owner can delete this group.",
    })
  }

  assertBackendApiSuccess(
    await createBackendApiClient(event).post<DeleteGroupResponse, Record<string, unknown>>(
      "delete_group",
      {
        group_id: group.id,
        password,
      },
    ),
    "Unable to delete group.",
  )

  return {
    ok: true,
  }
})
