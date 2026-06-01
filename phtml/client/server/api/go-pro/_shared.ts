// English description: Maps backend Pro package configuration into the go-pro bounded-context catalog shape.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import type { GoProCatalog, GoProPackage } from "../../../src/go-pro/domain/types/go-pro.types"

type BackendEntity = Record<string, unknown>

type BackendGoProResponse = {
  api_status?: number | string
  membership_system?: boolean
  currency?: string
  currency_symbol?: string
  current_pro_type?: string | number
  current_is_pro?: boolean
  packages?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendUpgradeResponse = {
  api_status?: number | string
  message_data?: string
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const booleanFeature = (value: unknown) => value === true || value === 1 || value === "1"

const mapPackage = (
  item: BackendEntity,
  currency: string,
  currencySymbol: string,
  currentType: string,
): GoProPackage => {
  const id = asString(item.type)
  const features: GoProPackage["features"] = {
    featured_member: booleanFeature(item.featured_member),
    profile_visitors: booleanFeature(item.profile_visitors),
    last_seen: booleanFeature(item.last_seen),
    verified_badge: booleanFeature(item.verified_badge),
    posts_promotion: asString(item.posts_promotion),
    pages_promotion: asString(item.pages_promotion),
    discount: asString(item.discount),
    max_upload: asString(item.max_upload),
  }

  return {
    id,
    name: asString(item.name) || id,
    price: asNumber(item.price),
    currency,
    currencySymbol,
    color: asString(item.color) || "#0000ff",
    image: asString(item.image),
    nightImage: asString(item.night_image),
    features,
    isCurrent: id === currentType,
  }
}

export async function fetchGoProCatalog(event: H3Event): Promise<GoProCatalog> {
  const response = await createBackendApiClient(event).get<BackendGoProResponse>("go-pro")
  const data = assertBackendApiSuccess(response, "Unable to load Pro packages.")
  const currency = asString(data.currency)
  const currencySymbol = asString(data.currency_symbol)
  const currentType = asString(data.current_pro_type)

  return {
    membershipSystem: Boolean(data.membership_system),
    currentIsPro: Boolean(data.current_is_pro),
    packages: (data.packages ?? []).map(item => mapPackage(item, currency, currencySymbol, currentType)),
  }
}

export async function upgradeGoPro(event: H3Event, type: string) {
  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: "Pro package type is required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendUpgradeResponse>("upgrade", {
    type,
  })

  assertBackendApiSuccess(response, "Unable to upgrade Pro package.")

  return { ok: true }
}
