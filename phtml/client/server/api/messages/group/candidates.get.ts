// English description: Searches addable users for a group chat using the backend group chat search surface.

import { getQuery } from "h3"
import { searchMessageGroupCandidates } from "../_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return await searchMessageGroupCandidates(event, {
    groupId: Number(query.groupId ?? 0),
    query: String(query.query ?? ""),
  })
})
