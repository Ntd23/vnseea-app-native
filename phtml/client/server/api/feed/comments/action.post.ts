// English description: Bridges feed comment reply actions to the PHP comments API.

import { createError, readBody } from "h3"
import { runCommentAction } from "../_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const action = String(body.action ?? "").trim()
  const commentId = Number(body.commentId ?? 0) || 0
  const text = typeof body.text === "string" ? body.text.trim() : ""
  const target = String(body.target ?? "").trim()
  const targetId = Number(body.targetId ?? 0) || 0
  const reaction = typeof body.reaction === "string" ? body.reaction.trim() : ""

  if (action === "reply") {
    if (!commentId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Comment id is required.",
      })
    }

    if (!text) {
      throw createError({
        statusCode: 400,
        statusMessage: "Reply text is required.",
      })
    }

    return await runCommentAction(event, {
      action: "reply",
      commentId,
      text,
    })
  }

  if (action === "reaction") {
    if (!targetId || (target !== "comment" && target !== "reply") || !reaction) {
      throw createError({
        statusCode: 400,
        statusMessage: "Comment reaction payload is invalid.",
      })
    }

    return await runCommentAction(event, {
      action: "reaction",
      target,
      targetId,
      reaction,
    })
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Comment action is invalid.",
  })
})
