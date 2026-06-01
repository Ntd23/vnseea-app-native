// English description: Domain types for public entity SEO metadata rendered by Nuxt routes.

export type PublicSeoRouteType = "profile" | "page" | "group" | "post" | "blog"

export type PublicSeoOgType = "profile" | "website" | "article"

export interface PublicSeoQuery {
  routeType: PublicSeoRouteType
  identifier: string
}

export interface PublicSeoMeta {
  title: string
  description?: string
  canonicalUrl: string
  imageUrl?: string
  type: PublicSeoOgType
  robots: "index, follow" | "noindex, nofollow"
  publishedTime?: string
  modifiedTime?: string
  authorName?: string
  keywords?: string[]
}
