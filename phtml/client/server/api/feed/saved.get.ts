// English description: Returns the normalized saved-posts payload for the Nuxt saved page.

import { getQuery } from "h3"
import { fetchFeedPosts } from "./_shared"

export default defineEventHandler(async (event) =>
  await fetchFeedPosts(event, {
    type: "saved",
    limit: Number(getQuery(event).limit ?? 10) || 10,
    afterPostId: Number(getQuery(event).afterPostId ?? 0) || 0,
  }),
)
