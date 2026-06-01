// English description: Deletes a checkout shipping address through the PHP address API.

import { readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendOk } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const body = await readBody<{ id: string | number }>(event)

  if (!body.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing address id for deletion",
    })
  }

  const response = await client.post<{ api_status?: number | string; message?: string; errors?: { error_text?: string } }>("address", {
    type: "delete",
    id: body.id,
  })
  
  assertBackendOk(response)

  return { success: true }
})
