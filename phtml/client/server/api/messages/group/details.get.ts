// English description: Loads normalized group chat details for the active messages side panel.

import { getQuery } from "h3"
import { fetchMessageGroupDetails } from "../_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const groupId = Number(query.groupId ?? 0)

  return await fetchMessageGroupDetails(event, groupId)
})
