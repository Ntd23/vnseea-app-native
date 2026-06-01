// English description: Joins a backend live post as a viewer through the legacy PHP LiveKit live join handler.

import { createError, readBody } from "h3"
import { joinLiveSession } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ postId?: number | string }>(event)
  const postId = Number(body?.postId ?? 0)

  if (!Number.isFinite(postId) || postId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Live post ID is required.",
    })
  }

  return await joinLiveSession(event, postId)
})
