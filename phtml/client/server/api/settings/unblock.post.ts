// English description: Unblocks a specific user for the current authenticated user.

import { createBackendApiClient } from "../../utils/backend-api-client"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ userId: number }>(event)
  
  if (!body.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required",
    })
  }

  const client = createBackendApiClient(event)
  const response = await client.post<{ api_status: number, block_status: string }>("block-user", {
    user_id: body.userId,
    block_action: "un-block"
  })

  return {
    success: response.api_status === 200 && response.block_status === "un-blocked"
  }
})
