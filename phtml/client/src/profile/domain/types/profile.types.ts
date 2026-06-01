// English description: Profile context types returned from the backend-backed profile repository.

import type { CommunityGroupRecord, CommunityPageRecord } from "../../../community/domain/types/community.types"
import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"

export type ProfileTabKey = "timeline" | "about" | "friends" | "photos" | "videos" | "albums"

export interface ProfileConnection {
  id: number
  name: string
  username: string
  initials: string
  meta: string
  avatarUrl?: string
}

export interface ProfileAlbumRecord {
  id: number
  title: string
  coverUrl: string
  mediaCount: number
  timeLabel: string
}

export interface ProfileProductRecord {
  id: number
  name: string
  imageUrl: string
  priceLabel: string
  href: string
}

export interface ProfileActionResult {
  ok: boolean
  status: string
}

export interface ProfilePostsResponse {
  posts: FeedPostRecord[]
  hasMore: boolean
  nextOffset: number | null
}

export interface ProfileApiResponse {
  id: number
  username: string
  displayName: string
  headline: string
  bio: string
  coverImage: string
  avatarUrl?: string
  avatarText: string
  verified: boolean
  isOwner: boolean
  isFollowing: boolean
  isFollowRequested: boolean
  statusText: string
  website?: string
  working?: string
  school?: string
  address?: string
  email?: string
  phone?: string
  gender?: string
  birthday?: string
  relationship?: string
  followersCount: number
  followingCount: number
  postCount: number
  albumCount: number
  likedPagesCount: number
  joinedGroupsCount: number
  followers: ProfileConnection[]
  following: ProfileConnection[]
  timelinePosts: FeedPostRecord[]
  timelineHasMore: boolean
  timelineNextOffset: number | null
  photos: FeedPostRecord[]
  videos: FeedPostRecord[]
  albums: ProfileAlbumRecord[]
  likedPages: CommunityPageRecord[]
  joinedGroups: CommunityGroupRecord[]
  products: ProfileProductRecord[]
  productsCount: number
}
