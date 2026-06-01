// English description: Returns backend-backed forum threads created by the current user.

import { getQuery } from "h3"
import { fetchMyForumThreads } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return await fetchMyForumThreads(event, {
    q: typeof query.q === "string" ? query.q : "",
    offset: typeof query.offset === "string" ? Number(query.offset) || null : null,
    limit: typeof query.limit === "string" ? Number(query.limit) || 10 : 10,
  })
})
