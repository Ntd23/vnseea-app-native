// English description: Nuxt server endpoint to accept or decline a group request on the PHP backend API.

import { defineEventHandler, createError, readBody } from "h3"
import { createBackendApiClient } from "../../../../../utils/backend-api-client"
import { resolveGroupRecordBySlug } from "../../../_shared"

type ActionBody = {
  userId: number
  action: "accept" | "decline"
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

  const body = await readBody<ActionBody>(event)
  if (!body?.userId || !body?.action) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId and action ('accept' | 'decline') are required",
    })
  }

  const group = await resolveGroupRecordBySlug(event, slug)
  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found",
    })
  }

  const type = body.action === "accept" ? "accept_request" : "delete_request"

  const response = await client.post<any>(
    "groups",
    {
      type,
      group_id: group.id,
      user_id: body.userId,
    },
  )

  if (response?.api_status !== 200) {
    throw createError({
      statusCode: 400,
      statusMessage: response?.errors?.error_text || "Failed to respond to group request",
    })
  }

  return { success: true }
})
