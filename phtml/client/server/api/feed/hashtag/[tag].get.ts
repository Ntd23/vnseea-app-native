// English description: Returns normalized hashtag posts for the Nuxt hashtag route.

import { getQuery, getRouterParam } from "h3"
import { fetchFeedPosts } from "../_shared"

export default defineEventHandler(async (event) =>
  await fetchFeedPosts(event, {
    type: "hashtag",
    tag: String(getRouterParam(event, "tag") ?? ""),
    limit: Number(getQuery(event).limit ?? 10) || 10,
    afterPostId: Number(getQuery(event).afterPostId ?? 0) || 0,
  }),
)
