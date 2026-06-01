// English description: Shared backend mappers and resolvers for community Nuxt API routes.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { getBackendWebBaseUrl } from "../../utils/backend-media-url"
import type {
  CommunityGroupRecord,
  CommunityPageRecord,
} from "../../../src/community/domain/types/community.types"

type BackendEntity = Record<string, unknown>

type BackendCommunityResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  groups?: BackendEntity[]
  pages?: BackendEntity[]
  liked_pages?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendSearchResponse = {
  api_status?: number | string
  groups?: BackendEntity[]
  pages?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendRecommendedResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendGroupDetailResponse = {
  api_status?: number | string
  group_data?: BackendEntity
  errors?: {
    error_text?: string
  }
}

type BackendPageDetailResponse = {
  api_status?: number | string
  page_data?: BackendEntity
  errors?: {
    error_text?: string
  }
}

type CommunityListFetch =
  | "my_groups"
  | "joined_groups"
  | "groups"
  | "pages"
  | "liked_pages"

const accentPalette = [
  "#1d4ed8",
  "#2563eb",
  "#0f766e",
  "#0369a1",
  "#7c3aed",
  "#0f766e",
  "#0369a1",
] as const

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const isTruthy = (value: unknown) =>
  value === true
  || value === 1
  || value === "1"
  || value === "yes"
  || value === "true"

const firstString = (entity: BackendEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asString(entity[key])
    if (value) return value
  }

  return ""
}

const firstNumber = (entity: BackendEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asNumber(entity[key])
    if (value > 0) return value
  }

  return 0
}

const firstNullableNumber = (entity: BackendEntity, keys: string[]) => {
  for (const key of keys) {
    const rawValue = entity[key]
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue
    }

    const value = Number(rawValue)
    if (Number.isFinite(value)) return value
  }

  return null
}

const toUniqueList = (values: Array<string | undefined>) =>
  Array.from(new Set(values.map(value => value?.trim()).filter(Boolean) as string[]))

const normalizeUrl = (value: string) => {
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

const normalizeImagePath = (path: string, baseUrl: string) => {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) {
    try {
      const imageUrl = new URL(path)
      const requestBase = new URL(baseUrl)

      if (requestBase.protocol === "https:" && imageUrl.protocol === "http:" && imageUrl.hostname === requestBase.hostname) {
        return `${requestBase.origin}${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`
      }
    }
    catch {
      // Keep the raw backend value when URL parsing fails.
    }

    return path
  }
  const cleanBase = baseUrl.replace(/\/+$/, "")
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

const normalizeGroupPrivacy = (value: unknown): CommunityGroupRecord["privacy"] => {
  const normalized = asString(value).toLowerCase()

  if (normalized === "2" || normalized === "private") return "private"
  if (normalized === "3" || normalized === "secret") return "secret"

  return "public"
}

const normalizeGroupCategory = (value: unknown): CommunityGroupRecord["category"] => {
  const normalized = asString(value).toLowerCase()

  if (["business", "technology", "education", "travel", "marketplace", "auto"].includes(normalized)) {
    return normalized as CommunityGroupRecord["category"]
  }

  return "auto"
}

const normalizePageCategory = (value: unknown): CommunityPageRecord["category"] => {
  const normalized = asString(value).toLowerCase()

  // Map backend IDs to frontend technical strings
  if (normalized === "2") return "local-business"
  if (normalized === "5") return "creator"
  if (normalized === "4") return "brand"
  if (normalized === "13") return "education"
  if (normalized === "3") return "organization"
  if (normalized === "12") return "service"

  if (["local-business", "creator", "brand", "education", "organization", "service"].includes(normalized)) {
    return normalized as CommunityPageRecord["category"]
  }

  return "local-business"
}

const mapCtaIdToLabel = (id: unknown): string => {
  const sid = String(id || "0")
  switch (sid) {
    case "1": return "follow"
    case "2": return "catalog"
    case "3": return "view"
    case "5": return "booking"
    case "11": return "message"
    case "12": return "call"
    case "16": return "call"
    case "21": return "booking"
    default: return ""
  }
}

const createAccent = (id: number) =>
  accentPalette[Math.abs(id) % accentPalette.length]

const createBannerBackground = (imageUrl: string, id: number) => {
  if (imageUrl) {
    return `linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.5)),url("${imageUrl}") center/cover no-repeat`
  }

  const accent = createAccent(id)
  return `linear-gradient(135deg,#0f172a 0%,${accent} 56%,#bfdbfe 100%)`
}

const extractGroupsFromResponse = (response: BackendCommunityResponse, fetch: CommunityListFetch) => {
  if (fetch === "groups") {
    return response.groups ?? []
  }

  return response.data ?? []
}

const extractPagesFromResponse = (response: BackendCommunityResponse, fetch: CommunityListFetch) => {
  if (fetch === "pages") {
    return response.pages ?? []
  }

  if (fetch === "liked_pages") {
    return response.liked_pages ?? []
  }

  return response.data ?? []
}

export const mapCommunityGroupRecord = (
  entity: BackendEntity,
  options: {
    segment?: CommunityGroupRecord["segment"]
    currentUserId?: number
    baseUrl?: string
  } = {},
): CommunityGroupRecord => {
  const id = firstNumber(entity, ["group_id", "id"])
  const slug = firstString(entity, ["group_name", "slug", "name"]) || `group-${id || "community"}`
  const name = firstString(entity, ["group_title", "title", "name", "group_name"]) || slug
  const members = firstNumber(entity, ["members", "members_count"])
  const postCount = firstNumber(entity, ["post_count", "posts_count"])
  const ownerId = firstNumber(entity, ["user_id"])
  const cover = firstString(entity, ["cover", "cover_full"])
  const avatar = firstString(entity, ["avatar", "avatar_full"])

  return {
    id,
    name,
    slug,
    summary: firstString(entity, ["about", "description"]),
    members,
    privacy: normalizeGroupPrivacy(entity.privacy),
    category: normalizeGroupCategory(entity.category),
    banner: createBannerBackground(normalizeImagePath(cover, options.baseUrl || ""), id),
    accent: createAccent(id),
    segment: options.segment ?? "suggested",
    activityLabel: postCount > 0 ? `${postCount}` : "",
    ownerLabel: firstString(entity, ["category_name", "username", "owner_name"]),
    tags: toUniqueList([
      firstString(entity, ["category_name"]),
      normalizeGroupCategory(entity.category) !== "auto" ? normalizeGroupCategory(entity.category) : "",
    ]),
    website: normalizeUrl(firstString(entity, ["website"])),
    locationLabel: firstString(entity, ["address", "location"]),
    lat: firstNullableNumber(entity, ["lat", "page_lat"]),
    lng: firstNullableNumber(entity, ["lng", "page_lng"]),
    placeId: firstString(entity, ["place_id", "page_place_id"]),
    foundedLabel: firstString(entity, ["registered", "time_text"]),
    canManage: isTruthy(entity.is_owner) || (ownerId > 0 && ownerId === options.currentUserId),
    guidelines: [],
    joined: isTruthy(entity.is_joined) || Number(entity.is_group_joined) === 1,
    requested: Number(entity.is_group_joined) === 2,
    joinApproval: String(entity.join_privacy) === "2",
    postApproval: isTruthy(entity.post_privacy),
    allowMemberInvites: isTruthy(entity.allow_member_invites),
    showMemberDirectory: isTruthy(entity.show_member_directory),
    welcomePostEnabled: isTruthy(entity.welcome_post_enabled),
    bannerUrl: normalizeImagePath(cover, options.baseUrl || ""),
    avatar: normalizeImagePath(avatar, options.baseUrl || ""),
  }
}

export const mapCommunityPageRecord = (
  entity: BackendEntity,
  options: {
    currentUserId?: number
    baseUrl?: string
  } = {},
): CommunityPageRecord => {
  const id = firstNumber(entity, ["page_id", "id"])
  const slug = firstString(entity, ["page_name", "slug", "name"]) || `page-${id || "community"}`
  const name = firstString(entity, ["page_title", "title", "name", "page_name"]) || slug
  const ownerId = firstNumber(entity, ["user_id"])
  const cover = firstString(entity, ["cover", "cover_full", "avatar", "avatar_full"])
  const avatar = firstString(entity, ["avatar", "avatar_full"])

  const record: CommunityPageRecord = {
    id,
    name,
    slug,
    summary: firstString(entity, ["page_description", "about", "description"]),
    category: normalizePageCategory(entity.page_category || entity.category),
    banner: createBannerBackground(normalizeImagePath(cover, options.baseUrl || ""), id),
    avatarUrl: normalizeImagePath(avatar, options.baseUrl || ""),
    accent: createAccent(id),
    followers: firstNumber(entity, ["followers", "followers_count", "likes_count", "likes"]),
    likes: firstNumber(entity, ["likes", "likes_count"]),
    ownerLabel: firstString(entity, ["category_name", "company"]),
    responseLabel: firstString(entity, ["call_action_type_url", "call_action_type_text", "phone", "website"]),
    website: normalizeUrl(firstString(entity, ["website"])),
    locationLabel: firstString(entity, ["address", "location"]),
    lat: firstNullableNumber(entity, ["lat", "page_lat"]),
    lng: firstNullableNumber(entity, ["lng", "page_lng"]),
    placeId: firstString(entity, ["place_id", "page_place_id"]),
    foundedLabel: firstString(entity, ["registered", "time_text"]),
    ctaLabel: mapCtaIdToLabel(entity.call_action_type) || firstString(entity, ["call_action_type_text"]),
    canManage: isTruthy(entity.is_owner) || (ownerId > 0 && ownerId === options.currentUserId),
    tags: toUniqueList([
      firstString(entity, ["category_name"]),
      normalizePageCategory(entity.page_category || entity.category),
    ]),
    following: isTruthy(entity.is_liked),
  }

  return record
}

export async function fetchCommunityGroups(
  event: H3Event,
  fetch: Extract<CommunityListFetch, "my_groups" | "joined_groups" | "groups">,
) {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendCommunityResponse, Record<string, unknown>>(
      "get-community",
      {
        user_id: currentUser.user_id,
        fetch,
        [`${fetch}_limit`]: 40,
      },
    ),
    "Unable to load groups.",
  )

  return extractGroupsFromResponse(response, fetch).map(entity =>
    mapCommunityGroupRecord(entity, {
      segment: fetch === "joined_groups" ? "joined" : "suggested",
      currentUserId: asNumber(currentUser.user_id),
      baseUrl,
    }),
  )
}

export async function fetchSuggestedCommunityGroups(event: H3Event) {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendRecommendedResponse, Record<string, unknown>>(
      "fetch-recommended",
      {
        type: "groups",
        limit: 40,
      },
    ),
    "Unable to load suggested groups.",
  )

  return (response.data ?? []).map(entity =>
    mapCommunityGroupRecord(entity, {
      segment: "suggested",
      currentUserId: asNumber(currentUser.user_id),
      baseUrl,
    }),
  )
}

export async function fetchCommunityPages(
  event: H3Event,
  fetch: Extract<CommunityListFetch, "pages" | "liked_pages">,
) {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendCommunityResponse, Record<string, unknown>>(
      "get-community",
      {
        user_id: currentUser.user_id,
        fetch,
        [`${fetch}_limit`]: 40,
      },
    ),
    "Unable to load pages.",
  )

  return extractPagesFromResponse(response, fetch).map(entity =>
    mapCommunityPageRecord(entity, {
      currentUserId: asNumber(currentUser.user_id),
      baseUrl,
    }),
  )
}

export async function fetchSuggestedCommunityPages(event: H3Event) {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendRecommendedResponse, Record<string, unknown>>(
      "fetch-recommended",
      {
        type: "pages",
        limit: 40,
      },
    ),
    "Unable to load suggested pages.",
  )

  return (response.data ?? []).map(entity =>
    mapCommunityPageRecord(entity, {
      currentUserId: asNumber(currentUser.user_id),
      baseUrl,
    }),
  )
}

export async function resolveGroupRecordBySlug(event: H3Event, slug: string) {
  const normalizedSlug = slug.trim().toLowerCase()

  if (!normalizedSlug) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found.",
    })
  }

  for (const mode of ["my_groups", "joined_groups", "groups"] as const) {
    const groups = await fetchCommunityGroups(event, mode)
    const match = groups.find(group => group.slug.toLowerCase() === normalizedSlug)

    if (match) {
      return match
    }
  }

  const client = createBackendApiClient(event)
  const searchResponse = assertBackendApiSuccess(
    await client.post<BackendSearchResponse, Record<string, unknown>>(
      "search",
      {
        search_key: normalizedSlug,
        limit: 10,
      },
    ),
    "Unable to resolve group.",
  )

  const searchMatch = (searchResponse.groups ?? []).find((entity) => {
    const entitySlug = firstString(entity, ["group_name", "slug", "name"]).toLowerCase()
    return entitySlug === normalizedSlug
  })

  if (!searchMatch) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found.",
    })
  }

  const currentUser = await getBackendCurrentUser(event)
  const groupId = firstNumber(searchMatch, ["group_id", "id"])
  const detailResponse = assertBackendApiSuccess(
    await client.post<BackendGroupDetailResponse, Record<string, unknown>>(
      "get-group-data",
      {
        group_id: groupId,
      },
    ),
    "Unable to load group details.",
  )

  if (!detailResponse.group_data) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found.",
    })
  }

  const baseUrl = getBackendWebBaseUrl(event)

  return mapCommunityGroupRecord(detailResponse.group_data, {
    currentUserId: asNumber(currentUser.user_id),
    baseUrl,
  })
}

export async function resolvePageRecordBySlug(event: H3Event, slug: string) {
  const normalizedSlug = slug.trim().toLowerCase()

  if (!normalizedSlug) {
    throw createError({
      statusCode: 404,
      statusMessage: "Page not found.",
    })
  }

  const currentUser = await getBackendCurrentUser(event).catch((err) => {
    console.warn("[resolvePageRecordBySlug] getBackendCurrentUser failed:", err?.statusMessage)
    return null
  })
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)

  console.log(`[resolvePageRecordBySlug] slug="${normalizedSlug}" userId=${currentUser?.user_id ?? "guest"}`)

  // Step 1: Direct lookup by page_name
  try {
    const rawDirect = await client.post<BackendPageDetailResponse, Record<string, unknown>>(
      "get-page-data",
      { page_name: normalizedSlug },
    )
    console.log("[resolvePageRecordBySlug] Direct lookup raw response:", JSON.stringify(rawDirect).slice(0, 300))

    const directResponse = assertBackendApiSuccess(rawDirect, "Unable to load page details.")

    if (directResponse.page_data) {
      console.log("[resolvePageRecordBySlug] Direct lookup success, page_id:", directResponse.page_data.page_id)
      return mapCommunityPageRecord(directResponse.page_data, {
        currentUserId: asNumber(currentUser?.user_id),
        baseUrl,
      })
    }
  }
  catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: unknown }
    console.warn("[resolvePageRecordBySlug] Direct lookup failed:", e?.statusMessage, JSON.stringify(e?.data ?? "").slice(0, 200))
  }

  // Step 2: Search fallback
  console.log("[resolvePageRecordBySlug] Falling back to search for:", normalizedSlug)
  let searchResponse: BackendSearchResponse
  try {
    searchResponse = assertBackendApiSuccess(
      await client.post<BackendSearchResponse, Record<string, unknown>>(
        "search",
        { search_key: normalizedSlug, limit: 20 },
      ),
      "Unable to resolve page.",
    )
    console.log("[resolvePageRecordBySlug] Search returned pages:", (searchResponse.pages ?? []).length)
  }
  catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: unknown }
    console.error("[resolvePageRecordBySlug] Search also failed:", e?.statusMessage, JSON.stringify(e?.data ?? "").slice(0, 200))
    throw createError({
      statusCode: 404,
      statusMessage: "Page not found.",
    })
  }

  const searchMatch = (searchResponse.pages ?? []).find((entity) => {
    const entitySlug = firstString(entity, ["page_name", "slug", "name"]).toLowerCase()
    console.log("[resolvePageRecordBySlug] Search candidate slug:", entitySlug)
    return entitySlug === normalizedSlug
  })

  if (!searchMatch) {
    console.error("[resolvePageRecordBySlug] No search match for slug:", normalizedSlug)
    throw createError({
      statusCode: 404,
      statusMessage: "Page not found.",
    })
  }

  const pageId = firstNumber(searchMatch, ["page_id", "id"])
  console.log("[resolvePageRecordBySlug] Found via search, page_id:", pageId, "keys:", Object.keys(searchMatch).join(","))

  try {
    const rawDetail = await client.post<BackendPageDetailResponse, Record<string, unknown>>(
      "get-page-data",
      { page_id: pageId },
    )

    const detailResponse = assertBackendApiSuccess(rawDetail, "Unable to load page details.")

    if (detailResponse.page_data) {
      return mapCommunityPageRecord(detailResponse.page_data, {
        currentUserId: asNumber(currentUser?.user_id),
        baseUrl,
      })
    }
  }
  catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: unknown }
    console.warn("[resolvePageRecordBySlug] get-page-data failed, using search entity:", e?.statusMessage, JSON.stringify(e?.data ?? "").slice(0, 200))
  }

  return mapCommunityPageRecord(searchMatch, {
    currentUserId: asNumber(currentUser?.user_id),
    baseUrl,
  })
}
