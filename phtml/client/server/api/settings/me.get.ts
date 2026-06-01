// English description: Returns the current PHP-authenticated user settings payload for Nuxt settings pages.

import { getBackendCurrentUser } from "../../utils/backend-current-user"

export type SettingsMeResponse = Record<string, unknown> & {
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
  address?: string
  lat?: string
  lng?: string
  verified?: boolean
  wallet?: number | string
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
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : undefined

const asBooleanNumber = (value: unknown) =>
  value === true || value === "1" || value === 1

const roleFromAdminFlag = (value: unknown) => {
  const flag = Number(value ?? 0)

  if (flag === 1) return "admin"
  if (flag === 2) return "moderator"

  return "user"
}

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

export default defineEventHandler(async (event): Promise<SettingsMeResponse> => {
  const user = await getBackendCurrentUser(event)
  const pointsConfig = user.points_config && typeof user.points_config === "object"
    ? user.points_config as Record<string, unknown>
    : {}

  const name = asString(user.name) || asString(user.username) || "User"

  return {
    ...user,
    id: Number(user.user_id ?? user.id),
    name,
    username: asString(user.username),
    email: asString(user.email),
    phone: asString(user.phone_number),
    phoneNumber: asString(user.phone_number),
    gender: asString(user.gender),
    birthday: asString(user.birthday),
    countryId: asString(user.country_id),
    website: asString(user.website),
    about: asString(user.about),
    address: asString(user.address),
    lat: asString(user.lat),
    lng: asString(user.lng),
    verified: asBooleanNumber(user.verified),
    wallet: asString(user.wallet),
    pointsConfig: {
      pointAllowWithdrawal: asBooleanNumber(pointsConfig.point_allow_withdrawal),
      dollarToPointCost: asNumber(pointsConfig.dollar_to_point_cost),
      adsCurrency: asString(pointsConfig.ads_currency) || "USD",
      currencySymbol: asString(pointsConfig.currency_symbol) || "$",
      pointBaseCurrency: asString(pointsConfig.point_base_currency) || "USD",
      walletCurrency: asString(pointsConfig.wallet_currency) || asString(pointsConfig.ads_currency) || "USD",
      walletExchangeRate: asNumber(pointsConfig.wallet_exchange_rate) || 1,
      displayCurrency: asString(pointsConfig.display_currency) || "VND",
      displayCurrencySymbol: asString(pointsConfig.display_currency_symbol) || "₫",
      displayExchangeRate: asNumber(pointsConfig.display_exchange_rate),
      exchangeUpdate: asNumber(pointsConfig.exchange_update),
    },
    role: roleFromAdminFlag(user.admin),
  }
})
