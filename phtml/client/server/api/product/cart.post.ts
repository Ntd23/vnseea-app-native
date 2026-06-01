// English description: Adds a real marketplace product to the PHP cart.

import { readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendOk } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const body = await readBody<{ productId?: number | string; quantity?: number | string }>(event)

  const response = await client.post<{ api_status?: number | string; count?: number | string; message?: string; errors?: { error_text?: string } }>("market", {
    type: "add_cart",
    product_id: body.productId,
    qty: body.quantity || 1,
  })
  assertBackendOk(response)

  return {
    count: Number(response.count ?? 0),
  }
})
