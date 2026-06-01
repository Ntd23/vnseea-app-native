import { defineEventHandler, readBody } from "h3"
import { createBackendApiClient } from "../../../../utils/backend-api-client"
import { resolvePageRecordBySlug } from "../../_shared"
import { assertBackendApiSuccess } from "../../../../utils/backend-api-response"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const slug = event.context.params?.slug

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Page slug is required",
    })
  }

  const body = await readBody(event)
  const userId = body?.userId

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId is required in the request body",
    })
  }

  // Use the shared method to resolve the page record to get the pageId
  const page = await resolvePageRecordBySlug(event, slug, client)
  if (!page) {
    throw createError({
      statusCode: 404,
      statusMessage: "Page not found",
    })
  }

  const response = await client.post(
    "invite-page",
    { 
      page_id: page.id,
      user_id: userId,
    },
  )

  assertBackendApiSuccess(response, "Không thể gửi lời mời.")

  return { success: true }
})
