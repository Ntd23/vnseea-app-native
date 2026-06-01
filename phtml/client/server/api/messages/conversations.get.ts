// English description: Keeps the registered messages conversations API route mapped to the normalized backend inbox bridge.

import { fetchInboxContacts } from "./_shared"

export default defineEventHandler(async event =>
  await fetchInboxContacts(event),
)
