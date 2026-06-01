// English description: Loads normalized post comments from the PHP comments API.

import { createError, getQuery } from "h3"
import { fetchPostComments } from "../_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const postId = Number(Array.isArray(query.postId) ? query.postId[0] : query.postId ?? 0)
  const limit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit ?? 50)
  const offset = Number(Array.isArray(query.offset) ? query.offset[0] : query.offset ?? 0)

  if (!Number.isFinite(postId) || postId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post id is required.",
    })
  }

  return await fetchPostComments(event, {
    postId,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 50,
    offset: Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0,
  })
})
