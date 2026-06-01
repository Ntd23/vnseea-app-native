// English description: Returns backend-backed threads for one forum from the forum API bridge.

import { getQuery } from "h3"
import { fetchForumThreads } from "../_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return await fetchForumThreads(event, {
    forumId: typeof query.forumId === "string" ? Number(query.forumId) || 0 : 0,
    q: typeof query.q === "string" ? query.q : "",
    offset: typeof query.offset === "string" ? Number(query.offset) || null : null,
    limit: typeof query.limit === "string" ? Number(query.limit) || 10 : 10,
  })
})
