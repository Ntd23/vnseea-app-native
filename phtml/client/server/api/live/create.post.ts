// English description: Creates a backend live post and host session through the legacy PHP LiveKit livestream handler.

import { createError, readBody } from "h3"
import { createLiveSession } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    title?: string
    description?: string
    privacy?: string
    streamName?: string
  }>(event)

  const streamName = typeof body?.streamName === "string" ? body.streamName.trim() : ""

  if (!streamName) {
    throw createError({
      statusCode: 400,
      statusMessage: "Live stream name is required.",
    })
  }

  return await createLiveSession(event, {
    title: typeof body?.title === "string" ? body.title.trim() : "",
    description: typeof body?.description === "string" ? body.description.trim() : "",
    privacy: typeof body?.privacy === "string" ? body.privacy.trim() || "0" : "0",
    streamName,
    thumbnailFile: null,
  })
})
