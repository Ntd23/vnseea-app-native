// English description: Updates cart item quantities or removes them from PHP backend cart database.

import { readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendOk } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const body = await readBody<{
    productId: string
    quantity: number
    action: "update" | "remove"
  }>(event)

  if (body.action === "update") {
    const response = await client.post<{ api_status?: number | string }>("market", {
      type: "change_qty",
      product_id: body.productId,
      qty: body.quantity,
    })
    assertBackendOk(response)
  } else if (body.action === "remove") {
    const response = await client.post<{ api_status?: number | string }>("market", {
      type: "remove_cart",
      product_id: body.productId,
    })
    assertBackendOk(response)
  }

  return { success: true }
})
