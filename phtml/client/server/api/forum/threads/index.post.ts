// English description: Creates a backend-backed forum thread through the forum API bridge.

import { readBody } from "h3"
import { createForumThread } from "../_shared"
import type { ForumThreadPayload } from "../../../../src/forum/domain/types/forum.types"

export default defineEventHandler(async (event) => {
  const body = await readBody<ForumThreadPayload>(event)
  return await createForumThread(event, body)
})
