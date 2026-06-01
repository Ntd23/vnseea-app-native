// English description: Resolves the current backend-authenticated user from the PHP browser session.

import { createError, getCookie, type H3Event } from "h3"
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
  const userSession = getCookie(event, "user_id")

  if (!userSession) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  const runtimeConfig = useRuntimeConfig(event)
  const cookie = event.node.req.headers.cookie
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
          headers: cookie ? { cookie } : undefined,
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
    clearBackendSessionCookie(event)

    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
      data: currentUserResponse,
    })
  }

  return currentUser
}
