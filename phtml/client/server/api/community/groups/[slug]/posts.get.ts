// English description: Returns backend group timeline posts for a community group resolved by slug.

import { getQuery, getRouterParam } from "h3"
import { fetchFeedPosts } from "../../../feed/_shared"
import { resolveGroupRecordBySlug } from "../../_shared"

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const query = getQuery(event)
  const group = await resolveGroupRecordBySlug(event, slug)

  return await fetchFeedPosts(event, {
    type: "get_group_posts",
    limit: Number(query.limit ?? 10) || 10,
    afterPostId: Number(query.afterPostId ?? 0) || 0,
    groupId: group.id,
  })
})
