// English description: Maps legacy PHP feed, explore, memory, and poke payloads into normalized Nuxt API responses for Dev 2 pages.

import { createError, getQuery, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { mapCommunityPageRecord } from "../community/_shared"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"
import {
  feedStoryReactionByBackendId,
  feedStoryReactionBackendIds,
  feedStoryReactionDefinitions,
  isFeedStoryReaction,
  type FeedStoryReactionType,
} from "../../../src/feed/domain/constants/story-reactions"
import type {
  FeedAnnouncement,
  FeedCommentRecord,
  FeedExploreResponse,
  FeedGreeting,
  FeedExploreUserRecord,
  FeedHashtagChip,
  FeedHomeResponse,
  FeedMemoriesResponse,
  FeedMediaItem,
  FeedPostAttachmentCard,
  FeedPostMention,
  FeedPollOptionRecord,
  FeedPokeActionResult,
  FeedPokeRecord,
  FeedPostReactionSummary,
  FeedPostReactionUser,
  FeedPostReactionsResponse,
  FeedPostRecord,
  FeedPostsResponse,
  FeedStoryRecord,
} from "../../../src/feed/domain/types/feed.types"

type BackendEntity = Record<string, unknown>
type BackendMultipartFile = {
  filename?: string
  type?: string
  data: Buffer
}

type BackendPostsResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendSinglePostResponse = {
  api_status?: number | string
  post_data?: BackendEntity
  post_comments?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendRegisterCommentResponse = {
  status?: number | string
  html?: string
  comments_num?: number | string
  message?: string
  errors?: unknown
}

type BackendUploadImageResponse = {
  status?: number | string
  image?: string
  image_src?: string
  message?: string
  errors?: unknown
}

type BackendUserStoriesResponse = {
  api_status?: number | string
  stories?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendGeneralDataResponse = {
  api_status?: number | string
  announcement?: BackendEntity
  trending_hashtag?: unknown
  errors?: {
    error_text?: string
  }
}

type BackendRecommendedResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendMemoriesResponse = {
  api_status?: number | string
  data?: {
    posts?: BackendEntity[]
    friends?: BackendEntity[]
  }
  errors?: {
    error_text?: string
  }
}

type BackendPokeResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  message_data?: string
  errors?: {
    error_text?: string
  }
}

type BackendVotePollResponse = {
  api_status?: number | string
  votes?: BackendEntity[]
  voted_id?: number | string
  errors?: {
    error_text?: string
  }
}

const accentPalette = [
  "#2563eb",
  "#0369a1",
  "#7c3aed",
  "#0f766e",
  "#ea580c",
  "#e11d48",
] as const

const videoExtensions = ["mp4", "mov", "webm", "m4v", "avi", "mpeg", "mpg", "mkv", "ogg"]

const legacyGreetingCopy = {
  morning: {
    label: "Buổi sáng tốt lành",
    quote: "Mỗi ngày mới là một cơ hội để thay đổi cuộc sống của bạn.",
    accent: "#7FC583",
    image: "park.png",
  },
  afternoon: {
    label: "Chào buổi chiều",
    quote: "Cầu mong cho buổi chiều nay được nhẹ nhàng, may mắn, giác ngộ, hiệu quả và hạnh phúc.",
    accent: "#ffc107",
    image: "desert.png",
  },
  evening: {
    label: "Chào buổi tối",
    quote: "Buổi tối là cách sống để nói rằng bạn đang tiến gần hơn đến ước mơ của mình.",
    accent: "#FF4F70",
    image: "sea.png",
  },
} as const

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

const isExplicitlyFalse = (value: unknown) =>
  value === false
  || value === 0
  || value === "0"
  || value === "no"
  || value === "false"

const asRecord = (value: unknown): BackendEntity =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as BackendEntity
    : {}

const asArray = (value: unknown): BackendEntity[] =>
  Array.isArray(value)
    ? value.map(item => asRecord(item))
    : []

const asUnknownArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : []

const firstString = (entity: BackendEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asString(entity[key])
    if (value) {
      return value
    }
  }

  return ""
}

const firstNumber = (entity: BackendEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asNumber(entity[key])
    if (value > 0) {
      return value
    }
  }

  return 0
}

const normalizeReactionType = (value: unknown): FeedStoryReactionType | null => {
  const rawValue = asString(value)

  if (!rawValue) {
    return null
  }

  if (isFeedStoryReaction(rawValue)) {
    return rawValue
  }

  const titleValue = `${rawValue.charAt(0).toUpperCase()}${rawValue.slice(1).toLowerCase()}`

  if (isFeedStoryReaction(titleValue)) {
    return titleValue
  }

  return feedStoryReactionByBackendId[rawValue] ?? null
}

const getPostReaction = (entity: BackendEntity) => {
  const reaction = asRecord(entity.reaction)
  const reactionType = normalizeReactionType(firstString(reaction, ["type", "reaction"]))
  const reactions = feedStoryReactionDefinitions
    .map(({ value, backendId }) => ({
      reaction: value,
      count: asNumber(reaction[value]) || asNumber(reaction[value.toLowerCase()]) || asNumber(reaction[String(backendId)]),
    }))
    .filter(item => item.count > 0)

  return {
    isLiked: isTruthy(entity.is_liked) || isTruthy(reaction.is_reacted),
    reaction: reactionType,
    count: asNumber(reaction.count),
    reactions,
  }
}

type BackendPostReactionsResponse = {
  api_status?: number | string
  reactions?: BackendEntity[]
  users?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

const mapPostReactionUsers = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
) => {
  const reaction = asRecord(entity.reaction)
  const source = [
    ...asArray(reaction.users),
    ...asArray(reaction.reactions),
    ...asArray(entity.reaction_users),
    ...asArray(entity.reactions_users),
    ...asArray(entity.post_reactions),
  ]

  return source
    .flatMap((item) => {
      const record = asRecord(item)
      const user = asRecord(record.user || record.user_data || record.publisher)
      const id = firstNumber(record, ["user_id", "id"]) || firstNumber(user, ["user_id", "id"])
      const username = firstString(record, ["username"]) || firstString(user, ["username"])
      const name = firstString(record, ["name", "full_name"]) || firstString(user, ["name", "full_name", "username"]) || username
      const reactionType = normalizeReactionType(firstString(record, ["reaction", "type"]) || firstString(user, ["reaction", "type"]))

      if (id <= 0 || !name || !reactionType) {
        return []
      }

      return [{
        id,
        name,
        avatarUrl: resolveMediaUrl(firstString(record, ["avatar", "avatar_url", "avatar_full"]) || firstString(user, ["avatar", "avatar_url", "avatar_full", "avatar_org"])),
        profilePath: username ? `/@${username}` : undefined,
        reaction: reactionType,
        isFollowing: isTruthy(record.is_following) || isTruthy(user.is_following) || isTruthy(record.is_friend) || isTruthy(user.is_friend),
      }]
    })
}

const mapBackendPostReactionUser = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
): FeedPostReactionUser | null => {
  const id = firstNumber(entity, ["user_id", "id"])
  const username = firstString(entity, ["username"])
  const name = firstString(entity, ["name", "full_name", "first_name"]) || username
  const reaction = normalizeReactionType(firstString(entity, ["reaction", "type"]))

  if (id <= 0 || !name || !reaction) {
    return null
  }

  return {
    id,
    name,
    avatarUrl: resolveMediaUrl(firstString(entity, ["avatar", "avatar_url", "avatar_full", "avatar_org"])),
    profilePath: username ? `/@${username}` : undefined,
    reaction,
    isFollowing: isTruthy(entity.is_following) || isTruthy(entity.is_followed) || isTruthy(entity.is_friend),
  }
}

const mapBackendPostReactionSummary = (entity: BackendEntity): FeedPostReactionSummary | null => {
  const reaction = normalizeReactionType(firstString(entity, ["reaction", "type"]))
  const count = firstNumber(entity, ["count", "total"])

  if (!reaction || count <= 0) {
    return null
  }

  return {
    reaction,
    count,
  }
}

const mapPollOptions = (entity: BackendEntity): FeedPollOptionRecord[] => {
  const votedId = firstNumber(entity, ["voted_id", "votedId"])

  return asArray(entity.options)
    .map(option => {
      const id = firstNumber(option, ["id", "option_id"])

      return {
        id,
        text: firstString(option, ["text", "option_text", "answer"]),
        votes: firstNumber(option, ["option_votes", "votes", "votes_count"]),
        percentage: firstNumber(option, ["percentage_num", "percentage"]),
        selected: votedId > 0 && id === votedId,
      }
    })
    .filter(option => option.id > 0 && option.text)
}

const extractPostEventContext = (entity: BackendEntity): FeedPostRecord["eventContext"] => {
  const eventEntity = asRecord(entity.event || entity.event_data || entity.post_event)
  const eventId = firstNumber(entity, ["event_id", "page_event_id"])
    || firstNumber(eventEntity, ["id", "event_id"])
  const eventName = firstString(eventEntity, ["name", "event_name", "title"])

  if (eventId <= 0 || !eventName) {
    return null
  }

  return {
    id: eventId,
    name: eventName,
    path: `/events/${eventId}`,
  }
}

const extractPostGroupContext = (entity: BackendEntity): FeedPostRecord["groupContext"] => {
  const groupEntity = asRecord(entity.group_data || entity.group_recipient || entity.group)
  const groupId = firstNumber(entity, ["group_id"])
    || firstNumber(groupEntity, ["group_id", "id"])
  const groupSlug = firstString(groupEntity, ["group_name", "slug", "name"])
  const groupName = firstString(groupEntity, ["group_title", "title", "name", "group_name"])

  if (groupId <= 0 || !groupSlug || !groupName) {
    return null
  }

  return {
    id: groupId,
    name: groupName,
    path: `/g/${groupSlug}`,
    slug: groupSlug,
  }
}

const hasUnseenStoryState = (story: BackendEntity, owner: BackendEntity) => {
  const unseenKeys = ["have_not_seen", "have_not_viewed", "not_seen", "unseen", "has_unseen"]
  const seenKeys = ["is_seen", "is_viewed", "viewed", "seen"]

  if (unseenKeys.some(key => isTruthy(story[key]) || isTruthy(owner[key]))) {
    return true
  }

  if (seenKeys.some(key => isExplicitlyFalse(story[key]) || isExplicitlyFalse(owner[key]))) {
    return true
  }

  return false
}

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

const slugify = (value: string) =>
  stripHtml(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const firstDisplayNamePart = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean)[0] || value.trim()

const normalizeDisplayMention = (value: string) =>
  firstDisplayNamePart(value).replace(/^@/, "").replace(/\s+/g, "_")

const extractMentions = (entity: BackendEntity): FeedPostMention[] => {
  const rawMentions = entity.mentions_users
  const mentions: FeedPostMention[] = []

  if (Array.isArray(rawMentions)) {
    for (const item of rawMentions) {
      const record = asRecord(item)
      const username = firstString(record, ["username", "user_name"])
      const name = firstString(record, ["name", "first_name", "firstName"]) || username

      if (username) {
        mentions.push({
          username,
          name,
          displayName: normalizeDisplayMention(name || username),
        })
      }
    }
  } else {
    for (const [username, nameValue] of Object.entries(asRecord(rawMentions))) {
      const name = asString(nameValue) || username

      if (username) {
        mentions.push({
          username,
          name,
          displayName: normalizeDisplayMention(name || username),
        })
      }
    }
  }

  return mentions.filter((mention, index, source) =>
    source.findIndex(item => item.username === mention.username) === index,
  )
}

const formatBackendTimestamp = (value: unknown) => {
  const raw = asString(value)

  if (!raw) {
    return ""
  }

  const numeric = Number(raw)

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return raw
  }

  const timestamp = numeric > 9999999999 ? numeric : numeric * 1000
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return raw
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

const formatPostTime = (entity: BackendEntity) =>
  firstString(entity, ["time_text"]) ||
  formatBackendTimestamp(firstString(entity, ["posted", "time", "created_at"]))

const normalizeFeedReactionType = (value: unknown): FeedStoryReactionType | null => {
  const reaction = asString(value)
  return isFeedStoryReaction(reaction) ? reaction : null
}

const createInitials = (value: string, fallback = "VN") => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("")

  return initials || fallback
}

const normalizeHashtagValue = (value: string) =>
  value
    .replace(/^#/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const formatHashtagPath = (value: string) => {
  const slug = normalizeHashtagValue(value)
  return slug ? `/hashtag/${slug}` : "/explore"
}

const createAccent = (id: number) =>
  accentPalette[Math.abs(id) % accentPalette.length]

const createGradient = (id: number) =>
  `linear-gradient(135deg,#0f172a 0%,${createAccent(id)} 58%,#bfdbfe 100%)`

const inferAudience = (entity: BackendEntity) => {
  const privacy = asString(entity.postPrivacy || entity.privacy || entity.post_privacy)

  if (privacy === "3") return "Only me"
  if (privacy === "2") return "Group"
  if (privacy === "1") return "Friends"
  return "Public"
}

const inferCategory = (source: string) => {
  const normalized = source.toLowerCase()

  if (/design|branding|ui|ux|creative/.test(normalized)) return "design"
  if (/tech|ai|code|frontend|backend|developer/.test(normalized)) return "technology"
  if (/business|founder|startup|sale|seller|market/.test(normalized)) return "business"
  if (/product|launch|roadmap|feature|marketplace/.test(normalized)) return "product"
  if (/event|demo|meetup|conference|live/.test(normalized)) return "events"
  if (/education|learn|class|course|workshop|mentor/.test(normalized)) return "education"
  if (/portrait|photo|gallery|camera/.test(normalized)) return "portraits"

  return "community"
}

const isVideoUrl = (value: string) => {
  const normalized = value.toLowerCase().split(/[?#]/)[0] || ""
  return videoExtensions.some(extension => normalized.endsWith(`.${extension}`))
    || normalized.includes("_video")
    || normalized.includes("youtube.com")
    || normalized.includes("youtu.be")
    || normalized.includes("vimeo.com")
    || normalized.includes("playtube")
    || normalized.includes("facebook.com")
    || normalized.includes("dailymotion")
}

const firstMediaUrl = (
  candidates: unknown[],
  resolveMediaUrl: (value: unknown) => string,
) => {
  for (const candidate of candidates) {
    const resolved = resolveMediaUrl(candidate)
    if (resolved) {
      return resolved
    }
  }

  return ""
}

const collectStoryMediaUrls = (
  source: unknown,
  keys: string[],
  resolveMediaUrl: (value: unknown) => string,
  mediaType?: "image" | "video",
) => {
  const urls: string[] = []

  for (const item of asUnknownArray(source)) {
    const record = asRecord(item)
    const rawType = firstString(record, ["type", "media_type"]).toLowerCase()

    if (mediaType && rawType && !rawType.includes(mediaType)) {
      continue
    }

    const rawValue = asString(item) || firstString(record, keys)
    const resolved = resolveMediaUrl(rawValue)

    if (resolved) {
      urls.push(resolved)
    }
  }

  return urls
}

const extractTags = (entity: BackendEntity) => {
  const explicitTags = [
    ...asArray(entity.tags).map(tag => asString(tag.tag || tag.name || tag)),
    ...asString(entity.hash).split(","),
    ...asString(entity.hashtag).split(","),
  ]

  const inlineTags = Array.from(
    new Set(
      stripHtml(firstString(entity, ["Orginaltext", "postText_API", "postText", "text"]))
        .match(/#[\p{L}\p{N}_-]+/gu) ?? [],
    ),
  )

  return Array.from(new Set(
    [...explicitTags, ...inlineTags]
      .map(item => item.replace(/^#/, "").trim())
      .filter(Boolean),
  ))
}

const buildPostText = (entity: BackendEntity) => {
  const product = asRecord(entity.product)
  const thread = asRecord(entity.thread)
  const forum = asRecord(entity.forum)
  const productTitle = stripHtml(firstString(product, ["name", "title"]))
  const productDescription = stripHtml(firstString(product, ["description"]))
  const productGeneratedText = [
    productTitle,
    productDescription,
    [productTitle, productDescription].filter(Boolean).join("\n"),
    [productTitle, productDescription].filter(Boolean).join(" "),
  ].map(value => value.replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean)
  const candidates = [
    firstString(entity, ["Orginaltext", "postText_API", "postText", "text"]),
    [
      firstString(entity, ["postLinkTitle"]),
      firstString(entity, ["postLinkContent"]),
    ].filter(Boolean).join("\n"),
    firstString(entity, ["postMap"]),
    [
      firstString(thread, ["headline", "title"]),
      firstString(thread, ["post_subject", "description"]),
    ].filter(Boolean).join("\n"),
    [
      firstString(forum, ["name", "title"]),
      firstString(forum, ["description"]),
    ].filter(Boolean).join("\n"),
  ]

  const uniqueParts = Array.from(new Set(candidates.map(stripHtml).filter(Boolean)))
    .filter((part) => {
      const normalized = part.replace(/\s+/g, " ").trim().toLowerCase()

      return !productGeneratedText.includes(normalized)
    })
  return uniqueParts.join("\n\n")
}

const buildPostAttachmentCard = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
): FeedPostAttachmentCard | null => {
  const blog = asRecord(entity.blog || entity.blog_data || entity.article)
  const blogTitle = firstString(blog, ["title", "name"])
  const blogId = firstNumber(entity, ["blog_id"])
    || firstNumber(blog, ["id", "blog_id", "article_id"])

  if (blogTitle || blogId > 0) {
    const slug = blogId > 0
      ? `${blogId}_${slugify(blogTitle) || "blog"}`
      : slugify(blogTitle)

    return {
      type: "blog",
      title: blogTitle || "Blog",
      description: stripHtml(firstString(blog, ["description", "content", "body", "excerpt"])),
      imageUrl: resolveMediaUrl(firstString(blog, ["thumbnail", "image", "cover", "avatar"])),
      href: slug ? appRoutes.readBlog(slug) : appRoutes.blogs,
    }
  }

  const fund = asRecord(entity.fund)
  const fundData = asRecord(entity.fund_data)
  const funding = Object.keys(fundData).length ? fundData : fund
  const fundTitle = firstString(funding, ["title", "name"])
  const fundId = firstNumber(entity, ["fund_id"])
    || firstNumber(funding, ["id", "fund_id"])
  const hashedId = firstString(funding, ["hashed_id", "hash_id"])

  if (fundTitle || fundId > 0 || hashedId) {
    const amount = firstNumber(funding, ["amount", "target", "goal"])
    const raised = firstNumber(funding, ["raised", "donated", "total_raised"])
    const rawProgress = firstNumber(funding, ["bar", "progress", "percent"])
    const progress = amount > 0
      ? Math.min(100, Math.max(0, Math.round((raised / amount) * 100)))
      : Math.min(100, Math.max(0, rawProgress))

    return {
      type: "funding",
      title: fundTitle || "Funding",
      description: stripHtml(firstString(funding, ["description", "content", "body", "excerpt"])),
      imageUrl: resolveMediaUrl(firstString(funding, ["image", "thumbnail", "cover", "avatar"])),
      href: appRoutes.showFund(hashedId || fundId),
      progress,
      raised,
      amount,
    }
  }

  const product = asRecord(entity.product || entity.product_data)
  const productTitle = firstString(product, ["name", "title"])
  const productId = firstNumber(entity, ["product_id"])
    || firstNumber(product, ["id", "product_id"])

  if (productTitle || productId > 0) {
    const images = asUnknownArray(product.images)
    const firstImage = asRecord(images[0])
    const imageUrl = resolveMediaUrl(
      asString(images[0])
      || firstString(firstImage, ["image_org", "image", "src", "url"])
      || firstString(product, ["image", "thumbnail", "cover"]),
    )
    const price = firstString(product, ["price_format"])
      || firstString(product, ["price_text"])
      || firstString(product, ["price"])
    const description = [
      price,
      stripHtml(firstString(product, ["description"])),
    ].filter(Boolean).join(" - ")
    const rawUrl = firstString(product, ["url"])
    const href = rawUrl
      ? rawUrl
      : appRoutes.postDetail(firstNumber(entity, ["post_id", "id"]) || productId)

    return {
      type: "product",
      title: productTitle || "Product",
      description,
      imageUrl,
      href,
    }
  }

  return null
}

const feelingLabels: Record<string, { label: string; emoji: string }> = {
  happy: { label: "Vui mừng", emoji: "😊" },
  loved: { label: "Được yêu", emoji: "😍" },
  sad: { label: "Buồn", emoji: "😢" },
  so_sad: { label: "Rất buồn", emoji: "😭" },
  angry: { label: "Tức giận", emoji: "😡" },
  confused: { label: "Bối rối", emoji: "😕" },
  smirk: { label: "Cười nhếch mép", emoji: "😏" },
  cool: { label: "Tuyệt", emoji: "😎" },
  funny: { label: "Vui nhộn", emoji: "😄" },
  tired: { label: "Mệt mỏi", emoji: "😫" },
  blessed: { label: "May mắn", emoji: "😇" },
  shocked: { label: "Sốc", emoji: "😮" },
  sleepy: { label: "Buồn ngủ", emoji: "😴" },
  bored: { label: "Chán", emoji: "😒" },
}

const extractPostFeeling = (entity: BackendEntity) => {
  const value = firstString(entity, ["postFeeling"])

  if (!value) {
    return null
  }

  return {
    value,
    label: feelingLabels[value]?.label || value,
    emoji: feelingLabels[value]?.emoji || "🙂",
  }
}

const extractMediaItems = (
  entity: BackendEntity,
  fallbackAlt: string,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
) => {
  const items: FeedMediaItem[] = []
  const seen = new Set<string>()
  const appendItem = (candidate: FeedMediaItem | null) => {
    if (!candidate?.src || seen.has(candidate.src)) {
      return
    }

    seen.add(candidate.src)
    items.push(candidate)
  }

  const appendMediaValue = (value: string, type: "image" | "video", thumb?: string) => {
    if (!value) return

    appendItem({
      type,
      src: value,
      alt: fallbackAlt,
      thumb,
      mime: type === "video" ? "video/mp4" : undefined,
    })
  }

  const albumSources = [
    ...asArray(entity.photo_album),
    ...asArray(entity.album),
    ...asArray(entity.photo_multi),
    ...asArray(entity.images),
  ]

  for (const media of albumSources) {
    const src = resolveMediaUrl(firstString(media, ["image", "filename", "postFile", "src"]))
    appendMediaValue(src, isVideoUrl(src) ? "video" : "image")
  }

  const postFile = resolveMediaUrl(firstString(entity, ["postFile"]))
  const postThumb = resolveMediaUrl(firstString(entity, ["postFileThumb", "url_image"]))
  const externalVideoThumb = resolveMediaUrl(firstString(entity, ["url_image", "postFileThumb"]))

  if (postFile) {
    appendMediaValue(postFile, isVideoUrl(postFile) ? "video" : "image", postThumb || undefined)
  }

  if (!items.length) {
    const fallbackImage = resolveMediaUrl(firstString(entity, ["postFileThumb", "url_image"]))
    if (fallbackImage) {
      appendMediaValue(fallbackImage, "image")
    }
  }

  if (!items.length) {
    const externalVideo = firstString(entity, [
      "postYoutube",
      "postVimeo",
      "postPlaytube",
      "postVine",
      "postDailymotion",
      "postFacebook",
    ])

    if (externalVideo) {
      appendMediaValue(externalVideo, "video", externalVideoThumb || undefined)
    }
    else if (externalVideoThumb) {
      appendMediaValue(externalVideoThumb, "image")
    }
  }

  return items
}

const mapCommentRecord = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
): FeedCommentRecord => {
  const publisher = asRecord(entity.publisher)
  const reaction = asRecord(entity.reaction)
  const author = firstString(publisher, ["name", "username"]) || "User"
  const username = firstString(publisher, ["username"])
  const imageUrl = resolveMediaUrl(firstString(entity, ["c_file", "comment_image", "image"]))
  const audioUrl = resolveMediaUrl(firstString(entity, ["record", "audio"]))
  const attachment = audioUrl
    ? { type: "audio" as const, url: audioUrl }
    : imageUrl
      ? { type: imageUrl.toLowerCase().includes(".gif") ? "gif" as const : "image" as const, url: imageUrl }
      : undefined

  return {
    id: firstNumber(entity, ["id", "comment_id"]),
    author,
    authorAvatarUrl: resolveMediaUrl(firstString(publisher, ["avatar", "avatar_full"])),
    authorPath: username ? `/@${username}` : undefined,
    role: firstString(publisher, ["working", "school"]) || author,
    text: stripHtml(firstString(entity, ["Orginaltext", "text", "comment"])),
    time: firstString(entity, ["time_text", "posted"]) || formatBackendTimestamp(entity.time),
    attachment,
    reactionsCount: firstNumber(reaction, ["count", "reactions_count", "total"]),
    selectedReaction: normalizeFeedReactionType(reaction.type),
    repliesCount: firstNumber(entity, ["replies", "replies_num", "reply_count", "replies_count"]),
    replies: asArray(entity.replies).map(reply => mapCommentRecord(reply, resolveMediaUrl)),
  }
}

export const mapPostRecord = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
  depth = 0,
): FeedPostRecord => {
  const publisher = asRecord(entity.publisher)
  const userData = asRecord(entity.user_data)
  const pageData = asRecord(entity.page_data)
  const groupData = asRecord(entity.group_data)
  const sourceEntity = Object.keys(publisher).length > 0 ? publisher : userData
  const authorId = firstNumber(sourceEntity, ["user_id", "id"])
    || firstNumber(entity, ["user_id", "owner_id"])
  const author = firstString(sourceEntity, ["name", "username"])
    || firstString(pageData, ["page_title", "page_name"])
    || firstString(groupData, ["group_title", "group_name"])
    || "User"
  const authorUsername = firstString(sourceEntity, ["username"])
  const pageSlug = firstString(pageData, ["page_name"])
  const groupSlug = firstString(groupData, ["group_name"])
  const sourcePath = pageSlug
    ? `/p/${pageSlug}`
    : groupSlug
      ? `/g/${groupSlug}`
      : authorUsername
        ? `/@${authorUsername}`
        : "/home"
  const mentions = extractMentions(entity)
  const text = buildPostText(entity)
  const sharedInfo = asRecord(entity.shared_info)
  const sharedPostId = firstNumber(entity, ["parent_id", "shared_post_id"])
  const sharedPost = depth < 1 && Object.keys(sharedInfo).length > 0
    ? mapPostRecord(sharedInfo, resolveMediaUrl, depth + 1)
    : null
  const feeling = extractPostFeeling(entity)
  const eventContext = extractPostEventContext(entity)
  const groupContext = extractPostGroupContext(entity)
  const mediaItems = extractMediaItems(entity, author, resolveMediaUrl)
  const attachmentCard = buildPostAttachmentCard(entity, resolveMediaUrl)
  const categoryHint = [
    firstString(sourceEntity, ["working", "school"]),
    text,
    attachmentCard?.title ?? "",
    extractTags(entity).join(" "),
  ].join(" ")
  const primaryMediaType = !mediaItems.length && !attachmentCard?.imageUrl
    ? "text"
    : mediaItems.some(item => item.type === "video")
      ? "video"
      : "image"
  const postReaction = getPostReaction(entity)
  const reactionUsers = mapPostReactionUsers(entity, resolveMediaUrl)
  const pollOptions = mapPollOptions(entity)
  const liveStreamName = firstString(entity, ["stream_name", "streamName"])
  const liveTime = firstNumber(entity, ["live_time", "liveTime"])
  const liveEnded = isTruthy(entity.live_ended)
  const liveHeartbeatAge = liveTime > 0 ? Math.max(0, Math.floor(Date.now() / 1000) - liveTime) : 0
  const isLive = firstString(entity, ["postType", "post_type", "type"]) === "live" || Boolean(liveStreamName)
  const liveState = !isLive
    ? null
    : liveEnded || !liveTime || liveHeartbeatAge > 45
      ? "offline"
      : liveHeartbeatAge > 10 ? "stale" : "live"

  return {
    id: firstNumber(entity, ["post_id", "id"]),
    sharedPostId: sharedPostId || undefined,
    sharedPost,
    authorId: authorId || undefined,
    colorId: firstNumber(entity, ["color_id"]) || undefined,
    author,
    authorAvatarUrl: resolveMediaUrl(firstString(sourceEntity, ["avatar", "avatar_full"])),
    authorVerified: isTruthy(sourceEntity.verified) || isTruthy(pageData.verified),
    authorPath: authorUsername ? `/@${authorUsername}` : sourcePath,
    eventContext,
    groupContext,
    role: firstString(sourceEntity, ["working", "school", "address"])
      || firstString(pageData, ["category_name", "phone"])
      || firstString(groupData, ["category_name", "group_title"])
      || author,
    audience: inferAudience(entity),
    time: formatPostTime(entity),
    text,
    mentions,
    feeling,
    pollOptions,
    tags: extractTags(entity),
    stats: {
      likes: postReaction.count || firstNumber(entity, ["post_likes", "likes", "likes_count", "likes_count_total"]),
      comments: firstNumber(entity, ["post_comments", "comments", "comments_count", "comments_count_total"]),
      shares: firstNumber(entity, ["post_share", "post_shares", "shares", "shares_count"]),
      views: firstNumber(entity, ["post_views", "view_count", "views"]),
    },
    isLive,
    liveState,
    liveStreamName: liveStreamName || undefined,
    liveViewerCount: firstNumber(entity, ["live_sub_users", "live_viewer_count", "viewer_count", "live_count"]),
    liveHeartbeatAge,
    comments: asArray(entity.get_post_comments).map(comment => mapCommentRecord(comment, resolveMediaUrl)),
    mediaItems,
    attachmentCard,
    category: inferCategory(categoryHint),
    primaryMediaType,
    sourceLabel: pageSlug ? "page" : groupSlug ? "group" : "feed",
    sourcePath,
    isSaved: isTruthy(entity.is_post_saved) || isTruthy(entity.is_saved),
    isLiked: postReaction.isLiked,
    reaction: postReaction.reaction,
    reactions: postReaction.reactions,
    reactionUsers,
  }
}

const mapStoryRecord = (
  entity: BackendEntity,
  currentUserId: number,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
): FeedStoryRecord => {
  const user = asRecord(entity.user_data)
  const id = firstNumber(entity, ["id", "story_id"])
  const ownerId = firstNumber(entity, ["user_id", "owner_id"])
    || firstNumber(user, ["user_id", "id"])
  const ownerUsername = firstString(user, ["username"])
  const author = firstString(user, ["name", "username"]) || ownerUsername || "User"
  const ownerKey = ownerId > 0
    ? `user:${ownerId}`
    : ownerUsername
      ? `username:${ownerUsername}`
      : `author:${author.toLowerCase()}`
  const avatarUrl = resolveMediaUrl(firstString(user, ["avatar", "avatar_full", "avatar_org"]))
  const thumbnailUrl = resolveMediaUrl(firstString(entity, ["thumbnail"]))
  const thumbUrl = resolveMediaUrl(firstString(asRecord(entity.thumb), ["filename", "image", "src"]))
  const storyMediaVideoUrls = collectStoryMediaUrls(
    entity.story_media,
    ["filename", "video", "file", "src"],
    resolveMediaUrl,
    "video",
  )
  const storyMediaImageUrls = collectStoryMediaUrls(
    entity.story_media,
    ["filename", "image", "file", "src"],
    resolveMediaUrl,
    "image",
  )
  const videoUrl = firstMediaUrl(
    [
      ...storyMediaVideoUrls,
      ...collectStoryMediaUrls(entity.videos, ["filename", "video", "file", "src"], resolveMediaUrl),
      firstString(entity, ["video", "story_video", "postFile"]),
      isVideoUrl(thumbnailUrl) ? thumbnailUrl : "",
    ],
    resolveMediaUrl,
  )
  const imageUrl = firstMediaUrl(
    [
      ...storyMediaImageUrls,
      ...collectStoryMediaUrls(entity.images, ["filename", "image", "file", "src"], resolveMediaUrl),
      thumbUrl,
      !isVideoUrl(thumbnailUrl) ? thumbnailUrl : "",
    ],
    resolveMediaUrl,
  )

  return {
    id,
    ownerId,
    ownerKey,
    ownerUsername,
    author,
    avatar: createInitials(author),
    avatarUrl,
    gradient: createGradient(id),
    media: videoUrl || imageUrl || avatarUrl,
    mediaType: videoUrl ? "video" : "image",
    poster: imageUrl || avatarUrl,
    title: firstString(entity, ["title"]),
    caption: firstString(entity, ["description"]) || "",
    meta: firstString(entity, ["time_text"]) || "",
    likes: firstNumber(entity, ["reaction_count", "likes"]),
    comments: firstNumber(entity, ["comment_count", "comments"]),
    views: firstNumber(entity, ["view_count", "views"]),
    isMe: ownerId === currentUserId,
    hasUnseen: hasUnseenStoryState(entity, user),
  }
}

const sortStoriesByLatest = (stories: FeedStoryRecord[]) =>
  [...stories].sort((left, right) => right.id - left.id)

const withStoryOwnerData = (story: BackendEntity, ownerEntry: BackendEntity) => {
  const storySeenState = {
    have_not_seen: story.have_not_seen ?? ownerEntry.have_not_seen,
    have_not_viewed: story.have_not_viewed ?? ownerEntry.have_not_viewed,
    not_seen: story.not_seen ?? ownerEntry.not_seen,
    unseen: story.unseen ?? ownerEntry.unseen,
    has_unseen: story.has_unseen ?? ownerEntry.has_unseen,
    is_seen: story.is_seen ?? ownerEntry.is_seen,
    is_viewed: story.is_viewed ?? ownerEntry.is_viewed,
    viewed: story.viewed ?? ownerEntry.viewed,
    seen: story.seen ?? ownerEntry.seen,
  }

  if (Object.keys(asRecord(story.user_data)).length > 0) {
    return {
      ...story,
      ...storySeenState,
    }
  }

  const ownerData = { ...ownerEntry }
  delete ownerData.stories

  return {
    ...story,
    ...storySeenState,
    user_id: firstNumber(story, ["user_id", "owner_id"]) || firstNumber(ownerEntry, ["user_id", "id"]),
    user_data: ownerData,
  }
}

const extractUserStorySequences = (
  payload: BackendUserStoriesResponse | null,
  currentUserId: number,
  resolveMediaUrl: (value: unknown) => string,
) => {
  return (payload?.stories ?? [])
    .map((ownerEntry) => {
      const nestedStories = asArray(ownerEntry.stories)

      if (!nestedStories.length) {
        return []
      }

      return sortStoriesByLatest(
        nestedStories.map(story =>
          mapStoryRecord(withStoryOwnerData(story, ownerEntry), currentUserId, resolveMediaUrl),
        ),
      )
    })
    .filter(stories => stories.length > 0)
}

const flattenStorySequences = (
  sequences: FeedStoryRecord[][],
  currentUserId: number,
) =>
  [...sequences]
    .sort((left, right) => {
      const leftLatest = left[0]
      const rightLatest = right[0]
      const leftIsCurrentUser = leftLatest?.ownerId === currentUserId
      const rightIsCurrentUser = rightLatest?.ownerId === currentUserId

      if (leftIsCurrentUser && !rightIsCurrentUser) return -1
      if (rightIsCurrentUser && !leftIsCurrentUser) return 1

      return (rightLatest?.id ?? 0) - (leftLatest?.id ?? 0)
    })
    .flat()

const requestUserStorySequences = async (
  client: ReturnType<typeof createBackendApiClient>,
  currentUserId: number,
  resolveMediaUrl: (value: unknown) => string,
  input: {
    limit?: number
    offset?: number
  } = {},
) => {
  const response = assertBackendApiSuccess(
    await client.post<BackendUserStoriesResponse, Record<string, unknown>>(
      "get-user-stories",
      {
        limit: input.limit ?? 50,
        offset: input.offset,
      },
    ),
    "Unable to load stories.",
  )

  return extractUserStorySequences(response, currentUserId, resolveMediaUrl)
}

const requestOwnStories = async (
  client: ReturnType<typeof createBackendApiClient>,
  currentUserId: number,
  resolveMediaUrl: (value: unknown) => string,
) => {
  if (currentUserId <= 0) {
    return []
  }

  const sequences = await requestUserStorySequences(client, currentUserId, resolveMediaUrl, {
    limit: 50,
    offset: currentUserId + 1,
  })

  return sequences.find(stories => stories[0]?.ownerId === currentUserId) ?? []
}

const requestLatestOwnStory = async (
  client: ReturnType<typeof createBackendApiClient>,
  currentUserId: number,
  resolveMediaUrl: (value: unknown) => string,
) => {
  const stories = await requestOwnStories(client, currentUserId, resolveMediaUrl)
  return stories[0] ?? null
}

export async function fetchLatestOwnStory(event: H3Event, currentUserId?: number) {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const resolvedCurrentUserId = currentUserId
    ?? asNumber((await getBackendCurrentUser(event)).user_id)

  return await requestLatestOwnStory(client, resolvedCurrentUserId, resolveMediaUrl)
}

const mapAnnouncement = (entity: BackendEntity | undefined): FeedAnnouncement | null => {
  if (!entity) {
    return null
  }

  const title = firstString(entity, ["title", "name"])
  const message = stripHtml(firstString(entity, ["text", "description", "message"]))

  if (!title && !message) {
    return null
  }

  return {
    title,
    message,
  }
}

const resolveGreetingPeriod = (): FeedGreeting["period"] => {
  const hour = new Date().getHours()

  if (hour < 12) {
    return "morning"
  }

  if (hour <= 18) {
    return "afternoon"
  }

  return "evening"
}

const mapHomeGreeting = (
  currentUser: BackendEntity,
  event: H3Event,
): FeedGreeting | null => {
  const period = resolveGreetingPeriod()
  const copy = legacyGreetingCopy[period]
  const displayName = firstString(currentUser, ["first_name", "name", "username"])

  if (!displayName) {
    return null
  }

  const runtimeConfig = useRuntimeConfig(event)
  const webBase = String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase || "").replace(/\/+$/, "")

  return {
    period,
    title: `${copy.label}, ${displayName}`,
    message: copy.quote,
    accent: copy.accent,
    imageUrl: webBase ? `${webBase}/themes/wowonder/img/${copy.image}` : `/themes/wowonder/img/${copy.image}`,
  }
}

const extractTrendingHashtags = (value: unknown) => {
  const chips: FeedHashtagChip[] = []
  const accumulator = new Map<string, FeedHashtagChip>()
  const rawItems = Array.isArray(value)
    ? value
    : asArray(asRecord(value).data)

  rawItems.forEach((item, index) => {
    const label = firstString(item, ["tag", "hashtag", "name", "title"])
    const slug = normalizeHashtagValue(label)

    if (!slug) {
      return
    }

    const existing = accumulator.get(slug)
    if (existing) {
      existing.count += 1
      return
    }

    accumulator.set(slug, {
      label: label.replace(/^#/, ""),
      slug,
      count: firstNumber(item, ["trend", "count", "total"]) || Math.max(1, rawItems.length - index),
      to: formatHashtagPath(label),
    })
  })

  accumulator.forEach(item => chips.push(item))

  return chips.sort((left, right) => right.count - left.count)
}

const mapExploreUser = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
): FeedExploreUserRecord => {
  const id = firstNumber(entity, ["user_id", "id"])
  const name = firstString(entity, ["name", "username"]) || `User ${id}`
  const username = firstString(entity, ["username"]) || `user-${id}`
  const role = firstString(entity, ["working", "school", "address"]) || `@${username}`
  const tags = extractTags(entity)

  return {
    id,
    name,
    username,
    initials: createInitials(name, "US"),
    href: `/@${username}`,
    role,
    meta: firstString(entity, ["about", "lastseen_time_text", "gender_text"]) || role,
    reason: stripHtml(firstString(entity, ["about"])) || role,
    tags: tags.slice(0, 4),
    mutualLabel: firstString(entity, ["lastseen_time_text", "gender_text"]) || `@${username}`,
    accent: createAccent(id),
    online: isTruthy(entity.is_online) || asNumber(entity.lastseen) > (Math.floor(Date.now() / 1000) - 120),
    avatarUrl: resolveMediaUrl(firstString(entity, ["avatar", "avatar_full"])),
  }
}

const mapMemoryFriend = (entity: BackendEntity) => {
  const id = firstNumber(entity, ["user_id", "id"])
  const name = firstString(entity, ["name", "username"]) || `User ${id}`

  return {
    id: `friend-${id}`,
    name,
    initials: createInitials(name, "FR"),
    label: firstString(entity, ["time_text", "working", "school"]) || name,
    note: firstString(entity, ["about", "address"]) || firstString(entity, ["working", "school"]) || "",
  }
}

const mapMemoryPost = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
) => {
  const post = mapPostRecord(entity, resolveMediaUrl)
  const timestamp = asNumber(entity.time) * 1000
  const timeLabel = new Date(timestamp).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const text = post.text || post.author

  return {
    id: `memory-${post.id}`,
    post,
    happenedOnLabel: timeLabel,
    memoryLabel: timeLabel,
    yearOffset: Math.max(1, new Date().getFullYear() - new Date(timestamp).getFullYear()),
    reflection: text,
  }
}

const mapPokeRecord = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string = value => asString(value),
): FeedPokeRecord => {
  const user = asRecord(entity.user_data)
  const userId = firstNumber(user, ["user_id", "id"])
  const name = firstString(user, ["name", "username"]) || `User ${userId}`

  return {
    id: `poke-${firstNumber(entity, ["id"])}-${userId}`,
    pokeId: firstNumber(entity, ["id"]),
    userId,
    name,
    initials: createInitials(name, "PK"),
    href: firstString(user, ["username"]) ? `/@${firstString(user, ["username"])}` : "/poke",
    role: firstString(user, ["working", "school", "address"]) || `@${firstString(user, ["username"])}`,
    timeLabel: firstString(entity, ["time_text", "time", "posted", "created_at"]) || "",
    timestamp: firstNumber(entity, ["time", "posted", "created_at"]) || Math.floor(Date.now() / 1000),
    mutualLabel: firstString(user, ["username"]) ? `@${firstString(user, ["username"])}` : name,
    contextLabel: firstString(user, ["working", "school"]) || "",
    note: stripHtml(firstString(user, ["about"])) || firstString(user, ["address"]) || "",
    accent: createAccent(userId),
    online: asNumber(user.lastseen) > (Math.floor(Date.now() / 1000) - 120),
    avatarUrl: resolveMediaUrl(firstString(user, ["avatar", "avatar_full"])),
    isFollowing: isTruthy(user.is_following),
  }
}

const resolveLimit = (event: H3Event, fallback: number, max = 30) => {
  const query = getQuery(event)
  const rawValue = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const parsed = Number(rawValue ?? fallback)
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(Math.floor(parsed), max)
    : fallback
}

const resolveOffset = (event: H3Event) => {
  const query = getQuery(event)
  const rawValue = Array.isArray(query.afterPostId) ? query.afterPostId[0] : query.afterPostId
  const parsed = Number(rawValue ?? 0)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

const buildPostsResponse = (posts: FeedPostRecord[], limit: number): FeedPostsResponse => ({
  posts,
  hasMore: posts.length >= limit,
  nextOffset: posts.at(-1)?.id ?? null,
})

const isProductPostEntity = (entity: BackendEntity) =>
  firstNumber(entity, ["product_id"]) > 0
  || Object.keys(asRecord(entity.product || entity.product_data)).length > 0

const buildHomePostsResponse = (
  rawPosts: BackendEntity[],
  limit: number,
  resolveMediaUrl: (value: unknown) => string,
): FeedPostsResponse => {
  const posts = rawPosts
    .filter(post => !isProductPostEntity(post))
    .map(post => mapPostRecord(post, resolveMediaUrl))
  const lastRawPost = rawPosts.at(-1)

  return {
    posts,
    hasMore: rawPosts.length >= limit,
    nextOffset: lastRawPost
      ? firstNumber(lastRawPost, ["post_id", "id"]) || posts.at(-1)?.id || null
      : null,
  }
}

export async function fetchFeedPosts(
  event: H3Event,
  input: {
    type: "get_news_feed" | "saved" | "hashtag" | "get_random_videos" | "get_page_posts" | "get_event_posts" | "get_group_posts"
    limit?: number
    afterPostId?: number
    postType?: string
    followingOnly?: boolean
    tag?: string
    pageId?: number
    eventId?: number
    groupId?: number
  },
) {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const limit = input.limit ?? 10
  const response = assertBackendApiSuccess(
    await client.post<BackendPostsResponse, Record<string, unknown>>(
      "posts",
      {
        type: input.type,
        limit,
        after_post_id: input.afterPostId ?? 0,
        filter: input.followingOnly ? 1 : 0,
        post_type: input.postType,
        hash: input.tag,
        user_id: currentUser.user_id,
        page_id: input.pageId && input.pageId > 0 ? input.pageId : undefined,
        id: input.pageId && input.pageId > 0 ? input.pageId : undefined,
        ...(input.eventId && input.eventId > 0
          ? { id: input.eventId }
          : {}),
        ...(input.groupId && input.groupId > 0
          ? { id: input.groupId }
          : {}),
      },
    ),
    "Unable to load feed posts.",
  )

  if (input.pageId) {
    console.log(`[fetchFeedPosts] Page ${input.pageId} response:`, {
      type: input.type,
      count: response.data?.length ?? 0,
    })
  }

  return buildPostsResponse((response.data ?? []).map(post => mapPostRecord(post, resolveMediaUrl)), limit)
}

export async function fetchFeedHome(event: H3Event): Promise<FeedHomeResponse> {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const currentUserId = asNumber(currentUser.user_id)
  const limit = resolveLimit(event, 8, 20)
  const afterPostId = resolveOffset(event)
  const query = getQuery(event)
  const postType = Array.isArray(query.postType) ? query.postType[0] : query.postType
  const followingOnly = String(Array.isArray(query.followingOnly) ? query.followingOnly[0] : query.followingOnly || "0") === "1"

  const [postsResponse, storySequences, generalResponse] = await Promise.all([
    client.post<BackendPostsResponse, Record<string, unknown>>(
      "posts",
      {
        type: "get_news_feed",
        limit,
        after_post_id: afterPostId,
        filter: followingOnly ? 1 : 0,
        post_type: asString(postType),
      },
    ),
    requestUserStorySequences(client, currentUserId, resolveMediaUrl),
    client.post<BackendGeneralDataResponse, Record<string, unknown>>(
      "get-general-data",
      {
        fetch: "announcement",
      },
    ),
  ])

  const posts = assertBackendApiSuccess(postsResponse, "Unable to load home feed.")
  const general = assertBackendApiSuccess(generalResponse, "Unable to load announcement.")

  return {
    ...buildHomePostsResponse(posts.data ?? [], limit, resolveMediaUrl),
    stories: flattenStorySequences(storySequences, currentUserId),
    announcement: mapAnnouncement(general.announcement),
    greeting: mapHomeGreeting(currentUser, event),
  }
}

export async function fetchFeedPostById(event: H3Event, postId: number): Promise<FeedPostRecord | null> {
  if (!postId || postId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post id is required.",
    })
  }

  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendSinglePostResponse, Record<string, unknown>>(
      "get-post-data",
      {
        post_id: postId,
        fetch: "post_data,post_comments",
      },
    ),
    "Unable to load post detail.",
  )

  const postEntity = asRecord(response.post_data)

  if (!Object.keys(postEntity).length) {
    return null
  }

  return mapPostRecord(
    {
      ...postEntity,
      get_post_comments: response.post_comments ?? [],
    },
    resolveMediaUrl,
  )
}

export async function fetchFeedPostReactions(
  event: H3Event,
  input: {
    postId: number
    reaction?: string
    limit?: number
    offset?: number
  },
): Promise<FeedPostReactionsResponse> {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const reaction = input.reaction ? feedStoryReactionBackendIds[input.reaction as FeedStoryReactionType] ?? input.reaction : undefined
  const response = assertBackendApiSuccess(
    await client.get<BackendPostReactionsResponse>("post-reactions", {
      post_id: input.postId,
      reaction,
      limit: input.limit,
      offset: input.offset,
    }),
    "Unable to load post reactions.",
  )

  return {
    reactions: asArray(response.reactions)
      .map(mapBackendPostReactionSummary)
      .filter((summary): summary is FeedPostReactionSummary => Boolean(summary)),
    users: asArray(response.users)
      .map(user => mapBackendPostReactionUser(user, resolveMediaUrl))
      .filter((user): user is FeedPostReactionUser => Boolean(user)),
  }
}

export async function fetchExplore(event: H3Event): Promise<FeedExploreResponse> {
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const limit = resolveLimit(event, 15, 20)

  // Use the established helper that is working for Hashtag/Home
  const postsResponse = await fetchFeedPosts(event, {
    type: "get_news_feed",
    limit,
  })

  const client = createBackendApiClient(event)
  const generalResponse = await client.post<BackendGeneralDataResponse, Record<string, unknown>>(
    "get-general-data",
    {
      fetch: "trending_hashtag,announcement",
    },
  )

  const general = assertBackendApiSuccess(generalResponse, "Unable to load explore metadata.")

  return {
    posts: postsResponse.posts,
    users: [],
    pages: [],
    hashtags: extractTrendingHashtags(general.trending_hashtag),
    announcement: mapAnnouncement(general.announcement),
  }
}

export async function fetchMemories(event: H3Event): Promise<FeedMemoriesResponse> {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendMemoriesResponse, Record<string, unknown>>(
      "get_memories",
      {
        type: "all",
      },
    ),
    "Unable to load memories.",
  )

  return {
    posts: asArray(response.data?.posts).map(post => mapMemoryPost(post, resolveMediaUrl)),
    friends: asArray(response.data?.friends).map(mapMemoryFriend),
  }
}

export async function fetchPokes(event: H3Event) {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendPokeResponse, Record<string, unknown>>(
      "poke",
      {
        type: "fetch",
      },
    ),
    "Unable to load poke requests.",
  )

  return (response.data ?? []).map(record => mapPokeRecord(record, resolveMediaUrl))
}

export async function runPokeAction(
  event: H3Event,
  input: {
    action: "create" | "remove"
    userId?: number
    pokeId?: number
  },
): Promise<FeedPokeActionResult> {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendPokeResponse, Record<string, unknown>>(
      "poke",
      input.action === "create"
        ? {
          type: "create",
          user_id: input.userId,
        }
        : {
          type: "remove",
          poke_id: input.pokeId,
        },
    ),
    "Unable to update poke request.",
  )

  return {
    ok: true,
    record: response.data?.[0] ? mapPokeRecord(response.data[0], resolveMediaUrl) : undefined,
  }
}

export async function runPostAction(
  event: H3Event,
  input: {
    action: "like" | "reaction" | "comment" | "save" | "report" | "unsave" | "delete" | "hide" | "votePoll"
    postId: number
    optionId?: number
    reaction?: string
    text?: string
    imageFile?: BackendMultipartFile | null
    gifFile?: BackendMultipartFile | null
    audioFile?: BackendMultipartFile | null
  },
) {
  if (!input.postId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post id is required.",
    })
  }

  if (input.action === "comment") {
    const webClient = createBackendWebClient(event)
    const currentUser = await getBackendCurrentUser(event)
    const sessionHash = asString(currentUser.session_hash)
    const currentUserId = asNumber(currentUser.user_id)

    if (!sessionHash || !currentUserId) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication is required.",
      })
    }

    const mediaFile = input.gifFile ?? input.imageFile ?? null
    let commentImage = ""

    if (mediaFile) {
      const imageBody = new FormData()
      imageBody.append(
        "image",
        new Blob([mediaFile.data], { type: mediaFile.type || "application/octet-stream" }),
        mediaFile.filename || "comment-image",
      )

      const imageResponse = await webClient.postForm<BackendUploadImageResponse, FormData>(
        "upload_image",
        imageBody,
        { id: input.postId },
      )

      if (Number(imageResponse.status ?? 0) !== 200 || !imageResponse.image_src) {
        throw createError({
          statusCode: 400,
          statusMessage: "Unable to upload comment image.",
          data: imageResponse,
        })
      }

      commentImage = asString(imageResponse.image_src)
    }

    const appendCommentFields = (body: FormData | URLSearchParams) => {
      body.append("post_id", String(input.postId))
      body.append("text", input.text ?? "")
      body.append("user_id", String(currentUserId))
      body.append("page_id", "0")
      body.append("comment_image", commentImage)
      body.append("hash_id", sessionHash)
    }
    let commentBody: FormData | URLSearchParams

    if (input.audioFile) {
      const body = new FormData()
      appendCommentFields(body)
      body.append("audio-filename", input.audioFile.filename || "comment-audio.wav")
      body.append(
        "audio-blob",
        new Blob([input.audioFile.data], { type: "application/octet-stream" }),
        input.audioFile.filename || "comment-audio.wav",
      )
      commentBody = body
    }
    else {
      const body = new URLSearchParams()
      appendCommentFields(body)
      commentBody = body
    }

    const commentResponse = await webClient.postForm<BackendRegisterCommentResponse, FormData | URLSearchParams>(
      "posts",
      commentBody,
      {
        s: "register_comment",
        hash: sessionHash,
      },
    )

    if (Number(commentResponse.status ?? 0) !== 200) {
      throw createError({
        statusCode: 400,
        statusMessage: asString(commentResponse.message) || "Unable to post comment.",
        data: commentResponse,
      })
    }

    const commentId = Number(String(commentResponse.html ?? "").match(/comment_(\d+)/)?.[1] ?? 0) || undefined
    const attachmentUrl = input.audioFile
      ? ""
      : commentImage
        ? createBackendMediaUrlResolver(event)(commentImage)
        : ""

    return {
      ok: true,
      commentId,
      commentsCount: asNumber(commentResponse.comments_num),
      attachment: input.audioFile
        ? undefined
        : attachmentUrl
          ? {
            type: input.gifFile ? "gif" as const : "image" as const,
            url: attachmentUrl,
            name: mediaFile?.filename,
          }
          : undefined,
    }
  }

  const client = createBackendApiClient(event)

  if (input.action === "votePoll") {
    if (!input.optionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Poll option id is required.",
      })
    }

    const response = assertBackendApiSuccess(
      await client.post<BackendVotePollResponse, Record<string, unknown>>(
        "vote_up",
        {
          id: input.optionId,
        },
      ),
      "Unable to vote on poll.",
    )

    return {
      ok: true,
      pollOptions: mapPollOptions({
        options: response.votes ?? [],
        voted_id: asNumber(response.voted_id),
      }),
    }
  }

  if (input.action === "hide") {
    assertBackendApiSuccess(
      await client.post<Record<string, unknown>, Record<string, unknown>>(
        "hide_post",
        {
          post_id: input.postId,
        },
      ),
      "Unable to hide post.",
    )

    return {
      ok: true,
    }
  }

  const payload: Record<string, unknown> = {
    action: input.action === "unsave" ? "save" : input.action,
    post_id: input.postId,
    text: input.text,
  }

  if (input.action === "reaction" && input.reaction && isFeedStoryReaction(input.reaction)) {
    payload.reaction = feedStoryReactionBackendIds[input.reaction]
  }

  assertBackendApiSuccess(
    await client.post<Record<string, unknown>, Record<string, unknown>>(
      "post-actions",
      payload,
    ),
    "Unable to update post.",
  )

  return {
    ok: true,
  }
}

export async function fetchCommentReplies(
  event: H3Event,
  input: {
    commentId: number
    limit?: number
    offset?: number
  },
) {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendRecommendedResponse, Record<string, unknown>>(
      "comments",
      {
        type: "fetch_comments_reply",
        comment_id: input.commentId,
        limit: input.limit ?? 20,
        offset: input.offset ?? 0,
      },
    ),
    "Unable to load comment replies.",
  )

  return (response.data ?? []).map(reply => mapCommentRecord(reply, resolveMediaUrl))
}

export async function fetchPostComments(
  event: H3Event,
  input: {
    postId: number
    limit?: number
    offset?: number
  },
) {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendRecommendedResponse, Record<string, unknown>>(
      "comments",
      {
        type: "fetch_comments",
        post_id: input.postId,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      },
    ),
    "Unable to load post comments.",
  )

  return (response.data ?? []).map(comment => mapCommentRecord(comment, resolveMediaUrl))
}

export async function runCommentAction(
  event: H3Event,
  input: {
    action: "reply"
    commentId: number
    text?: string
  } | {
    action: "reaction"
    target: "comment" | "reply"
    targetId: number
    reaction: FeedStoryReactionType
  },
) {
  if (input.action === "reply") {
    if (!input.commentId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Comment id is required.",
      })
    }

    const client = createBackendApiClient(event)
    const resolveMediaUrl = createBackendMediaUrlResolver(event)
    const response = assertBackendApiSuccess(
      await client.post<{
        api_status?: number | string
        data?: BackendEntity
        errors?: { error_text?: string }
      }, Record<string, unknown>>(
        "comments",
        {
          type: "create_reply",
          comment_id: input.commentId,
          text: input.text ?? "",
        },
      ),
      "Unable to reply to comment.",
    )

    return {
      ok: true,
      commentId: firstNumber(asRecord(response.data), ["id", "comment_id"]),
      attachment: undefined,
      reply: response.data ? mapCommentRecord(asRecord(response.data), resolveMediaUrl) : undefined,
    }
  }

  if (input.action === "reaction") {
    if (!input.targetId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Reaction target id is required.",
      })
    }

    const response = assertBackendApiSuccess(
      await createBackendApiClient(event).post<{
        api_status?: number | string
        message?: string
        errors?: { error_text?: string }
      }, Record<string, unknown>>(
        "comments",
        {
          type: input.target === "reply" ? "reaction_reply" : "reaction_comment",
          reaction: isFeedStoryReaction(input.reaction)
            ? feedStoryReactionBackendIds[input.reaction]
            : input.reaction,
          ...(input.target === "reply"
            ? { reply_id: input.targetId }
            : { comment_id: input.targetId }),
        },
      ),
      "Unable to react to comment.",
    )

    return {
      ok: true,
      reaction: input.reaction,
      reactionsCount: response.message?.includes("deleted") ? 0 : undefined,
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Comment action is invalid.",
  })
}
