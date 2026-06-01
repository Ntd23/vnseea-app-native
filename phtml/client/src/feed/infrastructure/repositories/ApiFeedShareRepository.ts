// English description: Implements feed share destination lookups against Nuxt API routes.

import { apiRoutes, appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type {
  CommunityGroupRecord,
  CommunityPageRecord,
} from "../../../community/domain/types/community.types"
import type {
  SearchResultItem,
  SearchResultsByType,
} from "../../../search/domain/types/search.types"
import type { FeedShareRepository } from "../../domain/repositories/FeedShareRepository"
import type {
  FeedShareDestination,
  FeedShareSearchTargets,
  FeedShareTarget,
} from "../../domain/types/feed-share.types"

const createInitials = (value: string, fallback = "VN") => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.slice(0, 1).toUpperCase())
    .join("")

  return initials || fallback
}

const createSearchableText = (parts: Array<string | number | undefined>) =>
  parts
    .map(part => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

const parseEntityId = (value: string | number | undefined) => {
  const rawValue = String(value ?? "")
  const match = rawValue.match(/(\d+)$/)
  const id = match ? Number(match[1]) : Number(rawValue)

  return Number.isFinite(id) && id > 0 ? id : undefined
}

const uniqueTargets = (targets: FeedShareTarget[]) => {
  const seen = new Set<string>()

  return targets.filter((target) => {
    const key = `${target.kind}:${target.id}`
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

const mapPageTarget = (page: CommunityPageRecord): FeedShareTarget => ({
  id: String(page.id),
  kind: "page",
  title: page.name,
  subtitle: page.ownerLabel || page.category || `/p/${page.slug}`,
  avatarUrl: page.avatarUrl,
  initials: createInitials(page.name, "P"),
  href: page.slug ? appRoutes.pageDetail(page.slug) : undefined,
  searchableText: createSearchableText([page.name, page.slug, page.category, page.ownerLabel]),
  entityId: page.id,
})

const mapGroupTarget = (group: CommunityGroupRecord): FeedShareTarget => ({
  id: String(group.id),
  kind: "group",
  title: group.name,
  subtitle: group.activityLabel || group.category || `/g/${group.slug}`,
  avatarUrl: group.avatar,
  initials: createInitials(group.name, "G"),
  href: group.slug ? appRoutes.groupDetail(group.slug) : undefined,
  searchableText: createSearchableText([group.name, group.slug, group.category, group.activityLabel]),
  entityId: group.id,
})

const mapSearchTarget = (
  result: SearchResultItem,
  kind: Exclude<FeedShareDestination, "timeline">,
): FeedShareTarget => ({
  id: result.id,
  kind,
  title: result.title,
  subtitle: result.subtitle,
  avatarUrl: result.avatarUrl,
  initials: result.initials || createInitials(result.title),
  href: result.href,
  searchableText: result.searchableText || createSearchableText([result.title, result.subtitle]),
  entityId: parseEntityId(result.id),
})

const emptySearchTargets = (): FeedShareSearchTargets => ({
  users: [],
  pages: [],
  groups: [],
})

export function createApiFeedShareRepository(): FeedShareRepository {
  const client = useNuxtApiClient()

  return {
    async getPageTargets() {
      const pages = await client.get<CommunityPageRecord[]>(apiRoutes.community.pages, { mode: "mine" })

      return pages.map(mapPageTarget)
    },
    async getGroupTargets() {
      const [mine, joined] = await Promise.all([
        client.get<CommunityGroupRecord[]>(apiRoutes.community.groups, { mode: "mine" }),
        client.get<CommunityGroupRecord[]>(apiRoutes.community.groups, { mode: "joined" }),
      ])

      return uniqueTargets([...mine, ...joined].map(mapGroupTarget))
    },
    async searchTargets(keyword, limit = 12) {
      const trimmedKeyword = keyword.trim()
      if (!trimmedKeyword) return emptySearchTargets()

      const response = await client.get<SearchResultsByType>(apiRoutes.search.index, {
        q: trimmedKeyword,
        limit,
      })

      return {
        users: response.users.map(result => mapSearchTarget(result, "message")),
        pages: response.pages.map(result => mapSearchTarget(result, "page")),
        groups: response.groups.map(result => mapSearchTarget(result, "group")),
      }
    },
    async sendMessageShare(input) {
      await client.post(apiRoutes.messages.multi, {
        recipientIds: input.recipientIds,
        text: input.text,
      })
    },
  }
}
