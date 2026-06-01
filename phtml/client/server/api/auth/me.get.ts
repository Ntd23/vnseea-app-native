// English description: Returns the current authenticated backend user mapped into the shared frontend auth shape.

import { getCookie } from "h3"
import { getBackendBaseCandidates } from "../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import type { CurrentAuthUser } from "../../../src/auth/domain/types/auth.types"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendCurrentUserPayload = {
  user_id?: number | string
  name?: string
  username?: string
  avatar?: string
  admin?: number | string
  is_pro?: number | string
  pro_type?: number | string
  can_boost_posts?: number | string
  can_boost_pages?: number | string
  wallet?: number | string
  points?: number | string
}

type BackendCurrentUserResponse = {
  api_status?: number | string
  user_data?: BackendCurrentUserPayload
}

const asNonEmptyString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export default defineEventHandler(async (event): Promise<CurrentAuthUser | null> => {
  const backendUserSession = getCookie(event, "user_id")
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  if (!backendUserSession) {
    throw createError({
      statusCode: 401,
      statusMessage: "Not authenticated",
    })
  }
  const runtimeConfig = useRuntimeConfig(event)

  try {
    const baseCandidates = getBackendBaseCandidates(
      String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase),
    )
    let response: BackendCurrentUserResponse | null = null

    for (const baseURL of baseCandidates) {
      try {
        response = await $fetch<BackendCurrentUserResponse>(backendRoutes.session.currentUser(backendUserSession), {
          baseURL,
        })
        break
      }
      catch {
        response = null
      }
    }

    const apiStatus = Number(response?.api_status ?? 0)
    const user = response?.user_data

    if (apiStatus < 200 || apiStatus >= 300 || !user?.user_id || !user.name) {
      throw createError({
        statusCode: 401,
        statusMessage: "Not authenticated",
      })
    }

    const adminLevel = Number(user.admin ?? 0)

    return {
      id: Number(user.user_id),
      name: asNonEmptyString(user.name) || "User",
      username: asNonEmptyString(user.username),
      avatarUrl: resolveMediaUrl(user.avatar) || undefined,
      role: adminLevel === 1 ? "admin" : adminLevel === 2 ? "moderator" : "user",
      isAdmin: adminLevel === 1,
      isModerator: adminLevel === 2,
      isPro: Number(user.is_pro ?? 0) > 0,
      proType: asNonEmptyString(String(user.pro_type ?? "")),
      canBoostPosts: Number(user.can_boost_posts ?? 0) > 0,
      canBoostPages: Number(user.can_boost_pages ?? 0) > 0,
      wallet: user.wallet,
      points: user.points !== undefined && user.points !== null
        ? Number(user.points)
        : undefined,
    }
  }
  catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Not authenticated",
    })
  }
})
