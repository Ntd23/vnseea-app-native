import type { AuthRepository } from "../../domain/repositories/AuthRepository"
import type {
  ConfirmAccountInput,
  ConfirmAccountResult,
  ConfirmLoginInput,
  ConfirmLoginResult,
  CurrentAuthUser,
  ConfirmResetSmsInput,
  ConfirmResetSmsResult,
  ForgotPasswordInput,
  ForgotPasswordResult,
  LoginInput,
  LoginResult,
  RegisterAccountInput,
  RegisterAccountResult,
  ResetPasswordInput,
  ResetPasswordResult,
} from "../../domain/types/auth.types"
import { apiRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"

export function createApiAuthRepository(): AuthRepository {
  const client = useNuxtApiClient()

  return {
    async getCurrentUser(): Promise<CurrentAuthUser | null> {
      return await client.get<CurrentAuthUser | null>(
        apiRoutes.auth.me,
      )
    },
    async login(input: LoginInput): Promise<LoginResult> {
      return await client.post<LoginResult, LoginInput>(
        apiRoutes.auth.login,
        input,
      )
    },
    async register(input: RegisterAccountInput): Promise<RegisterAccountResult> {
      return await client.post<RegisterAccountResult, RegisterAccountInput>(
        apiRoutes.auth.register,
        input,
      )
    },
    async confirmLogin(input: ConfirmLoginInput): Promise<ConfirmLoginResult> {
      return await client.post<ConfirmLoginResult, ConfirmLoginInput>(
        apiRoutes.auth.confirmLogin,
        input,
      )
    },
    async confirmAccount(input: ConfirmAccountInput): Promise<ConfirmAccountResult> {
      return await client.post<ConfirmAccountResult, ConfirmAccountInput>(
        apiRoutes.auth.confirmAccount,
        input,
      )
    },
    async requestPasswordReset(input: ForgotPasswordInput): Promise<ForgotPasswordResult> {
      return await client.post<ForgotPasswordResult, ForgotPasswordInput>(
        apiRoutes.auth.forgotPassword,
        input,
      )
    },
    async confirmResetSms(input: ConfirmResetSmsInput): Promise<ConfirmResetSmsResult> {
      return await client.post<ConfirmResetSmsResult, ConfirmResetSmsInput>(
        apiRoutes.auth.confirmResetSms,
        input,
      )
    },
    async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
      return await client.post<ResetPasswordResult, ResetPasswordInput>(
        apiRoutes.auth.resetPassword,
        input,
      )
    },
  }
}
