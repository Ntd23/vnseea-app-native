// English description: Creates a backend-backed reply for one forum thread.

import { getRouterParam, readBody } from "h3"
import { replyForumThread } from "../../_shared"
import type { ForumReplyPayload } from "../../../../../src/forum/domain/types/forum.types"

export default defineEventHandler(async (event) => {
  const body = await readBody<ForumReplyPayload>(event)
  return await replyForumThread(event, {
    ...body,
    threadId: Number(getRouterParam(event, "id")) || body.threadId,
  })
})
