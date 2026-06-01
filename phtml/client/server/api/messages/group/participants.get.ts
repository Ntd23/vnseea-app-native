// English description: Returns normalized create-group participant candidates from the legacy PHP chat search flow.

import { getQuery } from "h3"
import { searchCreateMessageGroupParticipants } from "../_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return await searchCreateMessageGroupParticipants(
    event,
    String(query.query ?? ""),
  )
})
