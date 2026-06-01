// English description: Returns real marketplace products from the PHP get-products API.

import { getQuery } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUserId, normalizeProductsResponse } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const query = getQuery(event)
  const limit = Math.min(50, Math.max(1, Number(query.limit || 35)))
  const category = String(query.category || "")
  const subCategory = String(query.subCategory || "")
  const distance = String(query.distance || "")
  const userId = query.mine ? await getBackendCurrentUserId(event) : ""
  const sort = String(query.sort || "")

  const response = await client.post<Parameters<typeof normalizeProductsResponse>[1]>("get-products", {
    limit,
    user_id: userId || undefined,
    offset: query.offset,
    keyword: query.keyword || query.q,
    category_id: /^\d+$/.test(category) ? category : undefined,
    sub_id: /^\d+$/.test(subCategory) ? subCategory : undefined,
    // The PHP distance query requires a logged-in user with valid lat/lng.
    // The endpoint returns whether distance is available, while the client applies
    // local filtering only for products that include a computed distance.
    distance: undefined,
    order_by: ["price_low", "price_high"].includes(sort) ? sort : undefined,
  })

  return normalizeProductsResponse(event, response, limit)
})
