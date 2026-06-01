// English description: Returns all saved shipping addresses from the PHP backend.

import { createBackendApiClient } from "../../utils/backend-api-client"
import { normalizeAddress } from "./_shared"
import type { ShippingAddress } from "../../../src/checkout/domain/types/checkout.types"

export default defineEventHandler(async (event): Promise<ShippingAddress[]> => {
  const client = createBackendApiClient(event)

  const response = await client.post<{ data?: any[] }>("address", {
    type: "get",
    limit: 20,
  })

  const raw = Array.isArray(response.data) ? response.data : []
  return raw.map(normalizeAddress).filter(Boolean) as ShippingAddress[]
})
