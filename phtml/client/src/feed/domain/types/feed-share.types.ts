// English description: Declares feed share destination target types used by the share modal flow.

export type FeedShareDestination = "timeline" | "page" | "group" | "message"

export interface FeedShareTarget {
  id: string
  kind: FeedShareDestination
  title: string
  subtitle: string
  avatarUrl?: string
  initials: string
  href?: string
  searchableText: string
  entityId?: number
}

export type FeedShareSearchTargets = {
  users: FeedShareTarget[]
  pages: FeedShareTarget[]
  groups: FeedShareTarget[]
}
