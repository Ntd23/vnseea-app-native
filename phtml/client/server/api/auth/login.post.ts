import { createError, readBody, setCookie } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import type { LoginInput, LoginResult } from "../../../src/auth/domain/types/auth.types"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendLoginResponse = {
  api_status?: number | string
  access_token?: string
  user_id?: number | string
  user_platform?: string
  timezone?: string
  membership?: boolean
  message?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<LoginResult> => {
  const client = createBackendApiClient(event)
  const body = await readBody<LoginInput>(event)
  const identity = body.identity?.trim() ?? ""
  const password = body.password ?? ""

  if (!identity) {
    throw createError({
      statusCode: 422,
      statusMessage: "Username, email, or phone number is required.",
    })
  }

  if (!password) {
    throw createError({
      statusCode: 422,
      statusMessage: "Password is required.",
    })
  }

  const response = assertBackendApiSuccess(
    await client.post<BackendLoginResponse, Record<string, unknown>>(backendRoutes.api.auth, {
      username: identity,
      password,
      timezone: body.timezone || "UTC",
      device_type: "windows",
    }),
    "Unable to sign in.",
  )

  const hasAccessToken = Boolean(response.access_token)
  if (hasAccessToken && response.access_token) {
  setCookie(event, "user_id", response.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  if (response.user_id) {
    setCookie(event, "logged_user_id", String(response.user_id), {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
  }
}

  return {
    success: true,
    status: hasAccessToken ? "authenticated" : "two_factor_required",
    message: response.message ?? (hasAccessToken
      ? "Signed in successfully."
      : "Please enter your confirmation code."),
    accessToken: response.access_token,
    userId: response.user_id ? Number(response.user_id) : undefined,
    userPlatform: response.user_platform,
    timezone: response.timezone,
    membershipRequired: response.membership ?? false,
  }
})
