// English description: Returns the normalized random-video post payload for watch and reels routes.

import { getQuery } from "h3"
import { fetchFeedPosts } from "./_shared"

export default defineEventHandler(async (event) =>
  await fetchFeedPosts(event, {
    type: "get_random_videos",
    limit: Number(getQuery(event).limit ?? 12) || 12,
    afterPostId: Number(getQuery(event).afterPostId ?? 0) || 0,
  }),
)
