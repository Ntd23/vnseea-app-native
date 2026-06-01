// English description: Returns the normalized photo-focused feed payload for the media gallery route.

import { getQuery } from "h3"
import { fetchFeedPosts } from "./_shared"

export default defineEventHandler(async (event) =>
  await fetchFeedPosts(event, {
    type: "get_news_feed",
    limit: Number(getQuery(event).limit ?? 18) || 18,
    afterPostId: Number(getQuery(event).afterPostId ?? 0) || 0,
    postType: "photos",
  }),
)
