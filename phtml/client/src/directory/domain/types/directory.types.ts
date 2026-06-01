// English description: Domain types for backend-backed directory destinations and legacy migration shapes.

export type DirectoryCategoryKey =
  | "all"
  | "users"
  | "pages"
  | "groups"
  | "market"
  | "events"
  | "jobs"
  | "blogs"
  | "funding"
  | "live"
  | "watch"
  | "games"
  | "forum"

export type DirectoryCategory = {
  label: string
  value: DirectoryCategoryKey
  icon: string
  description: string
}

export type DirectoryItem = {
  id: string
  title: string
  category: Exclude<DirectoryCategoryKey, "all">
  categoryLabel: string
  description: string
  meta: string
  count: string
  href: string
  accent: string
  tags: string[]
  featured: boolean
}

export type DirectoryDestination = {
  key: string
  label: string
  description: string
  href: string
  icon: string
}

export type DirectoryCatalog = {
  title: string
  description: string
  items: DirectoryDestination[]
}
