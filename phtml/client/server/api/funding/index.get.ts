// English description: Returns the backend-backed funding campaign catalog for the funding route.

import { getQuery } from "h3"
import { fetchFundingCatalog } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tab = query.tab === "mine" ? "mine" : "browse"

  return await fetchFundingCatalog(event, {
    tab,
    offset: typeof query.offset === "string" ? Number(query.offset) || null : null,
    limit: typeof query.limit === "string" ? Number(query.limit) || 9 : 9,
  })
})
