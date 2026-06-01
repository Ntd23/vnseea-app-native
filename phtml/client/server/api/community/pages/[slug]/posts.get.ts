// English description: Returns backend page timeline posts for a community page resolved by slug.

import { getQuery, getRouterParam } from "h3"
import { fetchFeedPosts } from "../../../feed/_shared"
import { resolvePageRecordBySlug } from "../../_shared"

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const query = getQuery(event)
  const page = await resolvePageRecordBySlug(event, slug)

  return await fetchFeedPosts(event, {
    type: "get_page_posts",
    limit: Number(query.limit ?? 10) || 10,
    afterPostId: Number(query.afterPostId ?? 0) || 0,
    pageId: page.id,
  })
})
