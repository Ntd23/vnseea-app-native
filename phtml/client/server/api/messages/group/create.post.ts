// English description: Creates a new group chat through the legacy PHP chat modal flow with optional avatar upload.

import { createMessageGroup, parseCreateMessageGroupBody } from "../_shared"

export default defineEventHandler(async (event) => {
  const body = await parseCreateMessageGroupBody(event)

  return await createMessageGroup(event, body)
})
