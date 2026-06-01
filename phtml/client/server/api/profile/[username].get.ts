// English description: Returns normalized backend profile data by username for the Nuxt profile page.

import { createError, getRouterParam } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { mapCommunityGroupRecord, mapCommunityPageRecord } from "../community/_shared"
import { mapPostRecord } from "../feed/_shared"
import type { FeedPostRecord } from "../../../src/feed/domain/types/feed.types"
import type { ProfileAlbumRecord, ProfileApiResponse, ProfileConnection, ProfileProductRecord } from "../../../src/profile/domain/types/profile.types"

type BackendProfileEntity = Record<string, unknown>

type BackendProfileResponse = {
  api_status?: number | string
  user_data?: BackendProfileEntity
  followers?: BackendProfileEntity[]
  following?: BackendProfileEntity[]
  liked_pages?: BackendProfileEntity[]
  joined_groups?: BackendProfileEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendPostsResponse = {
  api_status?: number | string
  data?: BackendProfileEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendProductsResponse = {
  api_status?: number | string
  products?: BackendProfileEntity[]
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const isTruthy = (value: unknown) =>
  value === true
  || value === 1
  || value === "1"
  || value === "yes"
  || value === "true"

const readFollowState = (value: unknown) => {
  const normalized = asNumber(value)

  if (normalized === 1 || normalized === 2) {
    return normalized
  }

  return isTruthy(value) ? 1 : 0
}

const asRecord = (value: unknown): BackendProfileEntity =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as BackendProfileEntity
    : {}

const firstString = (entity: BackendProfileEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asString(entity[key])
    if (value) return value
  }

  return ""
}

const createInitials = (value: string, fallback = "PF") => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("")

  return initials || fallback
}

const toConnection = (
  entity: BackendProfileEntity,
  resolveMediaUrl: (value: unknown) => string,
): ProfileConnection => {
  const id = asNumber(entity.user_id ?? entity.id)
  const name = firstString(entity, ["name", "username"]) || `User ${id}`
  const username = asString(entity.username)
  const meta = firstString(entity, ["working", "lastseen_time_text", "gender_text", "address"]) || username

  return {
    id,
    name,
    username,
    initials: createInitials(name, "US"),
    meta,
    avatarUrl: resolveMediaUrl(firstString(entity, ["avatar_full", "avatar"])) || undefined,
  }
}

const buildPostsResponse = (posts: FeedPostRecord[], limit: number) => ({
  posts,
  hasMore: posts.length >= limit,
  nextOffset: posts.at(-1)?.id ?? null,
})

const mapAlbumRecord = (
  entity: BackendProfileEntity,
  resolveMediaUrl: (value: unknown) => string,
): ProfileAlbumRecord => {
  const id = asNumber(entity.post_id ?? entity.id)
  const albumMedia = Array.isArray(entity.album_media)
    ? entity.album_media
    : Array.isArray(entity.photo_album)
      ? entity.photo_album
      : []
  const firstMedia = albumMedia
    .map(item => item && typeof item === "object" ? item as BackendProfileEntity : { image: item })
    .map(item => resolveMediaUrl(firstString(item, ["image", "filename", "postFile", "src"])))
    .find(Boolean)

  return {
    id,
    title: firstString(entity, ["album_name", "postText", "Orginaltext"]) || `Album ${id}`,
    coverUrl: firstMedia || resolveMediaUrl(firstString(entity, ["postFile", "postFileThumb", "url_image"])),
    mediaCount: asNumber(entity.album_media_count ?? entity.media_count) || albumMedia.length,
    timeLabel: firstString(entity, ["time_text", "posted", "time"]),
  }
}

const mapProductRecord = (
  entity: BackendProfileEntity,
  resolveMediaUrl: (value: unknown) => string,
): ProfileProductRecord => {
  const id = asNumber(entity.id ?? entity.product_id)
  const images = Array.isArray(entity.images) ? entity.images.map(asRecord) : []
  const firstImage = images[0]
  const imageUrl = resolveMediaUrl(firstString(firstImage ?? {}, ["image_org", "image", "filename", "src"]))
  const price = firstString(entity, ["price_format", "price"])
  const currency = firstString(entity, ["currency", "currency_symbol"])
  const seoId = firstString(entity, ["seo_id"])

  return {
    id,
    name: firstString(entity, ["name", "title"]) || `Product ${id}`,
    imageUrl,
    priceLabel: [currency, price].filter(Boolean).join(""),
    href: firstString(entity, ["url"]) || (seoId ? `/post/${seoId}` : "/products"),
  }
}

const fetchUserPosts = async (
  client: ReturnType<typeof createBackendApiClient>,
  resolveMediaUrl: (value: unknown) => string,
  userId: number,
  input: {
    limit: number
    afterPostId?: number
    mediaType?: "photos" | "video"
  },
) => {
  const endpoint = input.mediaType ? "get-user-albums" : "posts"
  const payload = input.mediaType
    ? {
        user_id: userId,
        type: input.mediaType,
        limit: input.limit,
        offset: input.afterPostId ?? 0,
      }
    : {
        type: "get_user_posts",
        id: userId,
        limit: input.limit,
        after_post_id: input.afterPostId ?? 0,
      }

  const response = assertBackendApiSuccess(
    await client.post<BackendPostsResponse, Record<string, unknown>>(endpoint, payload),
    "Unable to load profile posts.",
  )

  return buildPostsResponse((response.data ?? []).map(post => mapPostRecord(post, resolveMediaUrl)), input.limit)
}

const fetchUserAlbums = async (
  client: ReturnType<typeof createBackendApiClient>,
  resolveMediaUrl: (value: unknown) => string,
  userId: number,
) => {
  const response = assertBackendApiSuccess(
    await client.post<BackendPostsResponse, Record<string, unknown>>(
      "albums",
      {
        type: "fetch",
        user_id: userId,
        limit: 12,
      },
    ),
    "Unable to load profile albums.",
  )

  return (response.data ?? []).map(album => mapAlbumRecord(album, resolveMediaUrl))
}

const fetchUserProducts = async (
  client: ReturnType<typeof createBackendApiClient>,
  resolveMediaUrl: (value: unknown) => string,
  userId: number,
) => {
  const response = assertBackendApiSuccess(
    await client.post<BackendProductsResponse, Record<string, unknown>>(
      "get-products",
      {
        user_id: userId,
        limit: 24,
      },
    ),
    "Unable to load profile products.",
  )

  return (response.products ?? []).map(product => mapProductRecord(product, resolveMediaUrl))
}

const readUserCount = (
  user: BackendProfileEntity,
  detailKeys: string[],
  fallbackKeys: string[],
  fallbackList?: BackendProfileEntity[],
) => {
  const details = asRecord(user.details)

  for (const key of detailKeys) {
    const value = asNumber(details[key])
    if (value > 0) return value
  }

  for (const key of fallbackKeys) {
    const value = asNumber(user[key])
    if (value > 0) return value
  }

  return fallbackList?.length ?? 0
}

const normalizeRouteUsername = (value: unknown) => {
  const raw = String(value ?? "")

  try {
    return decodeURIComponent(raw).trim().replace(/^@+/, "")
  } catch {
    return raw.trim().replace(/^@+/, "")
  }
}

export default defineEventHandler(async (event): Promise<ProfileApiResponse | null> => {
  const username = normalizeRouteUsername(getRouterParam(event, "username"))
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: "Username is required.",
    })
  }

  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendProfileResponse, Record<string, unknown>>(
      "get-user-data-username",
      {
        username,
        fetch: "user_data,followers,following,liked_pages,joined_groups",
      },
    ),
    "Unable to load profile.",
  )

  const user = response.user_data

  if (!user) {
    return null
  }

  const displayName = firstString(user, ["name", "username"]) || username
  const resolvedUsername = firstString(user, ["username"]) || username
  const profileUserId = asNumber(user.user_id ?? user.id)
  const [
    timelinePosts,
    photoPosts,
    videoPosts,
    albums,
    products,
  ] = await Promise.all([
    fetchUserPosts(client, resolveMediaUrl, profileUserId, { limit: 10 }),
    fetchUserPosts(client, resolveMediaUrl, profileUserId, { limit: 12, mediaType: "photos" }),
    fetchUserPosts(client, resolveMediaUrl, profileUserId, { limit: 12, mediaType: "video" }),
    fetchUserAlbums(client, resolveMediaUrl, profileUserId),
    fetchUserProducts(client, resolveMediaUrl, profileUserId),
  ])
  const currentUserId = asNumber(currentUser.user_id)
  const currentUserInFollowers = Boolean((response.followers ?? []).some(entry =>
    asNumber(entry.user_id ?? entry.id) === currentUserId,
  ))
  const followState = readFollowState(user.is_following) || (currentUserInFollowers ? 1 : 0)

  return {
    id: profileUserId,
    username: resolvedUsername,
    displayName,
    headline: firstString(user, ["working", "school"]),
    bio: firstString(user, ["about"]),
    coverImage: resolveMediaUrl(firstString(user, ["cover_full", "cover"])),
    avatarUrl: resolveMediaUrl(firstString(user, ["avatar_full", "avatar"])) || undefined,
    avatarText: createInitials(displayName),
    verified: isTruthy(user.verified),
    isOwner: profileUserId === currentUserId,
    isFollowing: followState === 1,
    isFollowRequested: followState === 2,
    statusText: firstString(user, ["lastseen_time_text", "gender_text"]),
    website: firstString(user, ["website"]),
    working: firstString(user, ["working"]),
    school: firstString(user, ["school"]),
    address: firstString(user, ["address"]),
    email: firstString(user, ["email"]),
    phone: firstString(user, ["phone_number"]),
    gender: firstString(user, ["gender_text", "gender"]),
    birthday: firstString(user, ["birthday"]),
    relationship: firstString(user, ["relationship"]),
    followersCount: readUserCount(user, ["followers_count"], ["followers_count", "followers"], response.followers),
    followingCount: readUserCount(user, ["following_count"], ["following_count", "following"], response.following),
    postCount: asNumber(asRecord(user.details).post_count ?? user.post_count ?? user.posts),
    albumCount: asNumber(asRecord(user.details).album_count ?? user.album_count),
    likedPagesCount: response.liked_pages?.length ?? 0,
    joinedGroupsCount: response.joined_groups?.length ?? 0,
    followers: (response.followers ?? []).map(entry => toConnection(entry, resolveMediaUrl)),
    following: (response.following ?? []).map(entry => toConnection(entry, resolveMediaUrl)),
    timelinePosts: timelinePosts.posts,
    timelineHasMore: timelinePosts.hasMore,
    timelineNextOffset: timelinePosts.nextOffset,
    photos: photoPosts.posts,
    videos: videoPosts.posts,
    albums,
    likedPages: (response.liked_pages ?? []).map(page =>
      mapCommunityPageRecord(page, { currentUserId: asNumber(currentUser.user_id) }),
    ),
    joinedGroups: (response.joined_groups ?? []).map(group =>
      mapCommunityGroupRecord(group, {
        currentUserId: asNumber(currentUser.user_id),
        segment: "joined",
      }),
    ),
    products,
    productsCount: products.length,
  }
})
