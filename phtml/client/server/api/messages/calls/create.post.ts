// English description: Starts a one-to-one audio or video call through the PHP call flow.

import {
  assertBackendStatus,
  callBackend,
  getSessionHash,
  mapCreateResult,
  readCallBody,
} from "./_shared"

export default defineEventHandler(async (event) => {
  const input = await readCallBody(event)
  const { currentUserId } = await getSessionHash(event)

  if (!input.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "A recipient userId is required.",
    })
  }

  const action = input.type === "audio" ? "create_new_audio_call" : "create_new_video_call"
  const response = await callBackend(event, action, {
    new: "true",
    user_id1: currentUserId,
    user_id2: input.userId,
  })

  assertBackendStatus(response, "Unable to start call.")
  return mapCreateResult(response, input.type)
})
