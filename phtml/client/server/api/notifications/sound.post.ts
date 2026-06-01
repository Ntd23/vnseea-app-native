// English description: Toggles backend notification sound preference through the legacy PHP request handler.

import { createError } from "h3"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendWebClient } from "../../utils/backend-web-client"

type BackendSoundToggleResponse = {
  status?: number | string
  message?: string
}

export default defineEventHandler(async (event) => {
  const currentUser = await getBackendCurrentUser(event)
  const sessionHash = typeof currentUser.session_hash === "string" ? currentUser.session_hash.trim() : ""

  if (!sessionHash) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
      data: { reason: "Missing backend session hash." },
    })
  }

  const client = createBackendWebClient(event)
  const response = await client.postForm<BackendSoundToggleResponse>("turn-off-sound", {
    hash_id: sessionHash,
  })
  const status = Number(response.status ?? 0)

  if (status < 200 || status >= 300) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unable to update notification sound.",
      data: response,
    })
  }

  const message = String(response.message || "")

  return {
    soundEnabled: !message.includes("volume-x"),
  }
})
