// English description: Marks backend notifications as seen by reusing the general-data notification behavior.

import { fetchBackendNotifications, normalizeNotificationSummary } from "./_shared"

export default defineEventHandler(async (event) => {
  const response = await fetchBackendNotifications(event, { seen: true })

  return normalizeNotificationSummary(event, response)
})
