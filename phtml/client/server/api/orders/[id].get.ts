// English description: Returns a buyer order detail from the PHP marketplace purchased endpoint.

import { getRouterParam } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { findPurchase, normalizeBuyerOrder } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const id = String(getRouterParam(event, "id") ?? "")

  const response = await client.post<{ data?: Parameters<typeof findPurchase>[0] }>("market", {
    type: "purchased",
    limit: 50,
  })
  const purchase = findPurchase(Array.isArray(response.data) ? response.data : [], id)

  return purchase ? normalizeBuyerOrder(event, purchase) : null
})
