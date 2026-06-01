// English description: Ends the current host livestream session through the legacy PHP live delete handler.

import { createError, readBody } from "h3"
import { endLiveSession } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ postId?: number | string }>(event)
  const postId = Number(body?.postId ?? 0)

  if (!Number.isFinite(postId) || postId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Live post ID is required.",
    })
  }

  return await endLiveSession(event, postId)
})
