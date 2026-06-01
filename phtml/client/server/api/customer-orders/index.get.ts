// English description: Returns seller orders from the PHP marketplace orders endpoint.

import { getQuery, createError } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { normalizeSellerOrder, type BackendPurchase } from "../orders/_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const query = getQuery(event)

  const response = await client.post<{ api_status?: number | string; data?: BackendPurchase[]; message?: string; errors?: { error_text?: string } }>("market", {
    type: "orders",
    limit: 50,
    offset: query.offset,
  })

  const status = Number(response.api_status ?? 0)
  if (status < 200 || status >= 300) {
    throw createError({
      statusCode: 400,
      statusMessage: response.errors?.error_text || response.message || "Unable to load seller orders.",
    })
  }

  return (Array.isArray(response.data) ? response.data : []).map(purchase => normalizeSellerOrder(event, purchase))
})
