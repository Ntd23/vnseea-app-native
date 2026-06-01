// English description: Registers a real backend reaction for a chat message and returns the normalized reaction key.

import { createError, readBody } from "h3"
import { isFeedStoryReaction } from "../../../src/feed/domain/constants/story-reactions"
import { registerMessageReaction } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messageId?: number
    reaction?: string
  }>(event)
  const messageId = Number(body.messageId ?? 0)
  const reaction = String(body.reaction ?? "")

  if (!Number.isFinite(messageId) || messageId <= 0 || !isFeedStoryReaction(reaction)) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid message reaction payload is required.",
    })
  }

  return await registerMessageReaction(event, {
    messageId,
    reaction,
  })
})
