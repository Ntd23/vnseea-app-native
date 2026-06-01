// English description: Adds invited users to a group chat or removes existing members through the backend group chat API.

import { createError, readBody } from "h3"
import { updateMessageGroupMembers } from "../_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const action = body.action === "remove" ? "remove" : body.action === "add" ? "add" : ""
  const rawIds = Array.isArray(body.userIds)
    ? body.userIds
    : [body.userId]

  if (!action) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid group member action is required.",
    })
  }

  return await updateMessageGroupMembers(event, {
    action,
    groupId: Number(body.groupId ?? 0),
    userIds: rawIds.map(value => Number(value)),
  })
})
