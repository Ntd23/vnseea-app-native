// English description: Returns LiveKit token and room metadata for a Nuxt-rendered group call page.

import { createError } from "h3"
import { fetchGroupCallPayload, readGroupCallIdQuery } from "./_shared"

export default defineEventHandler(async (event) => {
  const id = readGroupCallIdQuery(event)

  if (id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid group call id is required.",
    })
  }

  const payload = await fetchGroupCallPayload(event, id)

  if (payload.status !== 200 || !payload.id) {
    throw createError({
      statusCode: 404,
      statusMessage: "The group call could not be loaded.",
    })
  }

  return payload
})
