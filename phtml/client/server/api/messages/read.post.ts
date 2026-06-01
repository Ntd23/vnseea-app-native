// English description: Marks all backend chat conversations as read through the PHP read_chats endpoint.

import { markAllMessagesAsRead } from "./_shared"

export default defineEventHandler(async event =>
  await markAllMessagesAsRead(event),
)
