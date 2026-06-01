// English description: Shared normalization helpers for search list pages and compact header suggestions.

import { getQuery, type H3Event } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { appRoutes, backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"
import { normalizeHashtagValue } from "../../../src/feed/application/composables/useHashtagData"

type BackendSearchEntity = Record<string, unknown>

type BackendSearchResponse = {
  api_status?: number | string
  users?: BackendSearchEntity[]
  pages?: BackendSearchEntity[]
  groups?: BackendSearchEntity[]
  channels?: BackendSearchEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendGeneralDataResponse = {
  api_status?: number | string
  trending_hashtag?: unknown
  errors?: {
    error_text?: string
  }
}

export type SearchApiResultKind = "users" | "pages" | "groups" | "posts"

export type SearchApiResult = {
  id: string
  kind: SearchApiResultKind
  title: string
  username?: string
  firstName?: string
  avatarUrl?: string
  subtitle: string
  description: string
  href: string
  initials: string
  badge?: string
  metricLabel: string
  metaLabel?: string
  tags: string[]
  searchableText: string
  accent: string
  popularityScore: number
  recentScore: number
  isFollowing?: boolean
}

export type SearchApiResponse = Record<SearchApiResultKind, SearchApiResult[]>

export type HeaderSearchSuggestion = {
  id: string
  kind: "user" | "page" | "group" | "hashtag"
  title: string
  subtitle: string
  href: string
  avatarUrl?: string
  initials: string
  badge?: string
  accent: string
}

export const emptySearchResponse = (): SearchApiResponse => ({
  users: [],
  pages: [],
  groups: [],
  posts: [],
})

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const firstString = (entity: BackendSearchEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asString(entity[key])
    if (value) return value
  }
  return ""
}

const toInitials = (value: string, fallback = "U") => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("")

  return initials || fallback
}

const createSearchableText = (parts: string[]) =>
  parts.filter(Boolean).join(" ").toLowerCase()

const createProfileHref = (username: string, id: string) =>
  username ? appRoutes.profile(username) : `/@user-${encodeURIComponent(id)}`

const createPageHref = (slug: string, id: string) =>
  slug ? appRoutes.pageDetail(slug) : `/p/page-${encodeURIComponent(id)}`

const createGroupHref = (slug: string, id: string) =>
  slug ? appRoutes.groupDetail(slug) : `/g/group-${encodeURIComponent(id)}`

export function mapUsers(users: BackendSearchEntity[] = [], resolveMediaUrl: (value: unknown) => string): SearchApiResult[] {
  return users.map((user, index) => {
    const id = firstString(user, ["user_id", "id"]) || `user-${index + 1}`
    const firstName = firstString(user, ["first_name"])
    const lastName = firstString(user, ["last_name"])
    const name = firstString(user, ["name"]) || [firstName, lastName].filter(Boolean).join(" ") || firstString(user, ["username"]) || "User"
    const username = firstString(user, ["username"])
    const avatarUrl = resolveMediaUrl(firstString(user, ["avatar", "avatar_url"]))
    const about = firstString(user, ["about", "bio", "working", "address"])
    const followers = firstString(user, ["followers", "followers_count", "details.followers_count"])

    return {
      id: `user-${id}`,
      kind: "users",
      title: name,
      username,
      firstName,
      avatarUrl,
      subtitle: username ? `@${username}` : "Member",
      description: about || "Member profile",
      href: createProfileHref(username, id),
      initials: toInitials(name),
      badge: Number(user.verified ?? 0) === 1 ? "Verified" : undefined,
      metricLabel: followers ? `${followers} followers` : "Profile",
      metaLabel: firstString(user, ["lastseen_time_text", "gender_text"]),
      tags: ["user", username].filter(Boolean),
      searchableText: createSearchableText([firstName, lastName, name, username, about]),
      accent: "#0000ff",
      popularityScore: Number(followers || 0),
      recentScore: 100 - index,
      isFollowing: Number(user.is_following ?? 0) === 1 || user.is_following === "yes" || user.is_following === true || Number(user.is_friend ?? 0) === 1 || user.is_friend === "yes",
    }
  })
}

export function mapPages(pages: BackendSearchEntity[] = [], resolveMediaUrl: (value: unknown) => string): SearchApiResult[] {
  return pages.map((page, index) => {
    const id = firstString(page, ["page_id", "id"]) || `page-${index + 1}`
    const slug = firstString(page, ["page_name", "username", "name"])
    const title = firstString(page, ["page_title", "title", "name", "page_name"]) || "Page"
    const about = firstString(page, ["about", "description"])

    return {
      id: `page-${id}`,
      kind: "pages",
      title,
      avatarUrl: resolveMediaUrl(firstString(page, ["avatar", "page_avatar", "avatar_url"])),
      subtitle: slug ? `/p/${slug}` : "Page",
      description: about || "Community page",
      href: createPageHref(slug, id),
      initials: toInitials(title, "P"),
      badge: firstString(page, ["is_liked"]) === "yes" ? "Liked" : undefined,
      metricLabel: firstString(page, ["likes", "likes_count"]) || "Page",
      metaLabel: firstString(page, ["category", "category_name"]),
      tags: ["page", slug].filter(Boolean),
      searchableText: createSearchableText([title, slug, about]),
      accent: "#1d4ed8",
      popularityScore: Number(firstString(page, ["likes", "likes_count"]) || 0),
      recentScore: 90 - index,
    }
  })
}

export function mapGroups(groups: BackendSearchEntity[] = [], resolveMediaUrl: (value: unknown) => string): SearchApiResult[] {
  return groups.map((group, index) => {
    const id = firstString(group, ["group_id", "id"]) || `group-${index + 1}`
    const slug = firstString(group, ["group_name", "name"])
    const title = firstString(group, ["group_title", "title", "name", "group_name"]) || "Group"
    const about = firstString(group, ["about", "description"])

    return {
      id: `group-${id}`,
      kind: "groups",
      title,
      avatarUrl: resolveMediaUrl(firstString(group, ["avatar", "group_avatar", "avatar_url"])),
      subtitle: slug ? `/g/${slug}` : "Group",
      description: about || "Community group",
      href: createGroupHref(slug, id),
      initials: toInitials(title, "G"),
      badge: firstString(group, ["is_joined"]) === "yes" ? "Joined" : undefined,
      metricLabel: firstString(group, ["members", "members_count"]) || "Group",
      metaLabel: firstString(group, ["category", "category_name", "privacy"]),
      tags: ["group", slug].filter(Boolean),
      searchableText: createSearchableText([title, slug, about]),
      accent: "#0369a1",
      popularityScore: Number(firstString(group, ["members", "members_count"]) || 0),
      recentScore: 80 - index,
    }
  })
}

function normalizeTrendingHashtags(value: unknown) {
  return asArray(value)
    .map((item) => {
      const entity = item && typeof item === "object" ? item as BackendSearchEntity : {}
      const label = firstString(entity, ["tag", "hashtag", "name", "title"]).replace(/^#/, "")
      const slug = normalizeHashtagValue(label)
      const count = asNumber(entity.trend_use_num || entity.count || entity.posts || entity.views)

      if (!slug) {
        return null
      }

      return {
        id: `hashtag-${slug}`,
        kind: "hashtag" as const,
        title: `#${label || slug}`,
        subtitle: count > 0 ? `${count} posts` : "Hashtag",
        href: appRoutes.hashtag(slug),
        initials: "#",
        accent: "#7c3aed",
      }
    })
    .filter(Boolean) as HeaderSearchSuggestion[]
}

export async function fetchBackendSearch(event: H3Event) {
  const query = getQuery(event)
  const keyword = asString(query.q || query.keyword)
  const filterByAge = asString(query.filterbyage) === "yes" ? "yes" : "no"
  const limit = Number(query.limit || 35)

  const payload: Record<string, unknown> = {
    search_key: keyword,
    limit,
  }

  const country = asString(query.country)
  const gender = asString(query.gender)
  const verified = asString(query.verified)
  const status = asString(query.status)
  const image = asString(query.image)
  const ageFrom = asString(query.age_from)
  const ageTo = asString(query.age_to)

  if (country) payload.country = country
  if (gender) payload.gender = gender
  if (verified) payload.verified = verified
  if (status) payload.status = status
  if (image) payload.image = image
  payload.filterbyage = filterByAge

  if (filterByAge === "yes") {
    if (ageFrom) payload.age_from = ageFrom
    if (ageTo) payload.age_to = ageTo
  }

  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendSearchResponse, Record<string, unknown>>(
      backendRoutes.api.search,
      payload,
    ),
    "Unable to search.",
  )

  return {
    keyword,
    resolveMediaUrl,
    users: mapUsers(response.users, resolveMediaUrl),
    pages: mapPages(response.pages, resolveMediaUrl),
    groups: mapGroups(response.groups, resolveMediaUrl),
  }
}

export async function fetchTrendingHashtagSuggestions(event: H3Event) {
  const client = createBackendApiClient(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendGeneralDataResponse, Record<string, unknown>>(
      "get-general-data",
      {
        fetch: "trending_hashtag",
      },
    ),
    "Unable to load hashtags.",
  )

  return normalizeTrendingHashtags(response.trending_hashtag)
}
