// English description: Types for compact mixed search suggestions rendered inside the global header search box.

export type HeaderSearchSuggestionKind = "user" | "page" | "group" | "hashtag"

export interface HeaderSearchSuggestion {
  id: string
  kind: HeaderSearchSuggestionKind
  title: string
  subtitle: string
  href: string
  avatarUrl?: string
  initials: string
  badge?: string
  accent: string
}
