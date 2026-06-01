// English description: Deletes a backend notification through the PHP notifications endpoint.

import { readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"

type DeleteNotificationBody = {
  id?: number | string
}

type BackendDeleteNotificationResponse = {
  api_status?: number | string
  message_data?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<DeleteNotificationBody>(event)
  const id = Number(body?.id)

  if (!Number.isFinite(id) || id < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "Notification id is required.",
    })
  }

  const client = createBackendApiClient(event)
  const response = await client.post<BackendDeleteNotificationResponse>("notifications", {
    type: "delete",
    id,
  })

  assertBackendApiSuccess(response, "Unable to delete notification.")

  return { ok: true }
})
