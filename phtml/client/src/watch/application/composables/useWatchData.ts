// English description: Defines watch-page types and maps normalized feed posts into the watch player and related-list view models.

import { resolveI18nMessage } from "#shared-kernel/application/utils/resolveI18nMessage"
import type { FeedCommentRecord, FeedPostRecord } from "../../../feed/domain/types/feed.types"

export type WatchCategoryKey = "all" | "community" | "education" | "business" | "events" | "technology"

export type WatchComment = {
  id: number
  author: string
  initials: string
  role: string
  message: string
  time: string
}

export type WatchVideo = {
  id: string
  postId: number
  title: string
  category: Exclude<WatchCategoryKey, "all">
  categoryLabel: string
  author: string
  authorInitials: string
  authorGradient: string
  authorPath: string
  date: string
  duration: string
  views: number
  likes: number
  shares: number
  cover: string
  description: string
  tags: string[]
  comments: WatchComment[]
}

type WatchCategoryOption = {
  label: string
  value: WatchCategoryKey
  icon: string
}

const gradientPalette = [
  "linear-gradient(135deg,#2563eb 0%,#60a5fa 100%)",
  "linear-gradient(135deg,#0369a1 0%,#38bdf8 100%)",
  "linear-gradient(135deg,#0f766e 0%,#2dd4bf 100%)",
  "linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)",
] as const

const createInitials = (value: string, fallback = "VN") => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("")

  return initials || fallback
}

const normalizeWatchCategory = (value: string): Exclude<WatchCategoryKey, "all"> => {
  if (value === "education" || value === "business" || value === "events" || value === "technology") {
    return value
  }

  return "community"
}

const mapWatchComment = (comment: FeedCommentRecord, time: string): WatchComment => ({
  id: comment.id,
  author: comment.author,
  initials: createInitials(comment.author, "US"),
  role: comment.role,
  message: comment.text,
  time,
})

export function useWatchCategories() {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  return computed<WatchCategoryOption[]>(() => {
    const value = localized<unknown>("pages.watchPage.categories")

    return Array.isArray(value)
      ? value
        .filter((item): item is WatchCategoryOption =>
          !!item
          && typeof item === "object"
          && typeof (item as WatchCategoryOption).label === "string"
          && typeof (item as WatchCategoryOption).value === "string"
          && typeof (item as WatchCategoryOption).icon === "string",
        )
      : []
  })
}

export function mapFeedPostsToWatchVideos(
  posts: FeedPostRecord[],
  categories: ReadonlyArray<WatchCategoryOption>,
): WatchVideo[] {
  const categoryLabelMap = Object.fromEntries(
    categories.map(category => [category.value, category.label]),
  ) as Record<WatchCategoryKey, string>

  return posts
    .filter(post => post.primaryMediaType === "video" || post.mediaItems.length > 0)
    .map((post, index) => {
      const category = normalizeWatchCategory(post.category)
      const cover = post.mediaItems[0]?.thumb || post.mediaItems[0]?.src || post.authorAvatarUrl
      const title = post.text || post.author

      return {
        id: `watch-${post.id}`,
        postId: post.id,
        title: title.length > 96 ? `${title.slice(0, 93)}...` : title,
        category,
        categoryLabel: categoryLabelMap[category],
        author: post.author,
        authorInitials: createInitials(post.author),
        authorGradient: gradientPalette[index % gradientPalette.length],
        authorPath: post.authorPath,
        date: post.time,
        duration: "",
        views: post.stats.views,
        likes: post.stats.likes,
        shares: post.stats.shares,
        cover,
        description: post.text,
        tags: post.tags.map(tag => `#${tag}`),
        comments: post.comments.map(comment => mapWatchComment(comment, post.time)),
      }
    })
}

export const formatWatchNumber = (value: number, locale = "vi-VN") =>
  new Intl.NumberFormat(locale, { notation: value >= 10000 ? "compact" : "standard" }).format(value)
