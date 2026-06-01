// English description: Updates a seller marketplace order status through the PHP market API.

import { getRouterParam, readBody } from "h3"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { assertBackendOk } from "../../orders/_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const id = String(getRouterParam(event, "id") ?? "")
  const body = await readBody<{ status?: string }>(event)

  const statusMap: Record<string, string> = {
    pending: "accepted",
    shipping: "shipped",
    delivered: "delivered",
    cancelled: "canceled",
  }
  const response = await client.post<{ api_status?: number | string; message?: string; errors?: { error_text?: string } }>("market", {
    type: "change_status",
    hash_id: id,
    status: statusMap[String(body?.status)] || body?.status,
  })
  assertBackendOk(response)

  return { success: true }
})
