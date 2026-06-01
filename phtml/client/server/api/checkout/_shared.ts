// English description: Checkout API bridge helpers that normalize PHP market and address responses.

import { createError, getCookie, type H3Event } from "h3"
import { getBackendBaseCandidates } from "../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import type { CheckoutLineItem, CheckoutSnapshot, ShippingAddress } from "../../../src/checkout/domain/types/checkout.types"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendMarketCheckoutResponse = {
  api_status?: number | string
  data?: BackendProduct[]
  total?: number | string
}

type BackendAddressResponse = {
  api_status?: number | string
  data?: BackendAddress[]
}

type BackendCurrentUserResponse = {
  api_status?: number | string
  user_data?: {
    wallet?: number | string
  }
}

type BackendAddress = {
  id?: number | string
  name?: string
  phone?: string
  country?: string
  city?: string
  zip?: string
  address?: string
}

type BackendProduct = {
  id?: number | string
  name?: string
  price?: number | string
  units?: number | string
  currency?: string | number
  images?: Array<string | { image?: string; image_org?: string }>
}

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const asString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  return fallback
}

const getProductImage = (product: BackendProduct, resolveMediaUrl: ReturnType<typeof createBackendMediaUrlResolver>) => {
  const firstImage = Array.isArray(product.images) ? product.images[0] : undefined
  const image = typeof firstImage === "string"
    ? firstImage
    : firstImage?.image_org || firstImage?.image

  return resolveMediaUrl(image) || undefined
}

const normalizeCurrency = (value: unknown) => {
  const currency = asString(value, "VND").toUpperCase()
  return /^[A-Z]{3}$/.test(currency) ? currency : "VND"
}

export const normalizeAddress = (address: BackendAddress | null | undefined): ShippingAddress | null => {
  if (!address) {
    return null
  }

  return {
    id: asString(address.id) || undefined,
    fullName: asString(address.name),
    phone: asString(address.phone),
    country: asString(address.country),
    city: asString(address.city),
    postalCode: asString(address.zip),
    streetAddress: asString(address.address),
  }
}

export const normalizeCheckoutSnapshot = (
  event: H3Event,
  checkout: BackendMarketCheckoutResponse,
  addresses: BackendAddressResponse,
  walletBalance: number,
): CheckoutSnapshot => {
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const products = Array.isArray(checkout.data) ? checkout.data : []

  const items: CheckoutLineItem[] = products.map(product => ({
    id: asString(product.id),
    name: asString(product.name),
    price: asNumber(product.price),
    quantity: Math.max(1, asNumber(product.units, 1)),
    imageUrl: getProductImage(product, resolveMediaUrl),
    currency: normalizeCurrency(product.currency),
  })).filter(item => item.id && item.name)

  return {
    items,
    shippingAddress: normalizeAddress(Array.isArray(addresses.data) ? addresses.data[0] : null),
    walletBalance,
    shippingFee: 0,
  }
}

export const getBackendWalletBalance = async (event: H3Event) => {
  const backendUserSession = getCookie(event, "user_id")

  if (!backendUserSession) {
    return 0
  }

  const runtimeConfig = useRuntimeConfig(event)
  const baseCandidates = getBackendBaseCandidates(
    String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase),
  )

  for (const baseURL of baseCandidates) {
    try {
      const response = await $fetch<BackendCurrentUserResponse>(backendRoutes.session.currentUser(backendUserSession), {
        baseURL,
      })
      return asNumber(response.user_data?.wallet)
    }
    catch {
      // Try the next configured backend base.
    }
  }

  return 0
}

export const assertBackendOk = (response: { api_status?: number | string; message?: string; errors?: { error_text?: string } }) => {
  const status = Number(response.api_status ?? 0)

  if (status < 200 || status >= 300) {
    throw createError({
      statusCode: 400,
      statusMessage: response.errors?.error_text || response.message || "Backend rejected checkout request.",
    })
  }
}
