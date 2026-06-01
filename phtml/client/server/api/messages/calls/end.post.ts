// English description: Ends, cancels, or times out a one-to-one call through the PHP call flow.

import { assertBackendStatus, callBackend, readCallBody } from "./_shared"

export default defineEventHandler(async (event) => {
  const input = await readCallBody(event)

  if (!input.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "A call id is required.",
    })
  }

  assertBackendStatus(
    await callBackend(event, "close_call", {
      id: input.id,
      call_type: input.type,
      status: input.status || "ended",
      duration: input.duration,
      provider: input.provider || "livekit",
    }),
    "Unable to end call.",
  )

  return { ok: true }
})
