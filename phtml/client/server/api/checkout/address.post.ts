// English description: Saves a checkout shipping address through the PHP address API (supports both add and edit).

import { readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import type { ShippingAddress } from "../../../src/checkout/domain/types/checkout.types"
import { assertBackendOk, normalizeAddress } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const body = await readBody<ShippingAddress>(event)

  const type = body.id ? "edit" : "add"

  const response = await client.post<{ api_status?: number | string; message?: string; errors?: { error_text?: string } }>("address", {
    type,
    id: body.id,
    name: body.fullName,
    phone: body.phone,
    country: body.country,
    city: body.city,
    zip: body.postalCode,
    address: body.streetAddress,
  })
  assertBackendOk(response)

  const addresses = await client.post<{ data?: Parameters<typeof normalizeAddress>[0][] }>("address", { type: "get", limit: 20 })
  
  // Find the exact address we just created or modified
  const matched = Array.isArray(addresses.data)
    ? addresses.data.find(addr => body.id ? String(addr.id) === String(body.id) : (addr.name === body.fullName && addr.phone === body.phone))
    : null

  const saved = normalizeAddress(matched || (Array.isArray(addresses.data) ? addresses.data[0] : null))

  if (!saved) {
    return body
  }

  return saved
})
