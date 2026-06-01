// English description: Recalls a single chat message through the PHP messages backend.

import { readBody } from "h3"
import { recallMessage } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  return await recallMessage(event, {
    messageId: Number(body.messageId ?? 0),
  })
})
