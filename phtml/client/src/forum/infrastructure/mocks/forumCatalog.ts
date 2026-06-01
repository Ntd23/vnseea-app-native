// English description: Legacy forum helpers kept for older imports while runtime forum data comes from the backend repository.

import type { ForumSectionKey } from "../../domain/types/forum.types"

export const forumSectionKeys = [
  "all",
  "announcements",
  "support",
  "marketplace",
  "events",
  "jobs",
  "showcase",
] as const satisfies readonly ForumSectionKey[]

export function readForumQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

export function normalizeForumSection(value: string): ForumSectionKey {
  return forumSectionKeys.includes(value as ForumSectionKey)
    ? value as ForumSectionKey
    : "all"
}

export const formatForumNumber = (value: number, locale = "vi") =>
  new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value)
