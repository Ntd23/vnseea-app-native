// English description: Syncs current group call status and joined participants for the Nuxt call page.

import { createError } from "h3"
import { readGroupCallIdQuery, syncGroupCall } from "./_shared"

export default defineEventHandler(async (event) => {
  const id = readGroupCallIdQuery(event)

  if (id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid group call id is required.",
    })
  }

  return await syncGroupCall(event, id)
})
