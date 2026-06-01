// English description: Returns a LiveKit join payload for an answered one-to-one call.

import { callBackend, mapLiveKitSession, readCallQuery } from "./_shared"

export default defineEventHandler(async (event) => {
  const input = readCallQuery(event)

  if (!input.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "A call id is required.",
    })
  }

  const response = await callBackend(event, "livekit_call_payload", {
    id: input.id,
    type: input.type,
  })

  return mapLiveKitSession(response, "outgoing")
})
