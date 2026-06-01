// English description: Shared normalized user summary used by cross-context social surfaces.

export interface UserRecord {
  id: number
  username: string
  name: string
  avatarUrl?: string
  verified?: boolean
  isFriend?: boolean
  isRequested?: boolean
}
