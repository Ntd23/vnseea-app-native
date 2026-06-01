// English description: Returns a seller order detail from the PHP marketplace purchased endpoint when available.

import { getRouterParam } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { findPurchase, normalizeSellerOrder } from "../orders/_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const id = String(getRouterParam(event, "id") ?? "")

  const response = await client.post<{ data?: Parameters<typeof findPurchase>[0] }>("market", {
    type: "purchased",
    limit: 50,
  })
  const purchase = findPurchase(Array.isArray(response.data) ? response.data : [], id)

  return purchase ? normalizeSellerOrder(event, purchase) : null
})
