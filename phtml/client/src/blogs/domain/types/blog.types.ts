// English description: Shared blog domain types used by blog view-models and presentation components.

export type BlogCategory =
  | "all"
  | "vehicles"
  | "business"
  | "education"
  | "movies"
  | "gaming"
  | "history"
  | "lifestyle"
  | "pets"
  | "science"
  | "sports"
  | "travel"
  | "people"
  | "other"

export type BlogSortValue = "latest" | "popular" | "views" | "reading"

export type BlogListArticle = {
  id: number
  slug: string
  title: string
  excerpt: string
  category: Exclude<BlogCategory, "all">
  categoryLabel: string
  author: string
  authorAvatarUrl: string
  authorPath?: string
  publishedAt: string
  publishedHoursAgo: number
  views: number
  readMinutes: number
  likes: number
  tags: string[]
  image: string
  imageFallback: string
  href: string
  mine?: boolean
}

export type BlogReadArticle = Omit<BlogListArticle, "href"> & {
  body: string[]
  href?: string
}

export type BlogSubmitStatus = "draft" | "publish"

export type BlogCreateDraft = {
  title: string
  content: string
  description: string
  category: Exclude<BlogCategory, "all">
  tags: string[]
  status: BlogSubmitStatus
  thumbnailFile?: File | null
}

export type BlogCreateResult = {
  id: number
  status: "draft" | "published" | "pending"
  url: string
}

export type BlogListQuery = {
  limit?: number
  offset?: number
  category?: BlogCategory
  mineOnly?: boolean
}
