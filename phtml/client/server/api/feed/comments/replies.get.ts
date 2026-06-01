// English description: Loads reply comments for a feed comment from the PHP comments API.

import { createError, getQuery } from "h3"
import { fetchCommentReplies } from "../_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const commentId = Number(Array.isArray(query.commentId) ? query.commentId[0] : query.commentId ?? 0)
  const limit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit ?? 10)
  const offset = Number(Array.isArray(query.offset) ? query.offset[0] : query.offset ?? 0)

  if (!Number.isFinite(commentId) || commentId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Comment id is required.",
    })
  }

  return await fetchCommentReplies(event, {
    commentId,
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10,
    offset: Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0,
  })
})
