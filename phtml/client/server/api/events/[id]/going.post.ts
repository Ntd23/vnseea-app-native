// English description: Toggles the backend RSVP going state for an event and returns the normalized frontend state.

import { getRouterParam } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"

type BackendGoingResponse = {
  api_status?: number | string
  go_status?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const client = createBackendApiClient(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendGoingResponse, Record<string, unknown>>(
      "go-to-event",
      {
        event_id: Number(id),
      },
    ),
    "Unable to update event RSVP.",
  )

  return {
    eventId: Number(id),
    rsvpState: response.go_status === "going" ? "going" : "none",
  }
})
