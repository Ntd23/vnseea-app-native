// English description: Polls the backend live heartbeat and returns structured activity and counters for the /live host studio.

import { createError, readBody } from "h3"
import { fetchLiveHeartbeat } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    postId?: number | string
    knownCommentIds?: number[]
    knownReactionIds?: number[]
    page?: "live" | "story"
  }>(event)
  const postId = Number(body?.postId ?? 0)

  if (!Number.isFinite(postId) || postId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Live post ID is required.",
    })
  }

  return await fetchLiveHeartbeat(event, {
    postId,
    page: body?.page === "story" ? "story" : "live",
    knownCommentIds: Array.isArray(body?.knownCommentIds)
      ? body.knownCommentIds
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0)
      : [],
    knownReactionIds: Array.isArray(body?.knownReactionIds)
      ? body.knownReactionIds
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0)
      : [],
  })
})
