// English description: Toggles the backend RSVP interested state for an event and returns the normalized frontend state.

import { getRouterParam } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"

type BackendInterestedResponse = {
  api_status?: number | string
  interest_status?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const client = createBackendApiClient(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendInterestedResponse, Record<string, unknown>>(
      "interest-event",
      {
        event_id: Number(id),
      },
    ),
    "Unable to update event interest.",
  )

  return {
    eventId: Number(id),
    rsvpState: response.interest_status === "interested" ? "interested" : "none",
  }
})
