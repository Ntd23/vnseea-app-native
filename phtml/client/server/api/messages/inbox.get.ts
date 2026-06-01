// English description: Returns normalized inbox contacts for user, group, and page message threads.

import { fetchInboxContacts } from "./_shared"

export default defineEventHandler(async event =>
  await fetchInboxContacts(event),
)
