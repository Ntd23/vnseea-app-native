// English description: Returns compact mixed search suggestions for the header search box across users, pages, groups, and hashtags.

import { getQuery } from "h3"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"
import { normalizeHashtagValue } from "../../../src/feed/application/composables/useHashtagData"
import type { HeaderSearchSuggestion } from "./_shared"
import { fetchBackendSearch, fetchTrendingHashtagSuggestions } from "./_shared"

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}

export default defineEventHandler(async (event): Promise<{ items: HeaderSearchSuggestion[] }> => {
  const query = getQuery(event)
  const keyword = asString(query.q || query.keyword)
  const limit = Math.min(Math.max(Number(query.limit || 8) || 8, 1), 12)

  if (!keyword) {
    return { items: [] }
  }

  const [searchResponse, hashtagSuggestions] = await Promise.all([
    fetchBackendSearch(event),
    fetchTrendingHashtagSuggestions(event).catch(() => []),
  ])

  const normalizedKeyword = keyword.replace(/^#/, "").toLowerCase()
  const mixed: HeaderSearchSuggestion[] = [
    ...searchResponse.users.slice(0, 3).map(item => ({
      id: item.id,
      kind: "user" as const,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      avatarUrl: item.avatarUrl,
      initials: item.initials,
      badge: item.badge,
      accent: item.accent,
    })),
    ...searchResponse.pages.slice(0, 2).map(item => ({
      id: item.id,
      kind: "page" as const,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      avatarUrl: item.avatarUrl,
      initials: item.initials,
      badge: item.badge,
      accent: item.accent,
    })),
    ...searchResponse.groups.slice(0, 2).map(item => ({
      id: item.id,
      kind: "group" as const,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      avatarUrl: item.avatarUrl,
      initials: item.initials,
      badge: item.badge,
      accent: item.accent,
    })),
  ]

  const normalizedTypedHashtag = normalizeHashtagValue(keyword)
  if (normalizedTypedHashtag) {
    mixed.unshift({
      id: `typed-hashtag-${normalizedTypedHashtag}`,
      kind: "hashtag",
      title: `#${normalizedTypedHashtag}`,
      subtitle: "Hashtag",
      href: appRoutes.hashtag(normalizedTypedHashtag),
      initials: "#",
      accent: "#7c3aed",
    })
  }

  const filteredHashtags = hashtagSuggestions.filter((item) => {
    const title = item.title.replace(/^#/, "").toLowerCase()
    return title.includes(normalizedKeyword)
  })

  return {
    items: uniqueById([
      ...mixed,
      ...filteredHashtags,
    ]).slice(0, limit),
  }
})
