// English description: Accepts or declines backend friend and group chat requests from the header dropdown.

import { createError, readBody } from "h3"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"

type RequestActionBody = {
  id?: number | string
  kind?: "friend" | "group_chat"
  action?: "accept" | "decline"
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestActionBody>(event)
  const id = Number(body.id)
  const kind = body.kind
  const action = body.action

  if (!Number.isFinite(id) || id < 1 || !kind || !action) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request id, kind, and action are required.",
    })
  }

  const client = createBackendApiClient(event)

  if (kind === "friend") {
    assertBackendApiSuccess(
      await client.post("follow-request-action", {
        user_id: id,
        request_action: action,
      }),
      "Unable to update friend request.",
    )
  }
  else {
    assertBackendApiSuccess(
      await client.post("group_chat", {
        group_id: id,
        type: action === "accept" ? "accept" : "reject",
      }),
      "Unable to update group chat request.",
    )
  }

  return { ok: true }
})
