// English description: Resolves the current backend-authenticated user from browser cookies or app bearer tokens.

import { createError, getCookie, getHeader, getQuery, type H3Event } from "h3"
import { backendRoutes } from "../../src/shared-kernel/application/constants/route-registry"
import { getBackendBaseCandidates } from "./backend-api-client"
import { clearBackendSessionCookie } from "./backend-session-cookie"

export type BackendCurrentUserData = Record<string, unknown> & {
  user_id?: number | string
  session_hash?: string
}

type BackendCurrentUserResponse = {
  api_status?: number | string
  user_data?: BackendCurrentUserData
  errors?: {
    error_text?: string
  }
}

export async function getBackendCurrentUser(event: H3Event) {
  const query = getQuery(event)
  const authorization = String(getHeader(event, "authorization") || "").trim()
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || ""
  const userSession = getCookie(event, "user_id") || bearerToken || String(query.access_token || "").trim()

  if (!userSession) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  const runtimeConfig = useRuntimeConfig(event)
  const cookie = event.node.req.headers.cookie
  const isCookieSession = Boolean(getCookie(event, "user_id"))
  let currentUserResponse: BackendCurrentUserResponse | null = null

  for (const baseURL of getBackendBaseCandidates(
    String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase),
  )) {
    try {
      currentUserResponse = await $fetch<BackendCurrentUserResponse>(
        backendRoutes.session.currentUser(userSession),
        {
          baseURL,
          credentials: "include",
          headers: isCookieSession && cookie ? { cookie } : undefined,
        },
      )
      break
    }
    catch {
      currentUserResponse = null
    }
  }

  const currentUser = currentUserResponse?.user_data
  const currentUserId = currentUser?.user_id
  const status = Number(currentUserResponse?.api_status ?? 0)

  if (status < 200 || status >= 300 || !currentUserId) {
    if (isCookieSession) {
      clearBackendSessionCookie(event)
    }

    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
      data: currentUserResponse,
    })
  }

  return currentUser
}
