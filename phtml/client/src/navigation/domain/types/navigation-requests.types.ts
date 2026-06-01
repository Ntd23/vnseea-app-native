// English description: Types for header friend and group chat request dropdown data.

export type HeaderRequestKind = "friend" | "group_chat"
export type HeaderRequestAction = "accept" | "decline"

export type HeaderRequestItem = {
  id: string
  kind: HeaderRequestKind
  title: string
  subtitle: string
  avatarUrl: string
  url: string
}

export type HeaderRequestsSummary = {
  items: HeaderRequestItem[]
  friendRequestCount: number
  groupChatRequestCount: number
}
