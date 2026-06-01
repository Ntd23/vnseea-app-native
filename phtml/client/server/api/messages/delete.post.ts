// English description: Deletes or leaves the selected backend conversation through the matching PHP chat endpoint.

import { readBody } from "h3"
import { deleteMessageConversation } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  return await deleteMessageConversation(event, {
    type: String(body.type || "") as "user" | "group" | "page",
    userId: Number(body.userId || 0),
    groupId: Number(body.groupId || 0),
    pageId: Number(body.pageId || 0),
    recipientId: Number(body.recipientId || 0),
    beforeId: 0,
  })
})
