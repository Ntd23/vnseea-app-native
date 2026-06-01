// English description: Declines an incoming one-to-one call through the PHP call flow.

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
    await callBackend(event, "decline_call", {
      id: input.id,
      type: input.type,
    }),
    "Unable to decline call.",
  )

  return { ok: true }
})
