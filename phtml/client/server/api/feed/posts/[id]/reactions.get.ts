// English description: Returns normalized reaction counts and users for one feed post.

import { createError, getQuery } from "h3"
import { fetchFeedPostReactions } from "../../_shared"

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id
  const postId = Number(rawId ?? 0)

  if (!postId || !Number.isFinite(postId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post id is invalid.",
    })
  }

  const query = getQuery(event)
  const reaction = Array.isArray(query.reaction) ? query.reaction[0] : query.reaction
  const limit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit ?? 80)
  const offset = Number(Array.isArray(query.offset) ? query.offset[0] : query.offset ?? 0)

  return await fetchFeedPostReactions(event, {
    postId,
    reaction: typeof reaction === "string" ? reaction : undefined,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 80,
    offset: Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0,
  })
})
