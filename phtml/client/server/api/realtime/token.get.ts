// English description: Issues a short-lived realtime auth token for the current backend session user.

import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createRealtimeToken } from "../../utils/realtime-token"

async function isRealtimeReachable(realtimeUrl: string) {
  const normalizedUrl = String(realtimeUrl || "").trim().replace(/\/$/, "")

  if (!normalizedUrl) {
    return false
  }

  try {
    const response = await $fetch.raw(`${normalizedUrl}/healthz`, {
      method: "GET",
      timeout: 1500,
    })

    return response.status >= 200 && response.status < 300
  }
  catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const secret = String(runtimeConfig.realtimeSecret || "")
  const realtimeUrl = String(runtimeConfig.public.realtimeUrl || "").trim()

  if (!secret || !realtimeUrl) {
    return {
      token: "",
      expiresAt: 0,
      enabled: false,
      url: "",
    }
  }

  const reachable = await isRealtimeReachable(realtimeUrl)

  if (!reachable) {
    return {
      token: "",
      expiresAt: 0,
      enabled: false,
      url: realtimeUrl,
    }
  }

  const currentUser = await getBackendCurrentUser(event)
  const userId = String(currentUser.user_id || "")

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Not authenticated",
    })
  }

  return {
    ...createRealtimeToken(userId, secret),
    enabled: true,
    url: realtimeUrl,
  }
})
