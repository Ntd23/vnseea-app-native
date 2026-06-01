// English description: Marks the current user as left from a group call.

import { createError } from "h3"
import { callBackend } from "../_shared"
import { asNumber, readGroupCallBody } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readGroupCallBody(event)

  if (body.id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid group call id is required.",
    })
  }

  const response = await callBackend<{ status?: number | string }>(
    event,
    "leave_group_call",
    { call_id: body.id },
  )

  return {
    ok: asNumber(response.status) === 200,
  }
})
