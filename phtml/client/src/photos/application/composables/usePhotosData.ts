// English description: Defines photo-gallery types and maps normalized feed posts into media-first photo cards, albums, and sidebar items.

import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { resolveI18nMessage } from "#shared-kernel/application/utils/resolveI18nMessage"
import type { FeedCommentRecord, FeedPostRecord } from "../../../feed/domain/types/feed.types"

export type PhotoCategoryKey =
  | "all"
  | "community"
  | "events"
  | "portraits"
  | "product"
  | "education"

export type PhotoCategory = {
  label: string
  value: PhotoCategoryKey
  icon: string
}

export type PhotoRecord = {
  id: string
  postId: number
  title: string
  category: Exclude<PhotoCategoryKey, "all">
  albumTitle: string
  photographer: string
  authorAvatarUrl: string
  authorPath: string
  photographerRole: string
  location: string
  timeLabel: string
  likes: number
  comments: number
  commentItems: FeedCommentRecord[]
  image: string
  accent: string
  tags: string[]
  frame: "portrait" | "landscape" | "square" | "tall"
  companionTo: string
}

export type PhotoAlbum = {
  title: string
  description: string
  cover: string
  count: number
  badge: string
  to: string
  accent: string
}

export type PhotoQuickLink = {
  title: string
  description: string
  to: string
  icon: string
  accent: string
}

const accentPalette = [
  "linear-gradient(135deg,#2563eb 0%,#60a5fa 100%)",
  "linear-gradient(135deg,#0369a1 0%,#38bdf8 100%)",
  "linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)",
  "linear-gradient(135deg,#ea580c 0%,#fb923c 100%)",
] as const

const normalizePhotoCategory = (value: string): Exclude<PhotoCategoryKey, "all"> => {
  if (value === "events" || value === "portraits" || value === "product" || value === "education") {
    return value
  }

  return "community"
}

export function usePhotoCategories() {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  return computed<PhotoCategory[]>(() => {
    const value = localized<unknown>("pages.photosPage.categories")

    return Array.isArray(value)
      ? value
        .filter((item): item is PhotoCategory =>
          !!item
          && typeof item === "object"
          && typeof (item as PhotoCategory).label === "string"
          && typeof (item as PhotoCategory).value === "string"
          && typeof (item as PhotoCategory).icon === "string",
        )
      : []
  })
}

export function usePhotoQuickLinks() {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  return computed<PhotoQuickLink[]>(() => {
    const value = localized<unknown>("pages.photosPage.quickLinks")

    return Array.isArray(value)
      ? value
        .filter((item): item is PhotoQuickLink =>
          !!item
          && typeof item === "object"
          && typeof (item as PhotoQuickLink).title === "string"
          && typeof (item as PhotoQuickLink).description === "string"
          && typeof (item as PhotoQuickLink).to === "string"
          && typeof (item as PhotoQuickLink).icon === "string"
          && typeof (item as PhotoQuickLink).accent === "string",
        )
        .map(item => ({
          ...item,
          to: item.to || appRoutes.explore,
        }))
      : []
  })
}

export function mapFeedPostsToPhotos(posts: FeedPostRecord[]): PhotoRecord[] {
  return posts
    .flatMap((post, index) =>
      post.mediaItems
        .filter(item => item.type === "image")
        .map((item, mediaIndex) => ({
          id: `photo-${post.id}-${mediaIndex}`,
          postId: post.id,
          title: post.text || post.author,
          category: normalizePhotoCategory(post.category),
          albumTitle: post.sourceLabel === "page" ? "Page" : post.sourceLabel === "group" ? "Group" : "Feed",
          photographer: post.author,
          authorAvatarUrl: post.authorAvatarUrl,
          authorPath: post.authorPath,
          photographerRole: post.role,
          location: post.role,
          timeLabel: post.time,
          likes: post.stats.likes,
          comments: post.stats.comments,
          commentItems: post.comments,
          image: item.src,
          accent: accentPalette[(index + mediaIndex) % accentPalette.length],
          tags: post.tags,
          frame: mediaIndex % 3 === 0 ? "landscape" : mediaIndex % 3 === 1 ? "portrait" : "square",
          companionTo: post.sourcePath,
        })),
    )
}

export function buildPhotoAlbums(
  photos: PhotoRecord[],
  categories: ReadonlyArray<PhotoCategory>,
): PhotoAlbum[] {
  return categories
    .filter(category => category.value !== "all")
    .map((category, index) => {
      const items = photos.filter(photo => photo.category === category.value)

      return {
        title: category.label,
        description: category.label,
        cover: items[0]?.image || "",
        count: items.length,
        badge: category.label,
        to: `${appRoutes.photos}?category=${category.value}`,
        accent: accentPalette[index % accentPalette.length],
      }
    })
    .filter(album => album.count > 0)
}

export const getPhotoEngagement = (
  photo: Pick<PhotoRecord, "likes" | "comments">,
) => photo.likes + photo.comments * 2

export const formatPhotoNumber = (value: number, locale = "vi-VN") =>
  new Intl.NumberFormat(locale, { notation: value >= 10000 ? "compact" : "standard" }).format(value)
