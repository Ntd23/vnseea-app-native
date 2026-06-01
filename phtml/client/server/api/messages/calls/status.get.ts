// English description: Polls the PHP call flow for outgoing answer, decline, or no-answer states.

import { callBackend, readCallQuery } from "./_shared"

export default defineEventHandler(async (event) => {
  const input = readCallQuery(event)

  if (!input.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "A call id is required.",
    })
  }

  const action = input.type === "audio" ? "check_for_audio_answer" : "check_for_answer"
  const response = await callBackend(event, action, { id: input.id })

  return {
    status: Number(response.status ?? 204),
    url: typeof response.url === "string" ? response.url : "",
    text: typeof response.text_call_declined === "string" ? response.text_call_declined : "",
  }
})
