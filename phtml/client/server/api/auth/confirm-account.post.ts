import { createError, readBody } from "h3"
import type { ConfirmAccountInput, ConfirmAccountResult } from "../../../src/auth/domain/types/auth.types"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendConfirmAccountResponse = {
  api_status?: number | string
  access_token?: string
  user_id?: number | string
  user_platform?: string
  timezone?: string
  message?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<ConfirmAccountResult> => {
  const client = createBackendApiClient(event)
  const body = await readBody<ConfirmAccountInput>(event)

  if (!body.userId || !Number.isFinite(Number(body.userId))) {
    throw createError({
      statusCode: 422,
      statusMessage: "A valid userId is required.",
    })
  }

  if (!body.code?.trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: "Confirmation code is required.",
    })
  }

  const response = assertBackendApiSuccess(
    await client.post<BackendConfirmAccountResponse, Record<string, unknown>>(backendRoutes.api.activeAccountSms, {
      user_id: Number(body.userId),
      code: body.code.trim(),
      timezone: body.timezone || "UTC",
      device_type: "windows",
    }),
    "Unable to verify the account.",
  )

  return {
    success: true,
    message: response.message ?? "Account verified successfully.",
    accessToken: String(response.access_token || ""),
    userId: response.user_id ? Number(response.user_id) : undefined,
    userPlatform: response.user_platform,
    timezone: response.timezone,
  }
})
