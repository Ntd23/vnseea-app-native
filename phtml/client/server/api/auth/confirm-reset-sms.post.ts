import { createError, readBody } from "h3"
import type { ConfirmResetSmsInput, ConfirmResetSmsResult } from "../../../src/auth/domain/types/auth.types"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendConfirmResetSmsResponse = {
  api_status?: number | string
  message?: string
  reset_code?: string
  email?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<ConfirmResetSmsResult> => {
  const client = createBackendApiClient(event)
  const body = await readBody<ConfirmResetSmsInput>(event)

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
    await client.post<BackendConfirmResetSmsResponse, Record<string, unknown>>(backendRoutes.api.confirmResetPasswordSms, {
      user_id: Number(body.userId),
      code: body.code.trim(),
    }),
    "Unable to confirm the SMS reset code.",
  )

  if (!response.reset_code || !response.email) {
    throw createError({
      statusCode: 500,
      statusMessage: "The backend did not return the reset payload.",
    })
  }

  return {
    success: true,
    message: response.message ?? "Reset code confirmed successfully.",
    resetCode: response.reset_code,
    email: response.email,
  }
})
