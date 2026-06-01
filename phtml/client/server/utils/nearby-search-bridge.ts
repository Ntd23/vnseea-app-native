// English description: Shared Nuxt bridge helpers for PHP-backed nearby user and page search.

import type { H3Event } from "h3"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"
import { getBackendCurrentUser } from "./backend-current-user"
import { createBackendWebClient } from "./backend-web-client"
import { createBackendMediaUrlResolver } from "./backend-media-url"
import type {
  NearbySearchItem,
  NearbySearchResponse,
  NearbySearchType,
} from "../../src/search-nearby/domain/types/search-nearby.types"

type BackendNearbyItem = Record<string, unknown> & {
  type?: string
  id?: number | string
  title?: string
  subtitle?: string
  description?: string
  location?: string
  address?: string
  avatar?: string
  url?: string
  lat?: number | string | null
  lng?: number | string | null
  distance_meters?: number | string | null
}

type BackendNearbyResponse = {
  status?: number | string
  items?: BackendNearbyItem[]
}

export interface NearbySearchBridgeOptions {
  query: unknown
  type: unknown
  distance: unknown
  limit: unknown
  defaultLimit?: number
  maxLimit?: number
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNullableNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null
  }

  const numeric = Number(value)

  return Number.isFinite(numeric) && !(numeric === 0) ? numeric : null
}

const asNumber = (value: unknown) => {
  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : 0
}

const normalizeType = (value: unknown): NearbySearchType => {
  const type = asString(value)

  return type === "user" || type === "page" ? type : "all"
}

const normalizeDistance = (value: unknown) => {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) return 5

  return Math.min(Math.max(Math.round(numeric), 1), 1000)
}

const normalizeLimit = (value: unknown, defaultLimit: number, maxLimit: number) => {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) return defaultLimit

  return Math.min(Math.max(Math.round(numeric), 1), maxLimit)
}

const createHref = (item: BackendNearbyItem) => {
  const type = item.type === "page" ? "page" : "user"
  const subtitle = asString(item.subtitle).replace(/^@/, "")

  if (type === "page" && subtitle) {
    return appRoutes.pageDetail(subtitle)
  }

  if (type === "user" && subtitle) {
    return appRoutes.profile(subtitle)
  }

  return asString(item.url) || appRoutes.searchNearby
}

const mapBackendItem = (
  item: BackendNearbyItem,
  resolveMediaUrl: (value: unknown) => string,
): NearbySearchItem | null => {
  const type = item.type === "page" ? "page" : item.type === "user" ? "user" : null
  const backendId = asNumber(item.id)
  const lat = asNullableNumber(item.lat)
  const lng = asNullableNumber(item.lng)
  const title = asString(item.title)

  if (!type || backendId <= 0 || !title || lat === null || lng === null) {
    return null
  }

  return {
    id: `${type}-${backendId}`,
    backendId,
    type,
    title,
    subtitle: asString(item.subtitle),
    description: asString(item.description),
    locationLabel: asString(item.location) || asString(item.address),
    avatarUrl: resolveMediaUrl(item.avatar),
    href: createHref(item),
    lat,
    lng,
    distanceMeters: asNullableNumber(item.distance_meters),
  }
}

export async function fetchNearbySearchFromBackend(
  event: H3Event,
  options: NearbySearchBridgeOptions,
): Promise<NearbySearchResponse> {
  const currentUser = await getBackendCurrentUser(event)
  const originLat = asNullableNumber(currentUser.lat)
  const originLng = asNullableNumber(currentUser.lng)
  const originAddress = asString(currentUser.address)

  if (originLat === null || originLng === null) {
    return {
      status: "needs_location",
      origin: {
        address: originAddress,
        lat: null,
        lng: null,
      },
      items: [],
    }
  }

  const client = createBackendWebClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = await client.postForm<BackendNearbyResponse>(
    "explore_nearby_suggestions",
    undefined,
    {
      query: asString(options.query),
      type: normalizeType(options.type),
      distance: normalizeDistance(options.distance),
      limit: normalizeLimit(options.limit, options.defaultLimit ?? 40, options.maxLimit ?? 80),
      origin_lat: originLat,
      origin_lng: originLng,
    },
  )

  return {
    status: "ready",
    origin: {
      address: originAddress,
      lat: originLat,
      lng: originLng,
    },
    items: (response.items ?? [])
      .map(item => mapBackendItem(item, resolveMediaUrl))
      .filter((item): item is NearbySearchItem => Boolean(item)),
  }
}
