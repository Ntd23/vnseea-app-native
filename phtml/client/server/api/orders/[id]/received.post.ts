// English description: Marks a buyer marketplace order as delivered through the PHP market API.

import { getRouterParam } from "h3"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { assertBackendOk } from "../_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const id = String(getRouterParam(event, "id") ?? "")

  const response = await client.post<{ api_status?: number | string; message?: string; errors?: { error_text?: string } }>("market", {
    type: "change_status",
    hash_id: id,
    status: "delivered",
  })
  assertBackendOk(response)

  return { success: true }
})
