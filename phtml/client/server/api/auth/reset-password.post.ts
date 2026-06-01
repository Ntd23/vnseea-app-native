import { readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import type { ResetPasswordInput, ResetPasswordResult } from "../../../src/auth/domain/types/auth.types"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendResetPasswordResponse = {
  api_status?: number | string
  message?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<ResetPasswordResult> => {
  const client = createBackendApiClient(event)
  const body = await readBody<ResetPasswordInput>(event)

  const response = assertBackendApiSuccess(
    await client.post<BackendResetPasswordResponse, Record<string, unknown>>(backendRoutes.api.resetPassword, {
      email: body.email,
      code: body.code,
      new_password: body.newPassword,
    }),
    "Unable to reset password.",
  )

  return {
    success: true,
    message: response.message ?? "Password updated successfully.",
  }
})
