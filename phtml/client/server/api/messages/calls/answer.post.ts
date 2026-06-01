// English description: Accepts an incoming one-to-one call and returns the LiveKit join payload.

import { assertBackendStatus, callBackend, mapLiveKitSession, readCallBody } from "./_shared"

export default defineEventHandler(async (event) => {
  const input = await readCallBody(event)

  if (!input.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "A call id is required.",
    })
  }

  const answerResponse = await callBackend(event, "answer_call", {
    id: input.id,
    type: input.type,
  })
  const payload = await callBackend(event, "livekit_call_payload", {
    id: input.id,
    type: input.type,
  })

  if (Number(answerResponse.status ?? 0) !== 200 && Number(payload.status ?? 0) !== 200) {
    assertBackendStatus(answerResponse, "Unable to answer call.")
  }

  return mapLiveKitSession(payload, "incoming")
})
