// English description: Updates a group chat name or avatar through the legacy PHP group edit endpoint.

import { parseUpdateMessageGroupBody, updateMessageGroupDetails } from "../_shared"

export default defineEventHandler(async (event) => {
  const body = await parseUpdateMessageGroupBody(event)

  return await updateMessageGroupDetails(event, body)
})
