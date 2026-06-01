// English description: Provides normalized hashtag helpers used by feed, explore, popular, and photos pages after removing mock data sources.

import { createCommunitySlug } from "../../../community/domain/services/community-helpers.service"

export function normalizeHashtagValue(value: string) {
  return createCommunitySlug(
    String(value || "")
      .replace(/^#/, "")
      .trim(),
  )
}

export function formatHashtagLabel(value: string) {
  const trimmed = String(value || "").replace(/^#/, "").trim()
  return trimmed ? `#${trimmed}` : "#hashtag"
}

export function createHashtagPath(value: string) {
  const slug = normalizeHashtagValue(value)
  return slug ? `/hashtag/${slug}` : "/explore"
}
