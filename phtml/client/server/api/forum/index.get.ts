// English description: Returns backend-backed forum sections for the forum route.

import { getQuery } from "h3"
import { fetchForumCatalog } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return await fetchForumCatalog(event, {
    q: typeof query.q === "string" ? query.q : "",
    offset: typeof query.offset === "string" ? Number(query.offset) || null : null,
    limit: typeof query.limit === "string" ? Number(query.limit) || 20 : 20,
  })
})
