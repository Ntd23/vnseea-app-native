// English description: Defines popular-page types and maps normalized feed posts into ranked popular content cards and sidebar data.

import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { resolveI18nMessage } from "#shared-kernel/application/utils/resolveI18nMessage"
import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"

export type PopularCategoryKey =
  | "all"
  | "community"
  | "product"
  | "business"
  | "design"
  | "technology"

export type PopularCategory = {
  label: string
  value: PopularCategoryKey
  icon: string
}

export type PopularPost = FeedPostRecord & {
  category: Exclude<PopularCategoryKey, "all">
  trendLabel: string
}

export type PopularQuickLink = {
  title: string
  description: string
  to: string
  icon: string
  accent: string
}

const normalizePopularCategory = (value: string): Exclude<PopularCategoryKey, "all"> => {
  if (value === "product" || value === "business" || value === "design" || value === "technology") {
    return value
  }

  return "community"
}

export function usePopularCategories() {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  return computed<PopularCategory[]>(() => {
    const value = localized<unknown>("pages.popularPage.categories")

    return Array.isArray(value)
      ? value
        .filter((item): item is PopularCategory =>
          !!item
          && typeof item === "object"
          && typeof (item as PopularCategory).label === "string"
          && typeof (item as PopularCategory).value === "string"
          && typeof (item as PopularCategory).icon === "string",
        )
      : []
  })
}

export function usePopularQuickLinks() {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  return computed<PopularQuickLink[]>(() => {
    const value = localized<unknown>("pages.popularPage.quickLinks")

    return Array.isArray(value)
      ? value
        .filter((item): item is PopularQuickLink =>
          !!item
          && typeof item === "object"
          && typeof (item as PopularQuickLink).title === "string"
          && typeof (item as PopularQuickLink).description === "string"
          && typeof (item as PopularQuickLink).to === "string"
          && typeof (item as PopularQuickLink).icon === "string"
          && typeof (item as PopularQuickLink).accent === "string",
        )
        .map(item => ({
          ...item,
          to: item.to || appRoutes.explore,
        }))
      : []
  })
}

export function mapFeedPostsToPopularPosts(
  posts: FeedPostRecord[],
): PopularPost[] {
  return posts.map(post => ({
    ...post,
    category: normalizePopularCategory(post.category),
    trendLabel: post.time,
  }))
}

export const getPopularPostScore = (
  post: Pick<PopularPost, "stats">,
) => post.stats.likes + post.stats.comments * 2 + post.stats.shares * 3

export const formatPopularNumber = (value: number, locale = "vi-VN") =>
  new Intl.NumberFormat(locale, { notation: value >= 10000 ? "compact" : "standard" }).format(value)
