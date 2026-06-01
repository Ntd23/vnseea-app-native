// English description: Nuxt server endpoint to kick a user out of a group using the WoWonder PHP backend API.

import { defineEventHandler, createError, readBody } from "h3"
import { createBackendApiClient } from "../../../../../utils/backend-api-client"
import { resolveGroupRecordBySlug } from "../../../_shared"

type KickBody = {
  userId: number
}

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const slug = event.context.params?.slug

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Group slug is required",
    })
  }

  const body = await readBody<KickBody>(event)
  if (!body?.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId is required",
    })
  }

  const group = await resolveGroupRecordBySlug(event, slug)
  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found",
    })
  }

  const response = await client.post<any>(
    "delete_group_member",
    {
      group_id: group.id,
      user_id: body.userId,
    },
  )

  if (response?.api_status !== 200) {
    throw createError({
      statusCode: 400,
      statusMessage: response?.errors?.error_text || "Failed to remove member from group",
    })
  }

  return { success: true }
})
