// English description: Returns a normalized message thread for the requested user, group, or page conversation.

import { fetchMessageThread, readThreadQuery } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = readThreadQuery(event)
  return await fetchMessageThread(event, query)
})
