import { readBody, createError } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import type { RegisterAccountInput, RegisterAccountResult } from "../../../src/auth/domain/types/auth.types"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendRegisterResponse = {
  api_status?: number | string
  access_token?: string
  user_id?: number | string
  user_platform?: string
  membership?: boolean
  message?: string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event): Promise<RegisterAccountResult> => {
  const client = createBackendApiClient(event)
  const body = await readBody<RegisterAccountInput>(event)
  const identity = body.email?.trim() ?? ""
  const username = body.username?.trim() ?? ""
  const digitsOnly = identity.replace(/\D/g, "")
  const isEmailIdentity = identity.includes("@")
  const email = isEmailIdentity ? identity : (digitsOnly ? `phone_${digitsOnly}@vnseea.invalid` : "")
  const phoneNum = !isEmailIdentity && digitsOnly ? digitsOnly : ""

  if (!identity) {
    throw createError({
      statusCode: 422,
      statusMessage: "Email or phone number is required.",
    })
  }

  if (!username) {
    throw createError({
      statusCode: 422,
      statusMessage: "Username is required.",
    })
  }

  const response = assertBackendApiSuccess(
    await client.post<BackendRegisterResponse, Record<string, unknown>>(backendRoutes.api.createAccount, {
      username,
      first_name: body.firstName,
      last_name: body.lastName,
      email,
      phone_num: phoneNum || undefined,
      password: body.password,
      confirm_password: body.confirmPassword,
      gender: body.gender || "male",
    }),
    "Unable to create account.",
  )

  const apiStatus = Number(response.api_status ?? 0)
  const verificationRequired = apiStatus >= 220

  return {
    success: true,
    status: verificationRequired ? "verification_required" : "active",
    message: response.message
      ?? (verificationRequired
        ? "Registration succeeded. Please verify your account before signing in."
        : "Account created successfully."),
    accessToken: response.access_token,
    userId: response.user_id ? Number(response.user_id) : undefined,
    userPlatform: response.user_platform,
    membershipRequired: response.membership ?? false,
  }
})
