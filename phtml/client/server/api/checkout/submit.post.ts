// English description: Places a real marketplace order through the PHP market buy API.

import { createError, readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import type { CheckoutSnapshot } from "../../../src/checkout/domain/types/checkout.types"
import { assertBackendOk } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const body = await readBody<CheckoutSnapshot>(event)
  const addressId = body.shippingAddress?.id

  if (!addressId) {
    throw createError({
      statusCode: 400,
      statusMessage: "A saved shipping address is required before checkout.",
    })
  }

  const response = await client.post<{ api_status?: number | string; message?: string; errors?: { error_text?: string } }>("market", {
    type: "buy",
    address_id: addressId,
  })
  assertBackendOk(response)

  return {
    success: true,
    orderId: "",
  }
})
