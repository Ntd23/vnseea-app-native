// English description: Marks one backend notification as seen and returns the refreshed notification summary.

import { createError, readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { fetchBackendNotifications, normalizeNotificationSummary } from "./_shared"

type ReadOneNotificationBody = {
  id?: number | string
}

type BackendReadOneNotificationResponse = {
  api_status?: number | string
  message_data?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ReadOneNotificationBody>(event)
  const id = Number(body?.id)

  if (!Number.isFinite(id) || id < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "Notification id is required.",
    })
  }

  const client = createBackendApiClient(event)
  const response = await client.post<BackendReadOneNotificationResponse>("notifications", {
    type: "mark_seen",
    id,
  })

  assertBackendApiSuccess(response, "Unable to mark notification as read.")

  const summary = await fetchBackendNotifications(event)

  return normalizeNotificationSummary(event, summary)
})
