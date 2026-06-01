// English description: Domain types for account settings data and update commands.

import type { LocationSelection } from "../../../location/domain/types/location.types"

export type SettingsFieldValue = string | number | boolean | File | LocationSelection
export type SettingsSectionSlug =
  | "general"
  | "profile"
  | "privacy"
  | "avatar"
  | "design"
  | "password"
  | "twoFactor"
  | "notifications"
  | "emailNotifications"
  | "socialLinks"
  | "verification"
  | "deleteAccount"
  | "manage-sessions"
  | "blocked-users"
  | "my-info"
  | "addresses"
  | "monetization"

export interface SettingSession {
  id: number
  platform: string
  browser: string
  time: string
  ip: string
}

export interface SettingsBlockedUser {
  id: number
  name: string
  username: string
  avatar: string
  url: string
  lastseen?: string
}

export type SettingsRole = "user" | "moderator" | "admin"

export interface SettingsUser {
  id: number
  name: string
  username?: string
  email?: string
  phone?: string
  gender?: string
  birthday?: string
  countryId?: string
  website?: string
  about?: string
  verified?: boolean
  wallet?: string | number
  points?: string | number
  pointsConfig?: {
    pointAllowWithdrawal: boolean
    dollarToPointCost: number
    adsCurrency: string
    currencySymbol: string
    pointBaseCurrency: string
    walletCurrency: string
    walletExchangeRate: number
    displayCurrency: string
    displayCurrencySymbol: string
    displayExchangeRate: number
    exchangeUpdate: number
  }
  role?: SettingsRole
  avatar?: string
  cover?: string
  phoneNumber?: string
  first_name?: string
  last_name?: string
  working?: string
  working_link?: string
  address?: string
  lat?: string | number
  lng?: string | number
  school?: string
  school_completed?: number | string
  relationship_id?: string
  facebook?: string
  twitter?: string
  linkedin?: string
  instagram?: string
  youtube?: string
  vk?: string
  message_privacy?: string
  follow_privacy?: string
  friend_privacy?: string
  post_privacy?: string
  showlastseen?: string
  confirm_followers?: string
  show_activities_privacy?: string
  visit_privacy?: string
  birth_privacy?: string
  status?: string
  share_my_location?: string
  share_my_data?: string
  e_liked?: number | string
  e_shared?: number | string
  e_wondered?: number | string
  e_commented?: number | string
  e_followed?: number | string
  e_liked_page?: number | string
  e_visited?: number | string
  e_mentioned?: number | string
  e_joined_group?: number | string
  e_accepted?: number | string
  e_profile_wall_post?: number | string
  e_sentme_msg?: number | string
  notification_settings?: Record<string, number | string>
  two_factor?: number | string
  two_factor_verified?: number | string
  two_factor_method?: string
  background_image_status?: number | string
  css_file?: string
  active?: number | string
  pro_type?: string
  is_pro?: number | string
  session_hash?: string
}

export interface SettingsUpdateInput {
  section: SettingsSectionSlug
  username?: SettingsFieldValue
  email?: SettingsFieldValue
  phone?: SettingsFieldValue
  gender?: SettingsFieldValue
  birthday?: SettingsFieldValue
  countryId?: SettingsFieldValue
  verified?: SettingsFieldValue
  wallet?: SettingsFieldValue
  website?: SettingsFieldValue
  about?: SettingsFieldValue
  firstName?: SettingsFieldValue
  lastName?: SettingsFieldValue
  working?: SettingsFieldValue
  workingLink?: SettingsFieldValue
  address?: SettingsFieldValue
  lat?: SettingsFieldValue
  lng?: SettingsFieldValue
  school?: SettingsFieldValue
  relationship?: SettingsFieldValue
  completed?: SettingsFieldValue
  privacy?: Record<string, SettingsFieldValue>
  emailNotifications?: Record<string, SettingsFieldValue>
  notifications?: Record<string, SettingsFieldValue>
  socialLinks?: Record<string, SettingsFieldValue>
  currentPassword?: SettingsFieldValue
  newPassword?: SettingsFieldValue
  confirmPassword?: SettingsFieldValue
  twoFactor?: SettingsFieldValue
  phoneNumber?: SettingsFieldValue
  code?: SettingsFieldValue
  factorMethod?: SettingsFieldValue
  passwordConfirm?: SettingsFieldValue
  fields?: Record<string, SettingsFieldValue>
}

export interface SettingsUpdateResult {
  success: boolean
  status: string
  message: string
}

export interface SettingsPointsExchangeInput {
  points: number
}

export interface SettingsPointsExchangeResult {
  success: boolean
  message: string
  exchangedPoints: number
  amount: number
  points: number
  wallet: number
}
