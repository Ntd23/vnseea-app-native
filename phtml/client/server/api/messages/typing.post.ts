// English description: Bridges one-to-one typing actions to the legacy PHP chat handler and returns normalized typing state.

import { createError, readBody } from "h3"
import { updateTypingState } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const action = String(body.action || "").trim() as "start" | "stop" | "status"
  const userId = Number(body.userId || 0)

  if (!["start", "stop", "status"].includes(action) || !Number.isFinite(userId) || userId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid typing action and userId are required.",
    })
  }

  return await updateTypingState(event, {
    action,
    userId,
  })
})
