// English description: Returns a single normalized feed post by id for post-detail routes and notification deep links.

import { createError } from "h3"
import { fetchFeedPostById } from "../_shared"

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id
  const postId = Number(rawId ?? 0)

  if (!postId || !Number.isFinite(postId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post id is invalid.",
    })
  }

  const post = await fetchFeedPostById(event, postId)

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: "Post not found.",
    })
  }

  return post
})
