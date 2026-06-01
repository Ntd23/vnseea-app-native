// English description: Deletes an existing community page through the PHP backend.

import { createError, getRouterParam, readBody } from "h3"
import { assertBackendApiSuccess } from "../../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../../utils/backend-api-client"

type DeletePageBody = {
  password?: string
}

type BackendDeletePageResponse = {
  api_status?: number | string
  message?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const pageId = Number(getRouterParam(event, "id"))
  const body = await readBody<DeletePageBody>(event)
  const password = String(body?.password || "").trim()

  if (!Number.isInteger(pageId) || pageId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid page id.",
    })
  }

  if (!password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password is required.",
    })
  }

  const client = createBackendApiClient(event)

  assertBackendApiSuccess(
    await client.post<BackendDeletePageResponse, Record<string, unknown>>(
      "delete_page",
      {
        page_id: pageId,
        password,
      },
    ),
    "Unable to delete page.",
  )

  return { ok: true }
})
