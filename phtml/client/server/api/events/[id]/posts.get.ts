// English description: Returns the normalized event-detail post feed for a specific backend event id.

import { createError, getQuery } from "h3"
import { fetchFeedPosts } from "../../feed/_shared"

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id ?? 0)

  if (!Number.isFinite(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event id is invalid.",
    })
  }

  const query = getQuery(event)

  return await fetchFeedPosts(event, {
    type: "get_event_posts",
    eventId: id,
    limit: Number(query.limit ?? 10) || 10,
    afterPostId: Number(query.afterPostId ?? 0) || 0,
  })
})
