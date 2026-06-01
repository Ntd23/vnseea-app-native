// Description: Provides shared community path, formatting, and option helper functions.

import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { communityCategoryOptions, communityPageCategoryOptions } from "../constants/community-options"
import type {
  CommunityDraft,
  CommunityOption,
} from "../types/community.types"

export function getCommunityCompletionCount(
  draft: CommunityDraft,
  options?: { includePrivacy?: boolean },
) {
  const includePrivacy = options?.includePrivacy ?? true

  return [
    (draft.name || "").trim(),
    (draft.slug || "").trim(),
    (draft.description || "").trim(),
    includePrivacy ? draft.privacy : "skip",
    draft.category,
  ].filter(Boolean).length
}

export function getCommunityCompletionTotal(includePrivacy = true) {
  return includePrivacy ? 5 : 4
}

export function getCommunityOptionLabel(
  options: CommunityOption[],
  value: string,
  fallback = "",
) {
  return options.find(option => option.value === value)?.label ?? fallback
}

export function getCommunityOptionDescription(
  options: CommunityOption[],
  value: string,
  fallback = "",
) {
  return options.find(option => option.value === value)?.description ?? fallback
}

export function getCommunityInitials(name: string, limit = 2) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, limit)
    .map(part => part[0])
    .join("")
    .toUpperCase()
}

export function formatCommunityMemberCount(count: number) {
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}K`
}

export function formatCommunityFollowerCount(count: number) {
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}K`
}

export function formatCommunityLikeCount(count: number) {
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}K`
}

export function getCommunityGroupPath(slug: string) {
  return appRoutes.groupDetail(slug)
}

export function getCommunityGroupSettingsPath(slug: string) {
  return appRoutes.groupSetting(slug)
}

export function getCommunityPagePath(slug: string) {
  return appRoutes.pageDetail(slug)
}

export function getCommunityPageSettingsPath(slug: string) {
  return appRoutes.pageSetting(slug)
}

export function appendCommunityQuery(path: string, query: Record<string, unknown>) {
  const search = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => search.append(key, String(item)))
      return
    }

    if (value !== undefined && value !== null && String(value).trim()) {
      search.append(key, String(value))
    }
  })

  const queryString = search.toString()

  return `${path}${queryString ? `?${queryString}` : ""}`
}

export function createCommunitySlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

export function getDefaultCommunityCategory() {
  return communityCategoryOptions[0]?.value ?? "auto"
}

export function getDefaultCommunityPageCategory() {
  return communityPageCategoryOptions[0]?.value ?? "local-business"
}
