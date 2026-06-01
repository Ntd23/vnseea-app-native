// English description: Returns the backend-backed jobs catalog with real filters, metadata, and pagination state for the jobs route.

import { getQuery } from "h3"
import { fetchJobsCatalog } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return await fetchJobsCatalog(event, {
    q: typeof query.q === "string" ? query.q.trim() : "",
    category: typeof query.category === "string" ? query.category.trim() : "",
    type: typeof query.type === "string" ? query.type.trim() : "",
    distance: typeof query.distance === "string" ? Number(query.distance) || undefined : undefined,
    afterId: typeof query.afterId === "string" ? Number(query.afterId) || undefined : undefined,
    limit: typeof query.limit === "string" ? Number(query.limit) || undefined : 10,
  })
})
