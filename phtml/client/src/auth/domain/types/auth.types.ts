export type AuthIdentity = string

export interface CurrentAuthUser {
  id: number
  name: string
  username?: string
  avatarUrl?: string
  role: "user" | "moderator" | "admin"
  isAdmin: boolean
  isModerator: boolean
  isPro?: boolean
  proType?: string
  canBoostPosts?: boolean
  canBoostPages?: boolean
  wallet?: number | string
  points?: number
}

export interface LoginInput {
  identity: AuthIdentity
  password: string
  timezone?: string
}

export interface LoginResult {
  success: boolean
  status: "authenticated" | "two_factor_required"
  message: string
  accessToken?: string
  userId?: number
  userPlatform?: string
  timezone?: string
  membershipRequired?: boolean
}

export interface ConfirmLoginInput {
  userId: number
  code: string
  timezone?: string
}

export interface ConfirmLoginResult {
  success: boolean
  message: string
  accessToken: string
  userId?: number
  userPlatform?: string
  timezone?: string
}

export interface RegisterAccountInput {
  firstName: string
  lastName: string
  username: string
  email: AuthIdentity
  password: string
  confirmPassword: string
  birthDay: number | null
  birthMonth: number | null
  birthYear: number | null
  gender: string
  hasExistingStorefront: boolean
  acceptTerms: boolean
}

export interface RegisterAccountResult {
  success: boolean
  status: "active" | "verification_required"
  message: string
  accessToken?: string
  userId?: number
  userPlatform?: string
  membershipRequired?: boolean
}

export interface ForgotPasswordInput {
  identity: AuthIdentity
}

export interface ForgotPasswordResult {
  success: boolean
  channel: "email" | "sms" | "unknown"
  message: string
  userId?: number
}

export interface ConfirmAccountInput {
  userId: number
  code: string
  timezone?: string
}

export interface ConfirmAccountResult {
  success: boolean
  message: string
  accessToken: string
  userId?: number
  userPlatform?: string
  timezone?: string
}

export interface ConfirmResetSmsInput {
  userId: number
  code: string
}

export interface ConfirmResetSmsResult {
  success: boolean
  message: string
  resetCode: string
  email: string
}

export interface ResetPasswordInput {
  email: string
  code: string
  newPassword: string
}

export interface ResetPasswordResult {
  success: boolean
  message: string
}
