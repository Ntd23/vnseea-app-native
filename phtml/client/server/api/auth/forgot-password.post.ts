import { readBody, createError } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import type { ForgotPasswordInput, ForgotPasswordResult } from "../../../src/auth/domain/types/auth.types"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendForgotPasswordResponse = {
  api_status?: number | string
  message?: string
  user_id?: number | string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<ForgotPasswordResult> => {
  const client = createBackendApiClient(event)
  const body = await readBody<ForgotPasswordInput>(event)
  const identity = body.identity?.trim() ?? ""
  const isEmailIdentity = identity.includes("@")

  if (!identity) {
    throw createError({
      statusCode: 422,
      statusMessage: "Email or phone number is required.",
    })
  }

  if (isEmailIdentity) {
    const response = assertBackendApiSuccess(
      await client.post<BackendForgotPasswordResponse, Record<string, unknown>>(backendRoutes.api.sendResetPasswordEmail, {
        email: identity,
      }),
      "Unable to send password reset instructions.",
    )

    return {
      success: true,
      channel: "email",
      message: response.message ?? "Password reset instructions have been sent to your email.",
    }
  }

  const phoneNum = identity.replace(/\D/g, "")

  if (phoneNum.length < 8) {
    throw createError({
      statusCode: 422,
      statusMessage: "Phone number must contain at least 8 digits.",
    })
  }

  const response = assertBackendApiSuccess(
    await client.post<BackendForgotPasswordResponse, Record<string, unknown>>(backendRoutes.api.sendResetPasswordSms, {
      phone_num: phoneNum,
    }),
    "Unable to send password reset instructions.",
  )

  return {
    success: true,
    channel: "sms",
    message: response.message ?? "A reset code has been sent to your phone.",
    userId: response.user_id ? Number(response.user_id) : undefined,
  }
})
