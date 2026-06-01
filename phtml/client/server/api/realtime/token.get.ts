// English description: Issues a short-lived realtime auth token for the current backend session user.

import { getCookie } from "h3"
import { getBackendBaseCandidates } from "../../utils/backend-api-client"
import { createRealtimeToken } from "../../utils/realtime-token"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendCurrentUserResponse = {
  api_status?: number | string
  user_data?: {
    user_id?: number | string
  }
}

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

  const backendUserSession = getCookie(event, "user_id")

  if (!backendUserSession) {
    throw createError({
      statusCode: 401,
      statusMessage: "Not authenticated",
    })
  }

  let userId = ""
  const baseCandidates = getBackendBaseCandidates(
    String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase),
  )

  for (const baseURL of baseCandidates) {
    try {
      const response = await $fetch<BackendCurrentUserResponse>(backendRoutes.session.currentUser(backendUserSession), {
        baseURL,
      })

      if (Number(response.api_status ?? 0) >= 200 && Number(response.api_status ?? 0) < 300 && response.user_data?.user_id) {
        userId = String(response.user_data.user_id)
        break
      }
    }
    catch {
      userId = ""
    }
  }

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
