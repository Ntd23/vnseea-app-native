// English description: Returns the authenticated user's backend notification list and unread count.

import { getQuery } from "h3"
import { fetchBackendNotifications, normalizeNotificationSummary } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const offset = Array.isArray(query.offset) ? query.offset[0] : query.offset
  const response = await fetchBackendNotifications(event, {
    offset,
  })

  return normalizeNotificationSummary(event, response)
})
